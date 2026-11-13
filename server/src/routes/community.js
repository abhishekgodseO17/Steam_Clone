// Reviews, user profiles, wallet, friends, achievements admin, and admin stats.
import { Router } from 'express';
import { query } from '../db.js';
import { ah, HttpError } from '../middleware/errors.js';
import { optionalAuth, requireAuth, requireAdmin } from '../middleware/auth.js';

const r = Router();

/* ============================== REVIEWS ============================== */

// GET /api/games/:id/reviews?filter=positive|negative
r.get('/games/:id/reviews', ah(async (req, res) => {
  const params = [Number(req.params.id)];
  let extra = '';
  if (req.query.filter === 'positive') extra = 'AND r.recommended';
  if (req.query.filter === 'negative') extra = 'AND NOT r.recommended';
  const { rows } = await query(
    `SELECT r.*, u.username, u.display_name, l.playtime_minutes
     FROM reviews r
     JOIN users u USING (user_id)
     LEFT JOIN library l ON l.user_id = r.user_id AND l.game_id = r.game_id
     WHERE r.game_id = $1 ${extra}
     ORDER BY r.helpful_count DESC, r.created_at DESC`,
    params
  );
  res.json(rows);
}));

// POST /api/games/:id/reviews  { recommended, body }  — trigger enforces ownership
r.post('/games/:id/reviews', requireAuth, ah(async (req, res) => {
  const { recommended, body } = req.body;
  if (typeof recommended !== 'boolean' || !body?.trim()) throw new HttpError(400, 'Pick a recommendation and write a review.');
  const { rows } = await query(
    `INSERT INTO reviews (user_id, game_id, recommended, body) VALUES ($1, $2, $3, $4) RETURNING *`,
    [req.user.user_id, Number(req.params.id), recommended, body.trim()]
  );
  res.status(201).json(rows[0]);
}));

// PUT /api/reviews/:id  — only the author
r.put('/reviews/:id', requireAuth, ah(async (req, res) => {
  const { recommended, body } = req.body;
  const { rows } = await query(
    `UPDATE reviews SET recommended = COALESCE($1, recommended), body = COALESCE($2, body)
     WHERE review_id = $3 AND user_id = $4 RETURNING *`,
    [typeof recommended === 'boolean' ? recommended : null, body?.trim() || null, Number(req.params.id), req.user.user_id]
  );
  if (!rows[0]) throw new HttpError(404, 'Review not found or not yours.');
  res.json(rows[0]);
}));

// DELETE /api/reviews/:id  — author or admin
r.delete('/reviews/:id', requireAuth, ah(async (req, res) => {
  const { rowCount } = await query(
    'DELETE FROM reviews WHERE review_id = $1 AND (user_id = $2 OR $3)',
    [Number(req.params.id), req.user.user_id, !!req.user.is_admin]
  );
  if (!rowCount) throw new HttpError(404, 'Review not found or not yours.');
  res.status(204).end();
}));

// POST /api/reviews/:id/helpful
r.post('/reviews/:id/helpful', requireAuth, ah(async (req, res) => {
  const { rows } = await query(
    'UPDATE reviews SET helpful_count = helpful_count + 1 WHERE review_id = $1 RETURNING helpful_count',
    [Number(req.params.id)]
  );
  if (!rows[0]) throw new HttpError(404, 'Review not found.');
  res.json(rows[0]);
}));

/* ============================== USERS / PROFILES ============================== */

// GET /api/users?q=   (search, used by "add friend" and the admin page)
r.get('/users', optionalAuth, ah(async (req, res) => {
  const { rows } = await query(
    `SELECT u.user_id, u.username, u.display_name, u.country, u.created_at, u.is_admin, s.games_owned
     FROM users u JOIN v_user_stats s USING (user_id)
     WHERE $1 = '' OR u.username ILIKE '%' || $1 || '%' OR u.display_name ILIKE '%' || $1 || '%'
     ORDER BY u.username LIMIT 50`,
    [req.query.q || '']
  );
  res.json(rows);
}));

