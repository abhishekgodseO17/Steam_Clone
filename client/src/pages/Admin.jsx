import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fmtDate, money } from '../api.js';
import { useApp } from '../AppContext.jsx';
import { Loading } from '../components/ui.jsx';

const TABS = ['Dashboard', 'Games', 'Developers', 'Publishers', 'Genres', 'Platforms', 'Users'];

export default function Admin() {
  const [tab, setTab] = useState('Dashboard');
  return (
    <div className="admin">
      <h1 className="page-title">Store Administration</h1>
      <div className="tabs">
        {TABS.map((t) => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}
      </div>
      {tab === 'Dashboard' && <Dashboard />}
      {tab === 'Games' && <GamesAdmin />}
      {tab === 'Developers' && (
        <SimpleCrud resource="developers" pk="developer_id" link="/developer"
          fields={[['name', 'Name'], ['country', 'Country'], ['founded_year', 'Founded', 'number'], ['website', 'Website']]} />
      )}
      {tab === 'Publishers' && (
        <SimpleCrud resource="publishers" pk="publisher_id" link="/publisher"
          fields={[['name', 'Name'], ['country', 'Country'], ['website', 'Website']]} />
      )}
      {tab === 'Genres' && <SimpleCrud resource="genres" pk="genre_id" fields={[['name', 'Name']]} />}
      {tab === 'Platforms' && <SimpleCrud resource="platforms" pk="platform_id" fields={[['name', 'Name']]} />}
      {tab === 'Users' && <UsersAdmin />}
    </div>
  );
}

/* -------------------- Dashboard (aggregate SQL queries) -------------------- */
function Dashboard() {
  const [s, setS] = useState(null);
  useEffect(() => { api.get('/admin/stats').then(setS); }, []);
  if (!s) return <Loading />;
  const max = Math.max(...s.by_genre.map((g) => g.revenue), 1);
  return (
    <div>
      <div className="kpis">
        <div><span>Revenue</span><strong>{money(s.totals.revenue)}</strong></div>
        <div><span>Orders</span><strong>{s.totals.orders}</strong></div>
        <div><span>Users</span><strong>{s.totals.users}</strong></div>
        <div><span>Games</span><strong>{s.totals.games}</strong></div>
        <div><span>Reviews</span><strong>{s.totals.reviews}</strong></div>
      </div>
      <div className="dash-grid">
        <div className="panel">
          <h4>Top sellers by revenue</h4>
          <table className="table compact">
            <thead><tr><th>Game</th><th>Copies</th><th>Revenue</th></tr></thead>
            <tbody>{s.top_games.map((g) => <tr key={g.game_id}><td><Link to={`/game/${g.game_id}`}>{g.title}</Link></td><td>{g.copies_sold}</td><td>{money(g.revenue)}</td></tr>)}</tbody>
          </table>
        </div>
        <div className="panel">
          <h4>Revenue by genre</h4>
          {s.by_genre.filter((g) => g.revenue > 0).map((g) => (
            <div key={g.genre} className="hbar">
              <span className="hbar-label">{g.genre}</span>
              <span className="hbar-track"><span style={{ width: `${(100 * g.revenue) / max}%` }} /></span>
              <span className="hbar-val">{money(g.revenue)}</span>
            </div>
          ))}
        </div>
        <div className="panel span2">
          <h4>Recent orders</h4>
          <table className="table compact">
            <thead><tr><th>#</th><th>User</th><th>Date</th><th>Status</th><th>Total</th></tr></thead>
            <tbody>{s.recent_orders.map((o) => <tr key={o.order_id}><td>{o.order_id}</td><td>{o.username}</td><td>{fmtDate(o.created_at)}</td><td className="cap">{o.status}</td><td>{money(o.total_amount)}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* -------------------- Generic CRUD table for lookup tables -------------------- */
function SimpleCrud({ resource, pk, fields, link }) {
  const { notify } = useApp();
  const blank = Object.fromEntries(fields.map(([k]) => [k, '']));
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState(null);

  const load = () => api.get(`/${resource}`).then(setRows);
  useEffect(() => { load(); setForm(blank); setEditId(null); }, [resource]); // eslint-disable-line

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editId) await api.put(`/${resource}/${editId}`, form);
      else await api.post(`/${resource}`, form);
      notify(editId ? 'Saved' : 'Created');
      setForm(blank); setEditId(null); load();
    } catch (err) { notify(err.message, 'err'); }
  };
  const remove = async (row) => {
    try { await api.del(`/${resource}/${row[pk]}`); notify('Deleted'); load(); } catch (err) { notify(err.message, 'err'); }
  };

  if (!rows) return <Loading />;
  return (
    <div className="crud">
      <form className="panel crud-form" onSubmit={submit}>
        <h4>{editId ? `Edit #${editId}` : `Add ${resource.slice(0, -1)}`}</h4>
        {fields.map(([k, label, type]) => (
          <label key={k}>{label}<input type={type || 'text'} value={form[k] ?? ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></label>
        ))}
        <div className="row-actions">
          <button className="btn">{editId ? 'Save' : 'Create'}</button>
          {editId && <button type="button" className="btn ghost" onClick={() => { setForm(blank); setEditId(null); }}>Cancel</button>}
        </div>
      </form>
      <table className="table">
        <thead><tr><th>ID</th>{fields.map(([k, l]) => <th key={k}>{l}</th>)}<th>Games</th><th /></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[pk]}>
              <td>{r[pk]}</td>
              {fields.map(([k], i) => <td key={k}>{i === 0 && link ? <Link to={`${link}/${r[pk]}`}>{r[k]}</Link> : r[k] ?? '—'}</td>)}
              <td>{r.game_count}</td>
              <td className="nowrap">
                <button className="linkbtn small" onClick={() => { setEditId(r[pk]); setForm(Object.fromEntries(fields.map(([k]) => [k, r[k] ?? '']))); }}>Edit</button>
                <button className="linkbtn small danger" onClick={() => remove(r)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------- Games (with M:N genres/platforms + achievements) -------------------- */
const BLANK_GAME = {
  title: '', short_description: '', description: '', price: '', discount_percent: 0, release_date: '',
  age_rating: '', developer_id: '', publisher_id: '', cover_color: '#2a475e', is_published: true, genre_ids: [], platform_ids: [1],
};

function GamesAdmin() {
  const { notify } = useApp();
  const [games, setGames] = useState(null);
  const [lookups, setLookups] = useState({ developers: [], publishers: [], genres: [], platforms: [] });
  const [form, setForm] = useState(BLANK_GAME);
  const [editId, setEditId] = useState(null);
  const [achs, setAchs] = useState([]);
  const [newAch, setNewAch] = useState({ name: '', description: '' });

  const load = () => api.get('/games?sort=name&include_unpublished=1').then(setGames);
  useEffect(() => {
    load();
    Promise.all(['developers', 'publishers', 'genres', 'platforms'].map((r) => api.get(`/${r}`)))
      .then(([developers, publishers, genres, platforms]) => setLookups({ developers, publishers, genres, platforms }));
  }, []);

  const startEdit = async (id) => {
    const g = await api.get(`/games/${id}/edit`);
    setForm({ ...BLANK_GAME, ...Object.fromEntries(Object.entries(g).map(([k, v]) => [k, v ?? ''])) });
    setEditId(id);
    setAchs((await api.get(`/games/${id}`)).achievements);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const reset = () => { setForm(BLANK_GAME); setEditId(null); setAchs([]); };

  const submit = async (e) => {
    e.preventDefault();
    const body = { ...form, price: Number(form.price), discount_percent: Number(form.discount_percent) };
    for (const k of ['developer_id', 'publisher_id']) body[k] = body[k] === '' ? null : Number(body[k]);
    for (const k of ['release_date', 'age_rating']) if (body[k] === '') body[k] = null;
    try {
      if (editId) await api.put(`/games/${editId}`, body); else await api.post('/games', body);
      notify(editId ? 'Game updated' : 'Game created');
      reset(); load();
    } catch (err) { notify(err.message, 'err'); }
  };
  const remove = async (g) => {
    try {
      const r = await api.del(`/games/${g.game_id}`);
      notify(r?.message || 'Game deleted'); load();
    } catch (err) { notify(err.message, 'err'); }
  };
  const toggle = (key, id) => setForm((f) => ({ ...f, [key]: f[key].includes(id) ? f[key].filter((x) => x !== id) : [...f[key], id] }));
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const addAch = async (e) => {
    e.preventDefault();
    try { await api.post(`/games/${editId}/achievements`, newAch); setNewAch({ name: '', description: '' }); setAchs((await api.get(`/games/${editId}`)).achievements); }
    catch (err) { notify(err.message, 'err'); }
  };
  const delAch = async (a) => { await api.del(`/achievements/${a.achievement_id}`); setAchs((await api.get(`/games/${editId}`)).achievements); };

  if (!games) return <Loading />;
  return (
    <div>
      <form className="panel game-form" onSubmit={submit}>
        <h4>{editId ? `Edit game #${editId}` : 'Add a new game'}</h4>
        <div className="form-grid">
          <label className="span2">Title<input required value={form.title} onChange={set('title')} /></label>
          <label className="span2">Short description<input required maxLength={300} value={form.short_description} onChange={set('short_description')} /></label>
          <label className="span2">Description<textarea rows={3} value={form.description} onChange={set('description')} /></label>
          <label>Price ($)<input required type="number" step="0.01" min="0" value={form.price} onChange={set('price')} /></label>
          <label>Discount (%)<input type="number" min="0" max="100" value={form.discount_percent} onChange={set('discount_percent')} /></label>
          <label>Release date<input type="date" value={form.release_date} onChange={set('release_date')} /></label>
          <label>Age rating
            <select value={form.age_rating} onChange={set('age_rating')}>
              <option value="">—</option>{['E', 'E10+', 'T', 'M', 'AO', 'RP'].map((r) => <option key={r}>{r}</option>)}
            </select>
          </label>
          <label>Developer
            <select value={form.developer_id} onChange={set('developer_id')}>
              <option value="">—</option>{lookups.developers.map((d) => <option key={d.developer_id} value={d.developer_id}>{d.name}</option>)}
            </select>
          </label>
          <label>Publisher
            <select value={form.publisher_id} onChange={set('publisher_id')}>
              <option value="">—</option>{lookups.publishers.map((d) => <option key={d.publisher_id} value={d.publisher_id}>{d.name}</option>)}
            </select>
          </label>
          <label>Cover color<input type="color" value={form.cover_color} onChange={set('cover_color')} /></label>
          <label className="check"><input type="checkbox" checked={!!form.is_published} onChange={set('is_published')} /> Published in store</label>
          <div className="span2">
            <div className="small muted">Genres</div>
            <div className="genre-list">{lookups.genres.map((g) => (
              <button type="button" key={g.genre_id} className={`chip ${form.genre_ids.includes(g.genre_id) ? 'on' : ''}`} onClick={() => toggle('genre_ids', g.genre_id)}>{g.name}</button>
            ))}</div>
          </div>
          <div className="span2">
            <div className="small muted">Platforms</div>
            <div className="genre-list">{lookups.platforms.map((p) => (
              <button type="button" key={p.platform_id} className={`chip ${form.platform_ids.includes(p.platform_id) ? 'on' : ''}`} onClick={() => toggle('platform_ids', p.platform_id)}>{p.name}</button>
            ))}</div>
          </div>
        </div>
        <div className="row-actions">
          <button className="btn">{editId ? 'Save game' : 'Create game'}</button>
          {editId && <button type="button" className="btn ghost" onClick={reset}>Cancel</button>}
        </div>

        {editId && (
          <div className="ach-admin">
            <h4>Achievements</h4>
            {achs.map((a) => (
              <div key={a.achievement_id} className="friend"><span className="grow"><strong>{a.name}</strong> <span className="muted small">— {a.description}</span></span>
                <button type="button" className="linkbtn small danger" onClick={() => delAch(a)}>Delete</button></div>
            ))}
            <div className="inline-form">
              <input placeholder="Name" value={newAch.name} onChange={(e) => setNewAch({ ...newAch, name: e.target.value })} />
              <input placeholder="Description" value={newAch.description} onChange={(e) => setNewAch({ ...newAch, description: e.target.value })} />
              <button type="button" className="btn" onClick={addAch}>Add</button>
            </div>
          </div>
        )}
      </form>

      <table className="table">
        <thead><tr><th>ID</th><th>Title</th><th>Developer</th><th>Price</th><th>Sale</th><th>Owners</th><th>Status</th><th /></tr></thead>
        <tbody>
          {games.map((g) => (
            <tr key={g.game_id}>
              <td>{g.game_id}</td>
              <td><Link to={`/game/${g.game_id}`}>{g.title}</Link></td>
              <td>{g.developer || '—'}</td>
              <td>{money(g.price)}</td>
              <td>{g.discount_percent ? `-${g.discount_percent}%` : '—'}</td>
              <td>{g.owner_count}</td>
              <td>{g.is_published ? <span className="pill ok">Live</span> : <span className="pill">Hidden</span>}</td>
              <td className="nowrap">
                <button className="linkbtn small" onClick={() => startEdit(g.game_id)}>Edit</button>
                <button className="linkbtn small danger" onClick={() => remove(g)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------- Users -------------------- */
function UsersAdmin() {
  const { user, notify } = useApp();
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  const load = () => api.get(`/users?q=${encodeURIComponent(q)}`).then(setRows);
  useEffect(() => { load(); }, [q]); // eslint-disable-line
  const remove = async (u) => {
    try { await api.del(`/users/${u.user_id}`); notify(`Deleted ${u.username}`); load(); } catch (e) { notify(e.message, 'err'); }
  };
  if (!rows) return <Loading />;
  return (
    <div>
      <input className="search-small" placeholder="Search users" value={q} onChange={(e) => setQ(e.target.value)} />
      <table className="table">
        <thead><tr><th>ID</th><th>Username</th><th>Display name</th><th>Country</th><th>Games</th><th>Joined</th><th>Role</th><th /></tr></thead>
        <tbody>
          {rows.map((u) => (
            <tr key={u.user_id}>
              <td>{u.user_id}</td>
              <td><Link to={`/profile/${u.user_id}`}>{u.username}</Link></td>
              <td>{u.display_name}</td>
              <td>{u.country || '—'}</td>
              <td>{u.games_owned}</td>
              <td>{fmtDate(u.created_at)}</td>
              <td>{u.is_admin ? <span className="pill ok">Admin</span> : 'User'}</td>
              <td>{u.user_id !== user.user_id && <button className="linkbtn small danger" onClick={() => remove(u)}>Delete</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
