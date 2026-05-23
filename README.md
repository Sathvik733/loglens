# LogLens - Production Log Monitoring Dashboard

LogLens is a full-stack developer tool for collecting, searching, filtering, and monitoring application logs through a production-style dashboard.

## Live Project Goal

This project is designed to be beginner-friendly, resume-ready, GitHub-ready, and deployable on Render.

## Features

- User registration and login
- JWT authentication
- Create monitoring projects
- Generate project API keys
- Send logs through API endpoint
- View logs in dashboard
- Filter logs by severity
- Search logs by keyword
- Application health statistics
- Clear project logs
- PostgreSQL-ready backend
- Render deployment-ready setup

## Tech Stack

### Frontend
- React
- Vite
- Tailwind CSS
- Lucide React Icons

### Backend
- Flask
- Flask SQLAlchemy
- Flask Bcrypt
- PyJWT
- PostgreSQL / SQLite
- Gunicorn

### Deployment
- Render for backend
- Render static site for frontend
- Neon PostgreSQL or Render PostgreSQL

## Folder Structure

```text
loglens/
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   ├── Procfile
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── .env.example
│
└── README.md
```

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/loglens.git
cd loglens
```

## Backend Setup

```bash
cd backend
python -m venv venv
```

### Activate virtual environment

Windows:

```bash
venv\Scripts\activate
```

Mac/Linux:

```bash
source venv/bin/activate
```

### Install dependencies

```bash
pip install -r requirements.txt
```

### Create environment file

Create a `.env` file inside the backend folder:

```env
DATABASE_URL=sqlite:///loglens.db
JWT_SECRET_KEY=your-secret-key
FLASK_ENV=development
```

### Run backend

```bash
python app.py
```

Backend will run on:

```text
http://localhost:5000
```

## Frontend Setup

Open a new terminal:

```bash
cd frontend
npm install
```

Create a `.env` file inside the frontend folder:

```env
VITE_API_URL=http://localhost:5000
```

Run frontend:

```bash
npm run dev
```

Frontend will run on:

```text
http://localhost:5173
```

## Test Log Ingestion API

After creating a project in the dashboard, copy the API key and test this request:

```bash
curl -X POST http://localhost:5000/api/logs/ingest \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_PROJECT_API_KEY" \
  -d '{
    "level": "error",
    "message": "Database connection timeout",
    "source": "payment-service",
    "environment": "production"
  }'
```

## Deploy Backend on Render

1. Push this project to GitHub.
2. Go to Render.
3. Click **New +**.
4. Select **Web Service**.
5. Connect your GitHub repository.
6. Set root directory:

```text
backend
```

7. Set build command:

```bash
pip install -r requirements.txt
```

8. Set start command:

```bash
gunicorn app:app
```

9. Add environment variables:

```env
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET_KEY=your_secure_secret_key
```

10. Deploy.

## Deploy Frontend on Render

1. Click **New +**.
2. Select **Static Site**.
3. Connect same GitHub repository.
4. Set root directory:

```text
frontend
```

5. Set build command:

```bash
npm install && npm run build
```

6. Set publish directory:

```text
dist
```

7. Add environment variable:

```env
VITE_API_URL=https://your-backend-url.onrender.com
```

8. Deploy.

## Git Commands

```bash
git init
git add .
git commit -m "Initial commit - LogLens full stack app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/loglens.git
git push -u origin main
```

## Resume Bullet Points

- Built and deployed a full-stack log monitoring dashboard using React, Flask, PostgreSQL, and REST APIs.
- Implemented JWT authentication, project-based API keys, log ingestion endpoints, filtering, search, and analytics cards.
- Designed a production-style developer tool that allows applications to send logs through API endpoints and monitor system activity from a dashboard.
- Configured environment-based deployment using Render, Gunicorn, and PostgreSQL.

## GitHub Repository Description

A full-stack production log monitoring dashboard built with React, Flask, PostgreSQL, JWT authentication, project API keys, log search, filtering, and analytics.