// GET /api/users/:id — public profile
r.get('/users/:id', ah(async (req, res) => {
  const id = Number(req.params.id);
  const u = await query(
    `SELECT u.user_id, u.username, u.display_name, u.country, u.bio, u.created_at, s.*
     FROM users u JOIN v_user_stats s USING (user_id) WHERE u.user_id = $1`, [id]);
  if (!u.rows[0]) throw new HttpError(404, 'User not found.');

  const [games, reviews, friends] = await Promise.all([
    query(`SELECT l.game_id, l.playtime_minutes, l.last_played_at, g.title, g.cover_color
           FROM library l JOIN games g USING (game_id) WHERE l.user_id = $1
           ORDER BY l.playtime_minutes DESC LIMIT 6`, [id]),
    query(`SELECT r.review_id, r.recommended, r.body, r.created_at, g.game_id, g.title
           FROM reviews r JOIN games g USING (game_id) WHERE r.user_id = $1
           ORDER BY r.created_at DESC LIMIT 5`, [id]),
    query(`SELECT u.user_id, u.username, u.display_name FROM friendships f
           JOIN users u ON u.user_id = CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END
           WHERE (f.requester_id = $1 OR f.addressee_id = $1) AND f.status = 'accepted'
           ORDER BY u.username`, [id]),
  ]);
  res.json({ ...u.rows[0], top_games: games.rows, recent_reviews: reviews.rows, friends: friends.rows });
}));

// PUT /api/users/me  — UPDATE own profile
r.put('/users/me', requireAuth, ah(async (req, res) => {
  const { display_name, country, bio, email } = req.body;
  const { rows } = await query(
    `UPDATE users SET display_name = COALESCE(NULLIF($1,''), display_name),
                      country = COALESCE($2, country),
                      bio = COALESCE($3, bio),
                      email = COALESCE(NULLIF(LOWER($4),''), email)
     WHERE user_id = $5
     RETURNING user_id, username, email, display_name, country, bio, wallet_balance, is_admin, created_at`,
    [display_name ?? null, country === '' ? null : country ?? null, bio ?? null, email ?? null, req.user.user_id]
  );
  res.json(rows[0]);
}));

// POST /api/users/me/wallet  { amount } — add funds
r.post('/users/me/wallet', requireAuth, ah(async (req, res) => {
  const amount = Number(req.body.amount);
  if (!(amount > 0 && amount <= 500)) throw new HttpError(400, 'Amount must be between $0.01 and $500.');
  const { rows } = await query(
    'UPDATE users SET wallet_balance = wallet_balance + $1 WHERE user_id = $2 RETURNING wallet_balance',
    [amount, req.user.user_id]
  );
  res.json(rows[0]);
}));

// DELETE /api/users/:id  (admin) — cascades to library, reviews, cart, etc.
r.delete('/users/:id', requireAdmin, ah(async (req, res) => {
  if (Number(req.params.id) === req.user.user_id) throw new HttpError(400, "You can't delete your own admin account.");
  const { rowCount } = await query('DELETE FROM users WHERE user_id = $1', [Number(req.params.id)]);
  if (!rowCount) throw new HttpError(404, 'User not found.');
  res.status(204).end();
}));

/* ============================== FRIENDS ============================== */

// GET /api/friends — accepted friends + incoming/outgoing requests
r.get('/friends', requireAuth, ah(async (req, res) => {
  const { rows } = await query(
    `SELECT u.user_id, u.username, u.display_name, f.status, f.created_at,
            CASE WHEN f.status = 'accepted' THEN 'friend'
                 WHEN f.requester_id = $1 THEN 'outgoing' ELSE 'incoming' END AS relation
     FROM friendships f
     JOIN users u ON u.user_id = CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END
     WHERE f.requester_id = $1 OR f.addressee_id = $1
     ORDER BY relation, u.username`,
    [req.user.user_id]
  );
  res.json(rows);
}));

