// Cart, checkout, orders/refunds, library and wishlist — all scoped to the logged-in user.
import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { ah, HttpError } from '../middleware/errors.js';
import { requireAuth } from '../middleware/auth.js';

const r = Router();
r.use(['/cart', '/orders', '/library', '/wishlist', '/achievements'], requireAuth);

/* ============================== CART ============================== */

// GET /api/cart
r.get('/cart', ah(async (req, res) => {
  const { rows } = await query(
    `SELECT c.game_id, c.added_at, v.title, v.price, v.discount_percent, v.final_price, v.cover_color, v.developer
     FROM cart_items c JOIN v_game_catalog v USING (game_id)
     WHERE c.user_id = $1 ORDER BY c.added_at`,
    [req.user.user_id]
  );
  const total = rows.reduce((s, x) => s + x.final_price, 0);
  res.json({ items: rows, total: Math.round(total * 100) / 100 });
}));

// POST /api/cart  { game_id }
r.post('/cart', ah(async (req, res) => {
  const gameId = Number(req.body.game_id);
  const owned = await query('SELECT 1 FROM library WHERE user_id=$1 AND game_id=$2', [req.user.user_id, gameId]);
  if (owned.rowCount) throw new HttpError(409, 'You already own this game.');
  await query(
    `INSERT INTO cart_items (user_id, game_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [req.user.user_id, gameId]
  );
  res.status(201).json({ ok: true });
}));

// DELETE /api/cart/:gameId
r.delete('/cart/:gameId', ah(async (req, res) => {
  await query('DELETE FROM cart_items WHERE user_id=$1 AND game_id=$2', [req.user.user_id, Number(req.params.gameId)]);
  res.status(204).end();
}));

/**
 * POST /api/cart/checkout  { payment_method: 'wallet' | 'card' | 'paypal' }
 * One database transaction:
 *   1. lock the user row, read the cart at current sale prices
 *   2. if paying by wallet, check + deduct the balance
 *   3. create the order and its order_items (price snapshot)
 *   4. add the games to the library, remove them from cart and wishlist
 * Any failure rolls everything back.
 */
r.post('/cart/checkout', ah(async (req, res) => {
  const method = req.body.payment_method || 'wallet';
  const uid = req.user.user_id;

  const order = await withTransaction(async (c) => {
    const user = (await c.query('SELECT wallet_balance FROM users WHERE user_id=$1 FOR UPDATE', [uid])).rows[0];
    const items = (await c.query(
      `SELECT v.game_id, v.final_price FROM cart_items ci JOIN v_game_catalog v USING (game_id)
       WHERE ci.user_id = $1 AND v.is_published`, [uid])).rows;
    if (!items.length) throw new HttpError(400, 'Your cart is empty.');

    const total = Math.round(items.reduce((s, i) => s + i.final_price, 0) * 100) / 100;
    if (method === 'wallet') {
      if (user.wallet_balance < total)
        throw new HttpError(402, `Not enough wallet funds ($${user.wallet_balance.toFixed(2)} available, $${total.toFixed(2)} needed).`);
      await c.query('UPDATE users SET wallet_balance = wallet_balance - $1 WHERE user_id = $2', [total, uid]);
    }

    const o = (await c.query(
      `INSERT INTO orders (user_id, total_amount, payment_method) VALUES ($1, $2, $3) RETURNING *`,
      [uid, total, method])).rows[0];

    for (const it of items) {
      await c.query('INSERT INTO order_items (order_id, game_id, price_paid) VALUES ($1, $2, $3)', [o.order_id, it.game_id, it.final_price]);
      await c.query('INSERT INTO library (user_id, game_id, order_id) VALUES ($1, $2, $3)', [uid, it.game_id, o.order_id]);
    }
    const ids = items.map((i) => i.game_id);
    await c.query('DELETE FROM cart_items WHERE user_id=$1', [uid]);
    await c.query('DELETE FROM wishlist WHERE user_id=$1 AND game_id = ANY($2::int[])', [uid, ids]);
    return { ...o, game_ids: ids };
  });

  res.status(201).json(order);
}));

/* ============================== ORDERS ============================== */

// GET /api/orders — purchase history with line items
r.get('/orders', ah(async (req, res) => {
  const { rows } = await query(
    `SELECT o.*,
            JSON_AGG(JSON_BUILD_OBJECT('game_id', g.game_id, 'title', g.title, 'price_paid', oi.price_paid, 'cover_color', g.cover_color)
                     ORDER BY g.title) AS items
     FROM orders o
     JOIN order_items oi USING (order_id)
     JOIN games g USING (game_id)
     WHERE o.user_id = $1
     GROUP BY o.order_id
     ORDER BY o.created_at DESC`,
    [req.user.user_id]
  );
  res.json(rows);
}));

/**
 * POST /api/orders/:id/refund
 * Steam-style rule: within 14 days of purchase and every game played < 2 hours.
 * Removes the games from the library and refunds to the wallet — in one transaction.
 */
r.post('/orders/:id/refund', ah(async (req, res) => {
  const uid = req.user.user_id;
  const orderId = Number(req.params.id);
  const result = await withTransaction(async (c) => {
    const o = (await c.query('SELECT * FROM orders WHERE order_id=$1 AND user_id=$2 FOR UPDATE', [orderId, uid])).rows[0];
    if (!o) throw new HttpError(404, 'Order not found.');
    if (o.status !== 'completed') throw new HttpError(400, 'This order was already refunded.');
    if (Date.now() - new Date(o.created_at).getTime() > 14 * 864e5)
      throw new HttpError(400, 'Refunds are only available within 14 days of purchase.');
    const played = (await c.query(
      'SELECT MAX(playtime_minutes) AS m FROM library WHERE order_id=$1', [orderId])).rows[0].m || 0;
    if (played >= 120) throw new HttpError(400, 'Refunds are only available if each game was played for under 2 hours.');

    await c.query('DELETE FROM user_achievements WHERE user_id=$1 AND achievement_id IN (SELECT achievement_id FROM achievements WHERE game_id IN (SELECT game_id FROM order_items WHERE order_id=$2))', [uid, orderId]);
    await c.query('DELETE FROM reviews WHERE user_id=$1 AND game_id IN (SELECT game_id FROM order_items WHERE order_id=$2)', [uid, orderId]);
    await c.query('DELETE FROM library WHERE user_id=$1 AND order_id=$2', [uid, orderId]);
    await c.query('UPDATE users SET wallet_balance = wallet_balance + $1 WHERE user_id=$2', [o.total_amount, uid]);
    return (await c.query(`UPDATE orders SET status='refunded' WHERE order_id=$1 RETURNING *`, [orderId])).rows[0];
  });
  res.json(result);
}));

/* ============================== LIBRARY ============================== */

// GET /api/library
r.get('/library', ah(async (req, res) => {
  const { rows } = await query(
    `SELECT l.game_id, l.acquired_at, l.playtime_minutes, l.last_played_at, l.is_favorite,
            v.title, v.cover_color, v.developer,
            (SELECT COUNT(*) FROM achievements a WHERE a.game_id = l.game_id) AS achievements_total,
            (SELECT COUNT(*) FROM user_achievements ua JOIN achievements a USING (achievement_id)
              WHERE a.game_id = l.game_id AND ua.user_id = l.user_id) AS achievements_unlocked
     FROM library l JOIN v_game_catalog v USING (game_id)
     WHERE l.user_id = $1
     ORDER BY l.is_favorite DESC, l.last_played_at DESC NULLS LAST, v.title`,
    [req.user.user_id]
  );
  res.json(rows);
}));

// PATCH /api/library/:gameId  { is_favorite }
r.patch('/library/:gameId', ah(async (req, res) => {
  const { rows } = await query(
    'UPDATE library SET is_favorite = $1 WHERE user_id=$2 AND game_id=$3 RETURNING *',
    [!!req.body.is_favorite, req.user.user_id, Number(req.params.gameId)]
  );
  if (!rows[0]) throw new HttpError(404, 'You do not own this game.');
  res.json(rows[0]);
}));

// POST /api/library/:gameId/play  { minutes } — simulates a play session
r.post('/library/:gameId/play', ah(async (req, res) => {
  const minutes = Math.max(1, Math.min(600, Number(req.body.minutes) || 30));
  const { rows } = await query(
    `UPDATE library SET playtime_minutes = playtime_minutes + $1, last_played_at = NOW()
     WHERE user_id=$2 AND game_id=$3 RETURNING *`,
    [minutes, req.user.user_id, Number(req.params.gameId)]
  );
  if (!rows[0]) throw new HttpError(404, 'You do not own this game.');
  res.json(rows[0]);
}));

// POST /api/achievements/:id/unlock — DB trigger rejects it if the game isn't owned
r.post('/achievements/:id/unlock', ah(async (req, res) => {
  await query(
    'INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [req.user.user_id, Number(req.params.id)]
  );
  res.status(201).json({ ok: true });
}));

/* ============================== WISHLIST ============================== */

r.get('/wishlist', ah(async (req, res) => {
  const { rows } = await query(
    `SELECT w.game_id, w.added_at, v.title, v.price, v.discount_percent, v.final_price, v.cover_color,
            v.short_description, v.genres, review_label(v.positive_pct, v.review_count) AS review_summary
     FROM wishlist w JOIN v_game_catalog v USING (game_id)
     WHERE w.user_id = $1 ORDER BY w.added_at DESC`,
    [req.user.user_id]
  );
  res.json(rows);
}));

r.post('/wishlist', ah(async (req, res) => {
  await query('INSERT INTO wishlist (user_id, game_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [req.user.user_id, Number(req.body.game_id)]);
  res.status(201).json({ ok: true });
}));

r.delete('/wishlist/:gameId', ah(async (req, res) => {
  await query('DELETE FROM wishlist WHERE user_id=$1 AND game_id=$2', [req.user.user_id, Number(req.params.gameId)]);
  res.status(204).end();
}));

export default r;
