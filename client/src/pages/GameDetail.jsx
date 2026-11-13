import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, fmtDate, hours, money } from '../api.js';
import { useApp } from '../AppContext.jsx';
import { GameCover, Price, ReviewBadge, Tags, Loading } from '../components/ui.jsx';

export default function GameDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user, refreshUser, notify } = useApp();
  const [game, setGame] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [filter, setFilter] = useState('');
  const [draft, setDraft] = useState({ recommended: true, body: '' });
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    const [g, r] = await Promise.all([api.get(`/games/${id}`), api.get(`/games/${id}/reviews${filter ? `?filter=${filter}` : ''}`)]);
    setGame(g);
    setReviews(r);
  }, [id, filter]);

  useEffect(() => { load().catch((e) => notify(e.message, 'err')); }, [load, user, notify]);

  const act = async (fn, msg) => {
    if (!user) return nav('/login');
    try { await fn(); if (msg) notify(msg); await load(); await refreshUser(); } catch (e) { notify(e.message, 'err'); }
  };

  if (!game) return <Loading />;
  const v = game.viewer || {};
  const mine = reviews.find((r) => r.review_id === v.my_review_id);

  const submitReview = (e) => {
    e.preventDefault();
    act(async () => {
      if (mine) await api.put(`/reviews/${mine.review_id}`, draft);
      else await api.post(`/games/${id}/reviews`, draft);
      setEditing(false);
      setDraft({ recommended: true, body: '' });
    }, mine ? 'Review updated' : 'Review posted');
  };

  return (
    <div className="detail">
      <div className="crumbs muted small">
        <Link to="/">All Games</Link> › {game.genres[0] && <><Link to={`/?genre=${game.genres[0]}`}>{game.genres[0]}</Link> › </>}{game.title}
      </div>
      <h1 className="detail-title">{game.title}</h1>

      <div className="detail-top">
        <GameCover title={game.title} color={game.cover_color} size="xl" />
        <div className="detail-side">
          <p className="lede">{game.short_description}</p>
          <dl className="facts">
            <dt>All reviews</dt><dd><ReviewBadge summary={game.review_summary} count={game.review_count} /></dd>
            <dt>Release date</dt><dd>{fmtDate(game.release_date)}</dd>
            <dt>Developer</dt><dd>{game.developer ? <Link to={`/developer/${game.developer_id}`}>{game.developer}</Link> : '—'}</dd>
            <dt>Publisher</dt><dd>{game.publisher ? <Link to={`/publisher/${game.publisher_id}`}>{game.publisher}</Link> : '—'}</dd>
            <dt>Rating</dt><dd>{game.age_rating || '—'}</dd>
          </dl>
          <Tags items={game.genres} max={8} />
          <div className="platforms">{game.platforms.map((p) => <span key={p} className={`plat plat-${p}`}>{p}</span>)}</div>
        </div>
      </div>

      <div className="detail-body">
        <div className="detail-main">
          {v.owned ? (
            <div className="purchase owned">
              <div><strong>{game.title} is already in your library</strong></div>
              <Link className="btn" to="/library">View in library</Link>
            </div>
          ) : (
            <div className="purchase">
              <div>
                <h3>Buy {game.title}</h3>
                {game.discount_percent > 0 && <span className="small sale-note">Special promotion — {game.discount_percent}% off</span>}
              </div>
              <div className="purchase-actions">
                <Price price={game.price} discount={game.discount_percent} final={game.final_price} />
                {v.in_cart
                  ? <Link className="btn buy" to="/cart">In cart</Link>
                  : <button className="btn buy" onClick={() => act(() => api.post('/cart', { game_id: game.game_id }), 'Added to cart')}>Add to Cart</button>}
              </div>
            </div>
          )}
          {!v.owned && (
            <div className="wish-row">
              {v.wishlisted
                ? <button className="btn ghost" onClick={() => act(() => api.del(`/wishlist/${game.game_id}`), 'Removed from wishlist')}>✓ On Wishlist</button>
                : <button className="btn ghost" onClick={() => act(() => api.post('/wishlist', { game_id: game.game_id }), 'Added to wishlist')}>Add to your Wishlist</button>}
            </div>
          )}

          <h2 className="section-title">About this game</h2>
          <p className="about">{game.description || game.short_description}</p>

          <h2 className="section-title">Customer reviews</h2>
          {v.owned && (!mine || editing) && (
            <form className="review-form" onSubmit={submitReview}>
              <h4>{mine ? 'Edit your review' : `Write a review for ${game.title}`}</h4>
              <textarea rows={4} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                placeholder="What did you think of this game?" required />
              <div className="review-form-foot">
                <span className="muted small">Do you recommend this game?</span>
                <button type="button" className={`btn thumb ${draft.recommended ? 'on' : ''}`} onClick={() => setDraft({ ...draft, recommended: true })}>👍 Yes</button>
                <button type="button" className={`btn thumb ${!draft.recommended ? 'on neg' : ''}`} onClick={() => setDraft({ ...draft, recommended: false })}>👎 No</button>
                <div className="spacer" />
                {editing && <button type="button" className="btn ghost" onClick={() => setEditing(false)}>Cancel</button>}
                <button className="btn">{mine ? 'Save' : 'Post review'}</button>
              </div>
            </form>
          )}
          {!v.owned && user && <p className="muted small">You need to own this game to review it.</p>}

          <div className="review-filter">
            {[['', 'All'], ['positive', 'Positive'], ['negative', 'Negative']].map(([k, l]) => (
              <button key={k} className={`chip ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>{l}</button>
            ))}
          </div>
          {reviews.length === 0 && <p className="muted">No reviews yet.</p>}
          {reviews.map((r) => (
            <article key={r.review_id} className="review">
              <div className="review-user">
                <div className="avatar">{r.display_name[0]}</div>
                <Link to={`/profile/${r.user_id}`}>{r.display_name}</Link>
              </div>
              <div className="review-main">
                <div className={`review-head ${r.recommended ? 'pos' : 'neg'}`}>
                  <span className="thumb-icon">{r.recommended ? '👍' : '👎'}</span>
                  <div>
                    <strong>{r.recommended ? 'Recommended' : 'Not Recommended'}</strong>
                    <div className="muted small">{hours(r.playtime_minutes)} on record</div>
                  </div>
                </div>
                <div className="muted small">Posted {fmtDate(r.created_at)}{r.updated_at !== r.created_at && ' · edited'}</div>
                <p>{r.body}</p>
                <div className="review-actions small">
                  <span className="muted">{r.helpful_count} people found this helpful</span>
                  {user && r.user_id !== user.user_id && (
                    <button className="linkbtn" onClick={() => act(() => api.post(`/reviews/${r.review_id}/helpful`))}>Helpful</button>
                  )}
                  {user && r.user_id === user.user_id && !editing && (
                    <button className="linkbtn" onClick={() => { setDraft({ recommended: r.recommended, body: r.body }); setEditing(true); }}>Edit</button>
                  )}
                  {user && (r.user_id === user.user_id || user.is_admin) && (
                    <button className="linkbtn danger" onClick={() => act(() => api.del(`/reviews/${r.review_id}`), 'Review deleted')}>Delete</button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>

        <aside className="detail-aside">
          <div className="panel">
            <h4>Achievements <span className="muted">({game.achievements.length})</span></h4>
            {game.achievements.length === 0 && <p className="muted small">This game has no achievements.</p>}
            {game.achievements.map((a) => (
              <div key={a.achievement_id} className={`ach ${a.unlocked ? 'got' : ''}`}>
                <div className="ach-icon">{a.unlocked ? '★' : '☆'}</div>
                <div className="ach-text">
                  <div>{a.name}</div>
                  <div className="muted small">{a.description}</div>
                  <div className="muted small">{a.unlock_pct ?? 0}% of players</div>
                </div>
                {v.owned && !a.unlocked && (
                  <button className="linkbtn small" title="Simulate unlocking"
                    onClick={() => act(() => api.post(`/achievements/${a.achievement_id}/unlock`), 'Achievement unlocked!')}>Unlock</button>
                )}
              </div>
            ))}
          </div>
          <div className="panel">
            <h4>Store stats</h4>
            <div className="small">Owned by <strong>{game.owner_count}</strong> players</div>
            <div className="small">Base price {money(game.price)}</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
