import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money } from '../api.js';
import { useApp } from '../AppContext.jsx';

export default function Account() {
  const { user, refreshUser, notify } = useApp();
  const [form, setForm] = useState({ display_name: user.display_name, email: user.email, country: user.country || '', bio: user.bio || '' });
  const [friends, setFriends] = useState([]);
  const [friendName, setFriendName] = useState('');

  const loadFriends = () => api.get('/friends').then(setFriends);
  useEffect(() => { loadFriends(); }, []);

  const run = async (fn, msg) => {
    try { await fn(); if (msg) notify(msg); await refreshUser(); await loadFriends(); } catch (e) { notify(e.message, 'err'); }
  };

  const save = (e) => { e.preventDefault(); run(() => api.put('/users/me', form), 'Profile saved'); };
  const addFunds = (amount) => run(() => api.post('/users/me/wallet', { amount }), `Added ${money(amount)} to your wallet`);
  const sendRequest = (e) => {
    e.preventDefault();
    run(async () => { await api.post('/friends', { username: friendName.trim() }); setFriendName(''); }, 'Friend request sent');
  };

  const groups = { incoming: 'Friend requests', friend: 'Friends', outgoing: 'Sent requests' };

  return (
    <div className="narrow account">
      <h1 className="page-title">Account details: {user.username}</h1>
      <div className="account-grid">
        <form className="panel" onSubmit={save}>
          <h4>Profile</h4>
          <label>Display name<input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} /></label>
          <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label>Country (2-letter code)<input maxLength={2} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value.toUpperCase() })} /></label>
          <label>Bio<textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></label>
          <div className="row-actions">
            <button className="btn">Save changes</button>
            <Link to={`/profile/${user.user_id}`} className="linkbtn">View public profile</Link>
          </div>
        </form>

        <div>
          <div className="panel wallet-panel">
            <h4>Vapor Wallet</h4>
            <div className="wallet-big">{money(user.wallet_balance)}</div>
            <div className="row-actions">
              {[5, 10, 25, 50].map((a) => <button key={a} className="btn ghost" onClick={() => addFunds(a)}>+ {money(a)}</button>)}
            </div>
            <p className="muted small">Demo funds — no real payment.</p>
          </div>

          <div className="panel">
            <h4>Friends</h4>
            <form onSubmit={sendRequest} className="inline-form">
              <input placeholder="Add friend by username" value={friendName} onChange={(e) => setFriendName(e.target.value)} />
              <button className="btn" disabled={!friendName.trim()}>Send</button>
            </form>
            {Object.entries(groups).map(([rel, label]) => {
              const list = friends.filter((f) => f.relation === rel);
              if (!list.length) return null;
              return (
                <div key={rel}>
                  <div className="muted small group-label">{label.toUpperCase()} ({list.length})</div>
                  {list.map((f) => (
                    <div key={f.user_id} className="friend">
                      <div className="avatar">{f.display_name[0]}</div>
                      <Link to={`/profile/${f.user_id}`} className="grow">{f.display_name}</Link>
                      {rel === 'incoming' && <button className="linkbtn small" onClick={() => run(() => api.put(`/friends/${f.user_id}/accept`), 'Friend added')}>Accept</button>}
                      <button className="linkbtn small danger" onClick={() => run(() => api.del(`/friends/${f.user_id}`))}>
                        {rel === 'friend' ? 'Remove' : rel === 'incoming' ? 'Decline' : 'Cancel'}
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
