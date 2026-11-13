import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, fmtDate, hours, money } from '../api.js';
import { useApp } from '../AppContext.jsx';
import { GameCover, Loading } from '../components/ui.jsx';

export default function Profile() {
  const { id } = useParams();
  const { user } = useApp();
  const [p, setP] = useState(null);
  useEffect(() => { setP(null); api.get(`/users/${id}`).then(setP); }, [id]);
  if (!p) return <Loading />;
  const level = Math.max(1, Math.floor(p.games_owned * 2 + p.achievements_unlocked + p.reviews_written));

  return (
    <div className="profile">
      <div className="profile-head">
        <div className="avatar big">{p.display_name[0]}</div>
        <div className="grow">
          <h1>{p.display_name}</h1>
          <div className="muted">{p.username} {p.country && `· ${p.country}`} · Member since {fmtDate(p.created_at)}</div>
          {p.bio && <p className="bio">{p.bio}</p>}
        </div>
        <div className="level">Level <span>{level}</span></div>
      </div>

      <div className="profile-body">
        <div>
          <div className="stats">
            <div><strong>{p.games_owned}</strong><span>Games</span></div>
            <div><strong>{hours(p.total_playtime_minutes)}</strong><span>Played</span></div>
            <div><strong>{p.achievements_unlocked}</strong><span>Achievements</span></div>
            <div><strong>{p.reviews_written}</strong><span>Reviews</span></div>
            {user?.user_id === p.user_id && <div><strong>{money(p.total_spent)}</strong><span>Spent</span></div>}
          </div>

          <h2 className="section-title">Most played</h2>
          {p.top_games.length === 0 && <p className="muted">No games yet.</p>}
          {p.top_games.map((g) => (
            <Link key={g.game_id} to={`/game/${g.game_id}`} className="activity">
              <GameCover title={g.title} color={g.cover_color} size="sm" />
              <div className="grow"><strong>{g.title}</strong></div>
              <div className="muted small right">{hours(g.playtime_minutes)} on record<br />{g.last_played_at ? `last played ${fmtDate(g.last_played_at)}` : 'never played'}</div>
            </Link>
          ))}

          <h2 className="section-title">Recent reviews</h2>
          {p.recent_reviews.length === 0 && <p className="muted">No reviews yet.</p>}
          {p.recent_reviews.map((r) => (
            <div key={r.review_id} className="mini-review">
              <span>{r.recommended ? '👍' : '👎'}</span>
              <div><Link to={`/game/${r.game_id}`}>{r.title}</Link><p className="small">{r.body}</p></div>
            </div>
          ))}
        </div>
        <aside className="panel">
          <h4>Friends <span className="muted">{p.friends.length}</span></h4>
          {p.friends.length === 0 && <p className="muted small">No friends yet.</p>}
          {p.friends.map((f) => (
            <Link key={f.user_id} to={`/profile/${f.user_id}`} className="friend">
              <div className="avatar">{f.display_name[0]}</div>{f.display_name}
            </Link>
          ))}
          {user?.user_id === p.user_id && <Link to="/account" className="btn ghost full" style={{ marginTop: 12 }}>Edit profile &amp; friends</Link>}
        </aside>
      </div>
    </div>
  );
}
