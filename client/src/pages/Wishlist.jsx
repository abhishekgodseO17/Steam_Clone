import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fmtDate } from '../api.js';
import { useApp } from '../AppContext.jsx';
import { GameCover, Price, ReviewBadge, Tags, Loading, Empty } from '../components/ui.jsx';

export default function Wishlist() {
  const { user, refreshUser, notify } = useApp();
  const [items, setItems] = useState(null);
  const load = () => api.get('/wishlist').then(setItems);
  useEffect(() => { load(); }, []);

  const toCart = async (g) => {
    try { await api.post('/cart', { game_id: g.game_id }); notify(`${g.title} added to cart`); refreshUser(); }
    catch (e) { notify(e.message, 'err'); }
  };
  const remove = async (g) => { await api.del(`/wishlist/${g.game_id}`); load(); };

  if (!items) return <Loading />;
  return (
    <div className="narrow">
      <h1 className="page-title">{user.display_name}'s Wishlist</h1>
      {items.length === 0 && <Empty>Nothing on your wishlist yet. <Link to="/">Browse the store</Link></Empty>}
      {items.map((g) => (
        <div key={g.game_id} className="wish-item">
          <GameCover title={g.title} color={g.cover_color} size="md" />
          <div className="grow">
            <Link to={`/game/${g.game_id}`} className="wish-title">{g.title}</Link>
            <div className="small"><ReviewBadge summary={g.review_summary} /></div>
            <Tags items={g.genres} />
            <div className="muted small">Added on {fmtDate(g.added_at)} · <button className="linkbtn small" onClick={() => remove(g)}>remove</button></div>
          </div>
          <div className="wish-buy">
            <Price price={g.price} discount={g.discount_percent} final={g.final_price} compact />
            <button className="btn buy" onClick={() => toCart(g)}>Add to Cart</button>
          </div>
        </div>
      ))}
    </div>
  );
}
