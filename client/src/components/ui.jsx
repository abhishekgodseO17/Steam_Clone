import { Link } from 'react-router-dom';
import { money } from '../api.js';

/** Generated cover art — no copyrighted images, just the title on a tinted gradient. */
export function GameCover({ title, color = '#1b2838', size = 'md', className = '' }) {
  const initials = title.replace(/[^A-Za-z0-9 ]/g, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('');
  return (
    <div className={`cover cover-${size} ${className}`} style={{ '--c': color }}>
      <span className="cover-mark">{initials}</span>
      <span className="cover-title">{title}</span>
    </div>
  );
}

export function Price({ price, discount, final, compact }) {
  if (Number(final) === 0) return <div className="price"><span className="final">Free to Play</span></div>;
  return (
    <div className={`price ${compact ? 'compact' : ''}`}>
      {discount > 0 && <span className="pct">-{discount}%</span>}
      <span className="price-stack">
        {discount > 0 && <span className="orig">{money(price)}</span>}
        <span className="final">{money(final)}</span>
      </span>
    </div>
  );
}

const LABEL_CLASS = (s = '') =>
  s.includes('Positive') ? 'pos' : s.includes('Mixed') ? 'mixed' : s.includes('Negative') ? 'neg' : 'none';

export const ReviewBadge = ({ summary, count }) => (
  <span className={`review-badge ${LABEL_CLASS(summary)}`}>
    {summary}{count ? <span className="muted"> ({count})</span> : null}
  </span>
);

export const Tags = ({ items = [], max = 4 }) => (
  <div className="tags">{items.slice(0, max).map((t) => <span key={t} className="tag">{t}</span>)}</div>
);

export function GameRow({ g }) {
  return (
    <Link to={`/game/${g.game_id}`} className="game-row">
      <GameCover title={g.title} color={g.cover_color} size="sm" />
      <div className="game-row-main">
        <div className="game-row-title">{g.title}</div>
        <div className="platforms">{(g.platforms || []).map((p) => <span key={p} className={`plat plat-${p}`}>{p}</span>)}</div>
        <Tags items={g.genres} />
      </div>
      <div className="game-row-date muted">{g.release_date?.slice(0, 4)}</div>
      <div className="game-row-review"><ReviewBadge summary={g.review_summary} /></div>
      <Price price={g.price} discount={g.discount_percent} final={g.final_price} compact />
    </Link>
  );
}

export const Empty = ({ children }) => <div className="empty">{children}</div>;
export const Loading = () => <div className="loading"><span /><span /><span /></div>;
