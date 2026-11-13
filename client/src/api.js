// Tiny fetch wrapper for the Vapor REST API.
const TOKEN_KEY = 'vapor_token';

export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};
export const setToken = (t) => {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
};

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b) => request('POST', p, b ?? {}),
  put: (p, b) => request('PUT', p, b ?? {}),
  patch: (p, b) => request('PATCH', p, b ?? {}),
  del: (p) => request('DELETE', p),
};

export const money = (n) => `$${Number(n ?? 0).toFixed(2)}`;
export const hours = (min) => `${(Number(min || 0) / 60).toFixed(1)} hrs`;
export const fmtDate = (d) =>
  d ? new Date(d.length === 10 ? d + 'T00:00:00' : d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
