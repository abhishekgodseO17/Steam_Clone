import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fmtDate, money } from '../api.js';
import { useApp } from '../AppContext.jsx';
import { Loading, Empty } from '../components/ui.jsx';

export default function Orders() {
  const { refreshUser, notify } = useApp();
  const [orders, setOrders] = useState(null);
  const [confirming, setConfirming] = useState(null); // order_id awaiting a second click
  const load = () => api.get('/orders').then(setOrders);
  useEffect(() => { load(); }, []);

  const refund = async (o) => {
    if (confirming !== o.order_id) { setConfirming(o.order_id); return; }
    setConfirming(null);
    try {
      await api.post(`/orders/${o.order_id}/refund`);
      notify(`Refunded ${money(o.total_amount)} to your wallet`);
      load(); refreshUser();
    } catch (e) { notify(e.message, 'err'); }
  };

  if (!orders) return <Loading />;
  return (
    <div className="narrow">
      <h1 className="page-title">Purchase History</h1>
      <p className="muted small">Refunds: within 14 days of purchase and less than 2 hours of playtime. Refunds go to your Vapor Wallet.</p>
      {orders.length === 0 && <Empty>No purchases yet.</Empty>}
      <table className="table">
        <thead><tr><th>Date</th><th>Order</th><th>Items</th><th>Payment</th><th>Total</th><th /></tr></thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.order_id} className={o.status === 'refunded' ? 'refunded' : ''}>
              <td>{fmtDate(o.created_at)}</td>
              <td>#{o.order_id}</td>
              <td>{o.items.map((i) => <div key={i.game_id}><Link to={`/game/${i.game_id}`}>{i.title}</Link> <span className="muted small">{money(i.price_paid)}</span></div>)}</td>
              <td className="cap">{o.payment_method}</td>
              <td>{money(o.total_amount)}</td>
              <td>{o.status === 'refunded' ? <span className="pill">Refunded</span> : <button className="linkbtn small" onClick={() => refund(o)}>{confirming === o.order_id ? 'Click again to confirm' : 'Request refund'}</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