// POST /api/friends { username } — send a request
r.post('/friends', requireAuth, ah(async (req, res) => {
  const target = (await query('SELECT user_id FROM users WHERE username = $1', [req.body.username || ''])).rows[0];
  if (!target) throw new HttpError(404, 'No user with that username.');
  if (target.user_id === req.user.user_id) throw new HttpError(400, "You can't friend yourself.");
  await query('INSERT INTO friendships (requester_id, addressee_id) VALUES ($1, $2)', [req.user.user_id, target.user_id]);
  res.status(201).json({ ok: true });
}));

// PUT /api/friends/:userId/accept
r.put('/friends/:userId/accept', requireAuth, ah(async (req, res) => {
  const { rowCount } = await query(
    `UPDATE friendships SET status = 'accepted' WHERE requester_id = $1 AND addressee_id = $2 AND status = 'pending'`,
    [Number(req.params.userId), req.user.user_id]
  );
  if (!rowCount) throw new HttpError(404, 'No pending request from that user.');
  res.json({ ok: true });
}));

// DELETE /api/friends/:userId — unfriend / cancel / decline
r.delete('/friends/:userId', requireAuth, ah(async (req, res) => {
  await query(
    `DELETE FROM friendships WHERE (requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1)`,
    [req.user.user_id, Number(req.params.userId)]
  );
  res.status(204).end();
}));

/* ============================== ACHIEVEMENTS (admin) ============================== */

r.post('/games/:id/achievements', requireAdmin, ah(async (req, res) => {
  const { name, description } = req.body;
  if (!name || !description) throw new HttpError(400, 'Name and description are required.');
  const { rows } = await query(
    'INSERT INTO achievements (game_id, name, description) VALUES ($1, $2, $3) RETURNING *',
    [Number(req.params.id), name, description]
  );
  res.status(201).json(rows[0]);
}));

r.delete('/achievements/:id', requireAdmin, ah(async (req, res) => {
  const { rowCount } = await query('DELETE FROM achievements WHERE achievement_id = $1', [Number(req.params.id)]);
  if (!rowCount) throw new HttpError(404, 'Achievement not found.');
  res.status(204).end();
}));

/* ============================== ADMIN STATS ============================== */

r.get('/admin/stats', requireAdmin, ah(async (_req, res) => {
  const [totals, topGames, byGenre, recent] = await Promise.all([
    query(`SELECT
             (SELECT COUNT(*) FROM users) AS users,
             (SELECT COUNT(*) FROM games) AS games,
             (SELECT COUNT(*) FROM orders WHERE status='completed') AS orders,
             (SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE status='completed') AS revenue,
             (SELECT COUNT(*) FROM reviews) AS reviews`),
    query(`SELECT g.game_id, g.title, COUNT(*) AS copies_sold, SUM(oi.price_paid) AS revenue
           FROM order_items oi JOIN orders o USING (order_id) JOIN games g USING (game_id)
           WHERE o.status = 'completed'
           GROUP BY g.game_id ORDER BY revenue DESC LIMIT 5`),
    query(`SELECT ge.name AS genre,
                  COUNT(DISTINCT o.order_id) AS orders,
                  COALESCE(SUM(oi.price_paid) FILTER (WHERE o.status = 'completed'), 0) AS revenue
           FROM genres ge
           LEFT JOIN game_genres gg USING (genre_id)
           LEFT JOIN order_items oi ON oi.game_id = gg.game_id
           LEFT JOIN orders o ON o.order_id = oi.order_id AND o.status = 'completed'
           GROUP BY ge.name ORDER BY revenue DESC`),
    query(`SELECT o.order_id, o.total_amount, o.status, o.created_at, u.username
           FROM orders o JOIN users u USING (user_id) ORDER BY o.created_at DESC LIMIT 8`),
  ]);
  res.json({ totals: totals.rows[0], top_games: topGames.rows, by_genre: byGenre.rows, recent_orders: recent.rows });
}));

export default r;
