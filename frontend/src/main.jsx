import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, AlertTriangle, Bug, KeyRound, LogOut, Plus, Search, Server, ShieldCheck, Trash2 } from 'lucide-react';
import './index.css';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ total: 0, errors: 0, warnings: 0, critical: 0, info: 0 });
  const [projectForm, setProjectForm] = useState({ name: '', description: '' });
  const [levelFilter, setLevelFilter] = useState('');
  const [search, setSearch] = useState('');
  const [sampleLog, setSampleLog] = useState({ level: 'error', message: 'Payment service timeout after 5000ms', source: 'checkout-api', environment: 'production' });
  const [message, setMessage] = useState('');

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    if (token) fetchProjects();
  }, [token]);

  useEffect(() => {
    if (selectedProject) {
      fetchLogs();
      fetchStats();
    }
  }, [selectedProject, levelFilter]);

  async function handleAuth(e) {
    e.preventDefault();
    setMessage('');
    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const body = authMode === 'login' ? { email: authForm.email, password: authForm.password } : authForm;
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) return setMessage(data.error || 'Authentication failed');
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  }

  async function fetchProjects() {
    const res = await fetch(`${API_URL}/api/projects`, { headers: authHeaders });
    const data = await res.json();
    setProjects(data);
    if (data.length && !selectedProject) setSelectedProject(data[0]);
  }

  async function createProject(e) {
    e.preventDefault();
    const res = await fetch(`${API_URL}/api/projects`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(projectForm)
    });
    const data = await res.json();
    if (!res.ok) return setMessage(data.error || 'Could not create project');
    setProjectForm({ name: '', description: '' });
    setSelectedProject(data);
    fetchProjects();
  }

  async function fetchLogs() {
    let url = `${API_URL}/api/projects/${selectedProject.id}/logs?`;
    if (levelFilter) url += `level=${levelFilter}&`;
    if (search) url += `search=${encodeURIComponent(search)}`;
    const res = await fetch(url, { headers: authHeaders });
    const data = await res.json();
    setLogs(data);
  }

  async function fetchStats() {
    const res = await fetch(`${API_URL}/api/projects/${selectedProject.id}/stats`, { headers: authHeaders });
    setStats(await res.json());
  }

  async function sendSampleLog(e) {
    e.preventDefault();
    if (!selectedProject) return;
    const res = await fetch(`${API_URL}/api/logs/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': selectedProject.api_key },
      body: JSON.stringify(sampleLog)
    });
    const data = await res.json();
    if (!res.ok) return setMessage(data.error || 'Could not send log');
    setMessage('Sample log sent successfully');
    fetchLogs();
    fetchStats();
  }

  async function clearLogs() {
    if (!selectedProject) return;
    await fetch(`${API_URL}/api/projects/${selectedProject.id}/logs`, { method: 'DELETE', headers: authHeaders });
    fetchLogs();
    fetchStats();
  }

  function logout() {
    localStorage.clear();
    setToken('');
    setUser(null);
    setSelectedProject(null);
    setProjects([]);
  }

  if (!token) {
    return <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-slate-900 text-white p-3 rounded-2xl"><Activity /></div>
          <div><h1 className="text-3xl font-bold">LogLens</h1><p className="text-slate-500">Production log monitoring dashboard</p></div>
        </div>
        <form onSubmit={handleAuth} className="space-y-4">
          {authMode === 'register' && <input className="w-full border rounded-xl px-4 py-3" placeholder="Name" value={authForm.name} onChange={e => setAuthForm({ ...authForm, name: e.target.value })} />}
          <input className="w-full border rounded-xl px-4 py-3" placeholder="Email" value={authForm.email} onChange={e => setAuthForm({ ...authForm, email: e.target.value })} />
          <input className="w-full border rounded-xl px-4 py-3" type="password" placeholder="Password" value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })} />
          {message && <p className="text-sm text-red-600">{message}</p>}
          <button className="w-full bg-slate-900 text-white rounded-xl py-3 font-semibold">{authMode === 'login' ? 'Login' : 'Create Account'}</button>
        </form>
        <button className="mt-4 text-sm text-slate-600" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
          {authMode === 'login' ? 'Need an account? Register' : 'Already have an account? Login'}
        </button>
      </div>
    </div>;
  }

  return <div className="min-h-screen">
    <header className="bg-white border-b px-6 py-4 flex justify-between items-center">
      <div className="flex items-center gap-3"><Activity className="text-slate-900" /><div><h1 className="text-2xl font-bold">LogLens</h1><p className="text-sm text-slate-500">Welcome, {user?.name}</p></div></div>
      <button onClick={logout} className="flex gap-2 items-center bg-slate-100 px-4 py-2 rounded-xl"><LogOut size={18}/> Logout</button>
    </header>

    <main className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-6">
      <aside className="lg:col-span-1 space-y-6">
        <section className="bg-white rounded-3xl p-5 shadow-sm border">
          <h2 className="font-bold text-lg mb-4 flex gap-2"><Plus /> New Project</h2>
          <form onSubmit={createProject} className="space-y-3">
            <input className="w-full border rounded-xl px-3 py-2" placeholder="Project name" value={projectForm.name} onChange={e => setProjectForm({ ...projectForm, name: e.target.value })} />
            <textarea className="w-full border rounded-xl px-3 py-2" placeholder="Description" value={projectForm.description} onChange={e => setProjectForm({ ...projectForm, description: e.target.value })} />
            <button className="w-full bg-slate-900 text-white rounded-xl py-2">Create</button>
          </form>
        </section>

        <section className="bg-white rounded-3xl p-5 shadow-sm border">
          <h2 className="font-bold text-lg mb-4 flex gap-2"><Server /> Projects</h2>
          <div className="space-y-2">
            {projects.map(project => <button key={project.id} onClick={() => setSelectedProject(project)} className={`w-full text-left p-3 rounded-xl border ${selectedProject?.id === project.id ? 'bg-slate-900 text-white' : 'bg-white'}`}>
              <p className="font-semibold">{project.name}</p><p className="text-xs opacity-70">{project.description || 'No description'}</p>
            </button>)}
          </div>
        </section>
      </aside>

      <section className="lg:col-span-3 space-y-6">
        {!selectedProject ? <div className="bg-white rounded-3xl p-10 text-center border"><h2 className="text-xl font-bold">Create your first project</h2></div> : <>
          <div className="bg-white rounded-3xl p-6 shadow-sm border">
            <h2 className="text-2xl font-bold">{selectedProject.name}</h2>
            <p className="text-slate-500 mb-4">{selectedProject.description}</p>
            <div className="bg-slate-100 rounded-2xl p-4 overflow-auto">
              <p className="text-sm font-semibold flex gap-2"><KeyRound size={18}/> API Key</p>
              <code className="text-sm break-all">{selectedProject.api_key}</code>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Stat icon={<Activity/>} label="Total" value={stats.total} />
            <Stat icon={<Bug/>} label="Errors" value={stats.errors} />
            <Stat icon={<AlertTriangle/>} label="Warnings" value={stats.warnings} />
            <Stat icon={<ShieldCheck/>} label="Critical" value={stats.critical} />
            <Stat icon={<Server/>} label="Info" value={stats.info} />
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border">
            <h3 className="font-bold text-lg mb-4">Send Sample Log</h3>
            <form onSubmit={sendSampleLog} className="grid md:grid-cols-4 gap-3">
              <select className="border rounded-xl px-3 py-2" value={sampleLog.level} onChange={e => setSampleLog({ ...sampleLog, level: e.target.value })}>
                {['debug','info','warning','error','critical'].map(l => <option key={l}>{l}</option>)}
              </select>
              <input className="border rounded-xl px-3 py-2" value={sampleLog.source} onChange={e => setSampleLog({ ...sampleLog, source: e.target.value })} />
              <input className="border rounded-xl px-3 py-2" value={sampleLog.environment} onChange={e => setSampleLog({ ...sampleLog, environment: e.target.value })} />
              <button className="bg-slate-900 text-white rounded-xl py-2">Send</button>
              <input className="md:col-span-4 border rounded-xl px-3 py-2" value={sampleLog.message} onChange={e => setSampleLog({ ...sampleLog, message: e.target.value })} />
            </form>
            {message && <p className="text-sm mt-3 text-slate-600">{message}</p>}
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border">
            <div className="flex flex-col md:flex-row gap-3 justify-between mb-4">
              <h3 className="font-bold text-lg">Logs</h3>
              <div className="flex gap-2">
                <select className="border rounded-xl px-3 py-2" value={levelFilter} onChange={e => setLevelFilter(e.target.value)}>
                  <option value="">All Levels</option>{['debug','info','warning','error','critical'].map(l => <option key={l}>{l}</option>)}
                </select>
                <div className="flex border rounded-xl items-center px-3"><Search size={18}/><input className="px-2 py-2 outline-none" placeholder="Search" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchLogs()} /></div>
                <button onClick={fetchLogs} className="bg-slate-900 text-white px-4 rounded-xl">Search</button>
                <button onClick={clearLogs} className="bg-red-50 text-red-600 px-3 rounded-xl"><Trash2 size={18}/></button>
              </div>
            </div>
            <div className="space-y-3">
              {logs.map(log => <div key={log.id} className="border rounded-2xl p-4">
                <div className="flex justify-between gap-3"><span className="font-bold uppercase text-xs bg-slate-100 px-2 py-1 rounded-lg">{log.level}</span><span className="text-xs text-slate-500">{new Date(log.created_at).toLocaleString()}</span></div>
                <p className="font-medium mt-2">{log.message}</p><p className="text-sm text-slate-500">{log.source} · {log.environment}</p>
              </div>)}
              {!logs.length && <p className="text-center text-slate-500 py-8">No logs found.</p>}
            </div>
          </div>
        </>}
      </section>
    </main>
  </div>;
}

function Stat({ icon, label, value }) {
  return <div className="bg-white border rounded-3xl p-5 shadow-sm"><div className="text-slate-500 mb-3">{icon}</div><p className="text-3xl font-bold">{value}</p><p className="text-sm text-slate-500">{label}</p></div>;
}

createRoot(document.getElementById('root')).render(<App />);
