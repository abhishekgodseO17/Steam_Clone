import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fmtDate, hours } from '../api.js';
import { useApp } from '../AppContext.jsx';
import { GameCover, Loading, Empty } from '../components/ui.jsx';

export default function Library() {
  const { notify } = useApp();
  const [games, setGames] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('');

  const load = () => api.get('/library').then((g) => { setGames(g); return g; });
  useEffect(() => { load().then((g) => setSelected(g[0]?.game_id ?? null)); }, []);

  const shown = useMemo(() => (games || []).filter((g) => g.title.toLowerCase().includes(filter.toLowerCase())), [games, filter]);
  const sel = games?.find((g) => g.game_id === selected);

  const play = async () => {
    const minutes = 30 + Math.floor(Math.random() * 90);
    await api.post(`/library/${sel.game_id}/play`, { minutes });
    notify(`Played ${sel.title} for ${minutes} minutes`);
    load();
  };
  const fav = async () => { await api.patch(`/library/${sel.game_id}`, { is_favorite: !sel.is_favorite }); load(); };

  if (!games) return <Loading />;
  if (!games.length) return <Empty>Your library is empty. <Link to="/">Find something to play</Link></Empty>;

  return (
    <div className="library">
      <aside className="lib-list">
        <input placeholder="Search library" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <div className="muted small lib-count">ALL GAMES ({games.length})</div>
        {shown.map((g) => (
          <button key={g.game_id} className={`lib-item ${g.game_id === selected ? 'on' : ''}`} onClick={() => setSelected(g.game_id)}>
            <span className="lib-dot" style={{ background: g.cover_color }} />
            {g.is_favorite && <span className="star">★</span>}
            {g.title}
          </button>
        ))}
      </aside>
      {sel && (
        <section className="lib-detail">
          <div className="lib-hero" style={{ '--c': sel.cover_color }}>
            <GameCover title={sel.title} color={sel.cover_color} size="lg" />
            <div className="lib-hero-text">
              <h1>{sel.title}</h1>
              <div className="muted">{sel.developer}</div>
            </div>
          </div>
          <div className="lib-bar">
            <button className="btn play" onClick={play}>▶ PLAY</button>
            <div className="lib-stat"><span className="muted small">LAST PLAYED</span>{sel.last_played_at ? fmtDate(sel.last_played_at) : 'Never'}</div>
            <div className="lib-stat"><span className="muted small">PLAY TIME</span>{hours(sel.playtime_minutes)}</div>
            <div className="lib-stat"><span className="muted small">ACHIEVEMENTS</span>{sel.achievements_unlocked}/{sel.achievements_total}</div>
            <div className="spacer" />
            <button className="btn ghost" onClick={fav}>{sel.is_favorite ? '★ Favorite' : '☆ Add to favorites'}</button>
            <Link className="btn ghost" to={`/game/${sel.game_id}`}>Store page</Link>
          </div>
          {sel.achievements_total > 0 && (
            <div className="panel">
              <h4>Achievement progress</h4>
              <div className="bar"><span style={{ width: `${(100 * sel.achievements_unlocked) / sel.achievements_total}%` }} /></div>
              <div className="muted small">You've unlocked {sel.achievements_unlocked} of {sel.achievements_total}</div>
            </div>
          )}
          <p className="muted small">Added to library {fmtDate(sel.acquired_at)}</p>
        </section>
      )}
    </div>
  );
}
