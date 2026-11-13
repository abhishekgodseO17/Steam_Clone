import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { GameCover, GameRow, Price, ReviewBadge, Tags, Loading, Empty } from '../components/ui.jsx';

export default function Store() {
  const [params, setParams] = useSearchParams();
  const [games, setGames] = useState(null);
  const [featured, setFeatured] = useState([]);
  const [genres, setGenres] = useState([]);
  const [slide, setSlide] = useState(0);
  const [q, setQ] = useState(params.get('q') || '');

  const filters = {
    q: params.get('q') || '',
    genre: params.get('genre') || '',
    platform: params.get('platform') || '',
    on_sale: params.get('on_sale') || '',
    max_price: params.get('max_price') || '',
    sort: params.get('sort') || 'relevance',
  };
  const browsing = filters.q || filters.genre || filters.platform || filters.on_sale || filters.max_price;

  useEffect(() => {
    api.get('/genres').then(setGenres);
    api.get('/games?sort=relevance').then((all) => setFeatured(all.slice(0, 5)));
  }, []);

  useEffect(() => {
    setGames(null);
    const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
    api.get(`/games?${qs}`).then(setGames);
  }, [params.toString()]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!featured.length) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % featured.length), 6000);
    return () => clearInterval(t);
  }, [featured.length]);

  const set = (k, v) => {
    const next = new URLSearchParams(params);
    v ? next.set(k, v) : next.delete(k);
    setParams(next);
  };

  const specials = useMemo(() => (games || []).filter((g) => g.discount_percent > 0).slice(0, 4), [games]);
  const f = featured[slide];

  return (
    <div className="store">
      <form className="searchbar" onSubmit={(e) => { e.preventDefault(); set('q', q.trim()); }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search games, developers, publishers…" />
        <button className="btn">Search</button>
      </form>

      {!browsing && f && (
        <section className="hero">
          <h2 className="section-title">Featured &amp; Recommended</h2>
          <Link to={`/game/${f.game_id}`} className="hero-card">
            <GameCover title={f.title} color={f.cover_color} size="xl" />
            <div className="hero-info">
              <h3>{f.title}</h3>
              <p>{f.short_description}</p>
              <Tags items={f.genres} />
              <ReviewBadge summary={f.review_summary} count={f.review_count} />
              <div className="hero-foot">
                <span className="muted">{f.owner_count} players own this</span>
                <Price price={f.price} discount={f.discount_percent} final={f.final_price} />
              </div>
            </div>
          </Link>
          <div className="dots">
            {featured.map((g, i) => (
              <button key={g.game_id} className={i === slide ? 'on' : ''} onClick={() => setSlide(i)} aria-label={g.title} />
            ))}
          </div>
        </section>
      )}

      {!browsing && specials.length > 0 && (
        <section>
          <h2 className="section-title">Special Offers</h2>
          <div className="specials">
            {specials.map((g) => (
              <Link key={g.game_id} to={`/game/${g.game_id}`} className="special-card">
                <GameCover title={g.title} color={g.cover_color} size="md" />
                <div className="special-foot">
                  <span className="muted small">Today's deal</span>
                  <Price price={g.price} discount={g.discount_percent} final={g.final_price} compact />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="browse">
        <div className="browse-list">
          <div className="browse-head">
            <h2 className="section-title">{browsing ? `Results${filters.q ? ` for “${filters.q}”` : ''}` : 'All Games'}</h2>
            <select value={filters.sort} onChange={(e) => set('sort', e.target.value)}>
              <option value="relevance">Sort: Popular</option>
              <option value="newest">Release date</option>
              <option value="rating">User reviews</option>
              <option value="price_asc">Lowest price</option>
              <option value="price_desc">Highest price</option>
              <option value="discount">Biggest discount</option>
              <option value="name">Name</option>
            </select>
          </div>
          {!games ? <Loading /> : games.length === 0 ? <Empty>No games match those filters.</Empty> : (
            <div className="rows">{games.map((g) => <GameRow key={g.game_id} g={g} />)}</div>
          )}
          {games && <div className="muted small count">{games.length} result{games.length === 1 ? '' : 's'}</div>}
        </div>

        <aside className="filters">
          <div className="filter-block">
            <h4>Narrow by price</h4>
            <select value={filters.max_price} onChange={(e) => set('max_price', e.target.value)}>
              <option value="">Any price</option>
              <option value="5">Under $5</option>
              <option value="10">Under $10</option>
              <option value="20">Under $20</option>
              <option value="40">Under $40</option>
            </select>
            <label className="check">
              <input type="checkbox" checked={filters.on_sale === 'true'} onChange={(e) => set('on_sale', e.target.checked ? 'true' : '')} />
              Special offers only
            </label>
          </div>
          <div className="filter-block">
            <h4>Narrow by OS</h4>
            {['Windows', 'macOS', 'Linux'].map((p) => (
              <label key={p} className="check">
                <input type="radio" name="plat" checked={filters.platform === p} onChange={() => set('platform', p)} /> {p}
              </label>
            ))}
            {filters.platform && <button className="linkbtn small" onClick={() => set('platform', '')}>Clear</button>}
          </div>
          <div className="filter-block">
            <h4>Narrow by genre</h4>
            <div className="genre-list">
              {genres.map((g) => (
                <button key={g.genre_id} className={`chip ${filters.genre === g.name ? 'on' : ''}`}
                  onClick={() => set('genre', filters.genre === g.name ? '' : g.name)}>
                  {g.name} <span className="muted">{g.game_count}</span>
                </button>
              ))}
            </div>
          </div>
          {browsing && <button className="btn ghost full" onClick={() => { setQ(''); setParams({}); }}>Reset all filters</button>}
        </aside>
      </section>
    </div>
  );
}
