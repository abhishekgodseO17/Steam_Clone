import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, money } from '../api.js';
import { useApp } from '../AppContext.jsx';
import { GameCover, Price, Loading, Empty } from '../components/ui.jsx';

export default function Cart() {
  const { user, refreshUser, notify } = useApp();
  const nav = useNavigate();
  const [cart, setCart] = useState(null);
  const [method, setMethod] = useState('wallet');
  const [busy, setBusy] = useState(false);

  const load = () => api.get('/cart').then(setCart);
  useEffect(() => { load(); }, []);

  const remove = async (id) => { await api.del(`/cart/${id}`); await load(); refreshUser(); };

  const checkout = async () => {
    setBusy(true);
    try {
      const o = await api.post('/cart/checkout', { payment_method: method });
      notify(`Purchase complete — order #${o.order_id}`);
      await refreshUser();
      nav('/library');
    } catch (e) {
      notify(e.message, 'err');
    } finally {
      setBusy(false);
    }
  };

  if (!cart) return <Loading />;
  const short = method === 'wallet' && user.wallet_balance < cart.total;

  return (
    <div className="narrow">
      <h1 className="page-title">Your Shopping Cart</h1>
      {cart.items.length === 0 ? (
        <Empty>Your cart is empty. <Link to="/">Browse the store</Link></Empty>
      ) : (
        <div className="cart-grid">
          <div>
            {cart.items.map((it) => (
              <div key={it.game_id} className="cart-item">
                <GameCover title={it.title} color={it.cover_color} size="sm" />
                <div className="grow">
                  <Link to={`/game/${it.game_id}`} className="strong">{it.title}</Link>
                  <div className="muted small">{it.developer}</div>
                </div>
                <div className="right">
                  <Price price={it.price} discount={it.discount_percent} final={it.final_price} compact />
                  <button className="linkbtn small" onClick={() => remove(it.game_id)}>Remove</button>
                </div>
              </div>
            ))}
          </div>
          <div className="panel checkout">
            <div className="total-row"><span>Estimated total</span><strong>{money(cart.total)}</strong></div>
            <h4>Payment method</h4>
            {[['wallet', `Vapor Wallet (${money(user.wallet_balance)})`], ['card', 'Credit / debit card'], ['paypal', 'PayPal']].map(([k, l]) => (
              <label key={k} className="check"><input type="radio" name="pm" checked={method === k} onChange={() => setMethod(k)} /> {l}</label>
            ))}
            {method !== 'wallet' && <p className="muted small">Demo only — no real payment is taken.</p>}
            {short && <p className="err-text small">Not enough wallet funds. <Link to="/account">Add funds</Link></p>}
            <button className="btn buy full" disabled={busy || short} onClick={checkout}>
              {busy ? 'Processing…' : 'Purchase'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
