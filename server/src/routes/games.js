import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { ah, HttpError } from '../middleware/errors.js';
import { optionalAuth, requireAdmin } from '../middleware/auth.js';

const r = Router();

const SORTS = {
  relevance: 'owner_count DESC, review_count DESC, title',
  newest: 'release_date DESC NULLS LAST',
  price_asc: 'final_price ASC, title',
  price_desc: 'final_price DESC, title',
  rating: 'positive_pct DESC NULLS LAST, review_count DESC',
  name: 'title ASC',
  discount: 'discount_percent DESC, title',
};

// GET /api/games?q=&genre=&platform=&on_sale=&max_price=&sort=   — READ (list + search)
r.get('/', ah(async (req, res) => {
  const { q, genre, platform, on_sale, max_price, sort = 'relevance', include_unpublished } = req.query;
  const where = [];
  const params = [];
  // every "?" in a condition refers to the same (parameterised) value — no string concatenation of user input
  const add = (sql, val) => { params.push(val); where.push(sql.replaceAll('?', `$${params.length}`)); };

  if (!include_unpublished) where.push('is_published');
  if (q) add('(title ILIKE ? OR developer ILIKE ? OR publisher ILIKE ?)', `%${q}%`);
  if (genre) add('? = ANY(genres)', genre);
  if (platform) add('? = ANY(platforms)', platform);
  if (on_sale === 'true') where.push('discount_percent > 0');
  if (max_price) add('final_price <= ?', Number(max_price));

  const { rows } = await query(
    `SELECT *, review_label(positive_pct, review_count) AS review_summary
     FROM v_game_catalog
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY ${SORTS[sort] || SORTS.relevance}`,
    params
  );
  res.json(rows);
}));

// GET /api/games/:id  — READ one, with achievements and the viewer's ownership state
r.get('/:id', optionalAuth, ah(async (req, res) => {
  const id = Number(req.params.id);
  const { rows } = await query(
    `SELECT c.*, review_label(c.positive_pct, c.review_count) AS review_summary, g.description
     FROM v_game_catalog c JOIN games g USING (game_id) WHERE c.game_id = $1`,
    [id]
  );
  const game = rows[0];
  if (!game) throw new HttpError(404, 'Game not found.');

  const ach = await query(
    `SELECT a.*,
            ROUND(100.0 * COUNT(ua.user_id) / NULLIF((SELECT COUNT(*) FROM library WHERE game_id = $1), 0)) AS unlock_pct,
            COALESCE(BOOL_OR(ua.user_id = $2), FALSE) AS unlocked
     FROM achievements a LEFT JOIN user_achievements ua USING (achievement_id)
     WHERE a.game_id = $1 GROUP BY a.achievement_id ORDER BY a.achievement_id`,
    [id, req.user?.user_id ?? null]
  );
  game.achievements = ach.rows;

  game.viewer = null;
  if (req.user) {
    const v = await query(
      `SELECT EXISTS(SELECT 1 FROM library    WHERE user_id=$1 AND game_id=$2) AS owned,
              EXISTS(SELECT 1 FROM wishlist   WHERE user_id=$1 AND game_id=$2) AS wishlisted,
              EXISTS(SELECT 1 FROM cart_items WHERE user_id=$1 AND game_id=$2) AS in_cart,
              (SELECT review_id FROM reviews  WHERE user_id=$1 AND game_id=$2) AS my_review_id`,
      [req.user.user_id, id]
    );
    game.viewer = v.rows[0];
  }
  res.json(game);
}));

// helper: replace the genre/platform links of a game
async function setLinks(client, gameId, genreIds, platformIds) {
  if (Array.isArray(genreIds)) {
    await client.query('DELETE FROM game_genres WHERE game_id = $1', [gameId]);
    if (genreIds.length)
      await client.query(
        'INSERT INTO game_genres (game_id, genre_id) SELECT $1, UNNEST($2::int[])', [gameId, genreIds]);
  }
  if (Array.isArray(platformIds)) {
    await client.query('DELETE FROM game_platforms WHERE game_id = $1', [gameId]);
    if (platformIds.length)
      await client.query(
        'INSERT INTO game_platforms (game_id, platform_id) SELECT $1, UNNEST($2::int[])', [gameId, platformIds]);
  }
}

const GAME_FIELDS = ['title', 'short_description', 'description', 'price', 'discount_percent', 'release_date',
  'age_rating', 'developer_id', 'publisher_id', 'cover_color', 'is_published'];

// POST /api/games  — CREATE (admin)
r.post('/', requireAdmin, ah(async (req, res) => {
  const b = req.body;
  if (!b.title || !b.short_description || b.price === undefined)
    throw new HttpError(400, 'Title, short description and price are required.');
  const game = await withTransaction(async (client) => {
    const cols = GAME_FIELDS.filter((f) => b[f] !== undefined && b[f] !== '');
    const { rows } = await client.query(
      `INSERT INTO games (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
      cols.map((c) => b[c])
    );
    await setLinks(client, rows[0].game_id, b.genre_ids, b.platform_ids);
    return rows[0];
  });
  res.status(201).json(game);
}));

// PUT /api/games/:id  — UPDATE (admin)
r.put('/:id', requireAdmin, ah(async (req, res) => {
  const b = req.body;
  const id = Number(req.params.id);
  const game = await withTransaction(async (client) => {
    const cols = GAME_FIELDS.filter((f) => b[f] !== undefined);
    let row;
    if (cols.length) {
      const { rows } = await client.query(
        `UPDATE games SET ${cols.map((c, i) => `${c} = $${i + 1}`).join(', ')}
         WHERE game_id = $${cols.length + 1} RETURNING *`,
        [...cols.map((c) => (b[c] === '' ? null : b[c])), id]
      );
      row = rows[0];
    } else {
      row = (await client.query('SELECT * FROM games WHERE game_id = $1', [id])).rows[0];
    }
    if (!row) throw new HttpError(404, 'Game not found.');
    await setLinks(client, id, b.genre_ids, b.platform_ids);
    return row;
  });
  res.json(game);
}));

// DELETE /api/games/:id  — DELETE (admin). Games that were sold are unpublished instead.
r.delete('/:id', requireAdmin, ah(async (req, res) => {
  const id = Number(req.params.id);
  const sold = await query('SELECT 1 FROM order_items WHERE game_id = $1 LIMIT 1', [id]);
  if (sold.rowCount) {
    await query('UPDATE games SET is_published = FALSE WHERE game_id = $1', [id]);
    return res.json({ unpublished: true, message: 'Game has sales history, so it was unpublished instead of deleted.' });
  }
  const { rowCount } = await query('DELETE FROM games WHERE game_id = $1', [id]);
  if (!rowCount) throw new HttpError(404, 'Game not found.');
  res.status(204).end();
}));

// GET /api/games/:id/edit — raw row + link ids for the admin form
r.get('/:id/edit', requireAdmin, ah(async (req, res) => {
  const id = Number(req.params.id);
  const { rows } = await query(
    `SELECT g.*,
       COALESCE((SELECT ARRAY_AGG(genre_id) FROM game_genres WHERE game_id = g.game_id), '{}') AS genre_ids,
       COALESCE((SELECT ARRAY_AGG(platform_id) FROM game_platforms WHERE game_id = g.game_id), '{}') AS platform_ids
     FROM games g WHERE game_id = $1`, [id]);
  if (!rows[0]) throw new HttpError(404, 'Game not found.');
  res.json(rows[0]);
}));

export default r;
