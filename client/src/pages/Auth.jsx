import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../AppContext.jsx';

export function Login() {
  const { login, notify } = useApp();
  const nav = useNavigate();
  const [f, setF] = useState({ username: '', password: '' });
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    try { await login(f.username, f.password); notify('Welcome back!'); nav('/'); } catch (e2) { setErr(e2.message); }
  };
  return (
    <div className="auth">
      <h1>Sign in</h1>
      <form className="panel" onSubmit={submit}>
        <label>Username or email<input autoFocus value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} /></label>
        <label>Password<input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></label>
        {err && <p className="err-text small">{err}</p>}
        <button className="btn buy full">Sign in</button>
        <p className="muted small">Demo accounts: <code>abhishek</code>, <code>pixelpaz</code>, <code>admin</code> — password <code>password123</code></p>
        <p className="small">New to Vapor? <Link to="/register">Create an account</Link></p>
      </form>
    </div>
  );
}

export function Register() {
  const { register, notify } = useApp();
  const nav = useNavigate();
  const [f, setF] = useState({ username: '', email: '', password: '', display_name: '' });
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    try { await register(f); notify('Account created — welcome to Vapor!'); nav('/account'); } catch (e2) { setErr(e2.message); }
  };
  const field = (k, label, type = 'text') => (
    <label>{label}<input type={type} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></label>
  );
  return (
    <div className="auth">
      <h1>Create your account</h1>
      <form className="panel" onSubmit={submit}>
        {field('username', 'Username (letters, numbers, _)')}
        {field('display_name', 'Display name')}
        {field('email', 'Email', 'email')}
        {field('password', 'Password (6+ characters)', 'password')}
        {err && <p className="err-text small">{err}</p>}
        <button className="btn buy full">Create account</button>
        <p className="small">Already have an account? <Link to="/login">Sign in</Link></p>
      </form>
    </div>
  );
}
