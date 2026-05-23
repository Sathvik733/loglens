import os
from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy

load_dotenv()

app = Flask(__name__)
CORS(app)

raw_database_url = os.getenv("DATABASE_URL", "sqlite:///loglens.db")
if raw_database_url.startswith("postgres://"):
    raw_database_url = raw_database_url.replace("postgres://", "postgresql://", 1)

app.config["SQLALCHEMY_DATABASE_URI"] = raw_database_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "dev-secret-key")

bcrypt = Bcrypt(app)
db = SQLAlchemy(app)


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(180), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    projects = db.relationship("Project", backref="owner", cascade="all, delete-orphan")


class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(160), nullable=False)
    description = db.Column(db.Text, default="")
    api_key = db.Column(db.String(80), unique=True, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    logs = db.relationship("Log", backref="project", cascade="all, delete-orphan")


class Log(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    level = db.Column(db.String(20), nullable=False, default="info")
    message = db.Column(db.Text, nullable=False)
    source = db.Column(db.String(120), default="application")
    environment = db.Column(db.String(80), default="development")
    metadata = db.Column(db.Text, default="")
    project_id = db.Column(db.Integer, db.ForeignKey("project.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


def create_token(user_id):
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, app.config["JWT_SECRET_KEY"], algorithm="HS256")


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid authorization header"}), 401
        token = auth_header.split(" ", 1)[1]
        try:
            data = jwt.decode(token, app.config["JWT_SECRET_KEY"], algorithms=["HS256"])
            current_user = User.query.get(data["user_id"])
            if not current_user:
                return jsonify({"error": "User not found"}), 401
        except Exception:
            return jsonify({"error": "Invalid or expired token"}), 401
        return f(current_user, *args, **kwargs)

    return decorated


def project_to_dict(project):
    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "api_key": project.api_key,
        "created_at": project.created_at.isoformat(),
    }


def log_to_dict(log):
    return {
        "id": log.id,
        "level": log.level,
        "message": log.message,
        "source": log.source,
        "environment": log.environment,
        "metadata": log.metadata,
        "project_id": log.project_id,
        "created_at": log.created_at.isoformat(),
    }


@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "LogLens API is running"})


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy"})


@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not name or not email or not password:
        return jsonify({"error": "Name, email, and password are required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 409

    user = User(
        name=name,
        email=email,
        password_hash=bcrypt.generate_password_hash(password).decode("utf-8"),
    )
    db.session.add(user)
    db.session.commit()

    return jsonify({"token": create_token(user.id), "user": {"id": user.id, "name": user.name, "email": user.email}}), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    user = User.query.filter_by(email=email).first()
    if not user or not bcrypt.check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid email or password"}), 401

    return jsonify({"token": create_token(user.id), "user": {"id": user.id, "name": user.name, "email": user.email}})


@app.route("/api/projects", methods=["GET"])
@token_required
def list_projects(current_user):
    projects = Project.query.filter_by(user_id=current_user.id).order_by(Project.created_at.desc()).all()
    return jsonify([project_to_dict(p) for p in projects])


@app.route("/api/projects", methods=["POST"])
@token_required
def create_project(current_user):
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    description = data.get("description", "").strip()

    if not name:
        return jsonify({"error": "Project name is required"}), 400

    api_key = f"ll_{os.urandom(24).hex()}"
    project = Project(name=name, description=description, api_key=api_key, user_id=current_user.id)
    db.session.add(project)
    db.session.commit()

    return jsonify(project_to_dict(project)), 201


@app.route("/api/projects/<int:project_id>", methods=["DELETE"])
@token_required
def delete_project(current_user, project_id):
    project = Project.query.filter_by(id=project_id, user_id=current_user.id).first()
    if not project:
        return jsonify({"error": "Project not found"}), 404
    db.session.delete(project)
    db.session.commit()
    return jsonify({"message": "Project deleted"})


@app.route("/api/logs/ingest", methods=["POST"])
def ingest_log():
    api_key = request.headers.get("X-API-Key")
    project = Project.query.filter_by(api_key=api_key).first()
    if not project:
        return jsonify({"error": "Invalid API key"}), 401

    data = request.get_json() or {}
    message = data.get("message", "").strip()
    level = data.get("level", "info").lower().strip()

    if level not in ["debug", "info", "warning", "error", "critical"]:
        return jsonify({"error": "Invalid log level"}), 400
    if not message:
        return jsonify({"error": "Message is required"}), 400

    log = Log(
        level=level,
        message=message,
        source=data.get("source", "application"),
        environment=data.get("environment", "development"),
        metadata=str(data.get("metadata", "")),
        project_id=project.id,
    )
    db.session.add(log)
    db.session.commit()
    return jsonify({"message": "Log received", "log": log_to_dict(log)}), 201


@app.route("/api/projects/<int:project_id>/logs", methods=["GET"])
@token_required
def get_logs(current_user, project_id):
    project = Project.query.filter_by(id=project_id, user_id=current_user.id).first()
    if not project:
        return jsonify({"error": "Project not found"}), 404

    level = request.args.get("level", "").lower()
    search = request.args.get("search", "")

    query = Log.query.filter_by(project_id=project.id)
    if level:
        query = query.filter(Log.level == level)
    if search:
        query = query.filter(Log.message.ilike(f"%{search}%"))

    logs = query.order_by(Log.created_at.desc()).limit(200).all()
    return jsonify([log_to_dict(log) for log in logs])


@app.route("/api/projects/<int:project_id>/stats", methods=["GET"])
@token_required
def get_stats(current_user, project_id):
    project = Project.query.filter_by(id=project_id, user_id=current_user.id).first()
    if not project:
        return jsonify({"error": "Project not found"}), 404

    total = Log.query.filter_by(project_id=project.id).count()
    errors = Log.query.filter_by(project_id=project.id, level="error").count()
    warnings = Log.query.filter_by(project_id=project.id, level="warning").count()
    critical = Log.query.filter_by(project_id=project.id, level="critical").count()
    info = Log.query.filter_by(project_id=project.id, level="info").count()

    return jsonify({"total": total, "errors": errors, "warnings": warnings, "critical": critical, "info": info})


@app.route("/api/projects/<int:project_id>/logs", methods=["DELETE"])
@token_required
def clear_logs(current_user, project_id):
    project = Project.query.filter_by(id=project_id, user_id=current_user.id).first()
    if not project:
        return jsonify({"error": "Project not found"}), 404
    Log.query.filter_by(project_id=project.id).delete()
    db.session.commit()
    return jsonify({"message": "Logs cleared"})


with app.app_context():
    db.create_all()


if __name__ == "__main__":
    app.run(debug=True)
