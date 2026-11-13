import { Router } from 'express';
import { query } from '../db.js';
import { ah, HttpError } from '../middleware/errors.js';
import { requireAdmin } from '../middleware/auth.js';

/**
 * Builds a standard CRUD router for a simple lookup table.
 *   GET    /       list
 *   GET    /:id    one row (+ games that use it)
 *   POST   /       create   (admin)
 *   PUT    /:id    update   (admin)
 *   DELETE /:id    delete   (admin)
 *
 * Table/column names come from this code only (never from the request),
 * and all values are passed as $n parameters.
 */
export function crudRouter({ table, pk, fields, required = [], orderBy = 'name', gamesSql }) {
  const r = Router();

  r.get('/', ah(async (_req, res) => {
    const { rows } = await query(
      `SELECT t.*, (${gamesSql.count}) AS game_count FROM ${table} t ORDER BY ${orderBy}`
    );
    res.json(rows);
  }));

  r.get('/:id', ah(async (req, res) => {
    const { rows } = await query(`SELECT * FROM ${table} WHERE ${pk} = $1`, [Number(req.params.id)]);
    if (!rows[0]) throw new HttpError(404, 'Not found.');
    const games = await query(gamesSql.list, [Number(req.params.id)]);
    res.json({ ...rows[0], games: games.rows });
  }));

  r.post('/', requireAdmin, ah(async (req, res) => {
    for (const f of required) if (!req.body[f]) throw new HttpError(400, `${f} is required.`);
    const cols = fields.filter((f) => req.body[f] !== undefined && req.body[f] !== '');
    const { rows } = await query(
      `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
      cols.map((c) => req.body[c])
    );
    res.status(201).json(rows[0]);
  }));

  r.put('/:id', requireAdmin, ah(async (req, res) => {
    const cols = fields.filter((f) => req.body[f] !== undefined);
    if (!cols.length) throw new HttpError(400, 'Nothing to update.');
    const { rows } = await query(
      `UPDATE ${table} SET ${cols.map((c, i) => `${c} = $${i + 1}`).join(', ')} WHERE ${pk} = $${cols.length + 1} RETURNING *`,
      [...cols.map((c) => (req.body[c] === '' ? null : req.body[c])), Number(req.params.id)]
    );
    if (!rows[0]) throw new HttpError(404, 'Not found.');
    res.json(rows[0]);
  }));

  r.delete('/:id', requireAdmin, ah(async (req, res) => {
    const { rowCount } = await query(`DELETE FROM ${table} WHERE ${pk} = $1`, [Number(req.params.id)]);
    if (!rowCount) throw new HttpError(404, 'Not found.');
    res.status(204).end();
  }));

  return r;
}

const catalogBy = (col) => `SELECT game_id, title, final_price, cover_color FROM v_game_catalog WHERE ${col} = $1 ORDER BY title`;

export const developersRouter = crudRouter({
  table: 'developers', pk: 'developer_id',
  fields: ['name', 'country', 'founded_year', 'website'], required: ['name'],
  gamesSql: { count: 'SELECT COUNT(*) FROM games g WHERE g.developer_id = t.developer_id', list: catalogBy('developer_id') },
});

export const publishersRouter = crudRouter({
  table: 'publishers', pk: 'publisher_id',
  fields: ['name', 'country', 'website'], required: ['name'],
  gamesSql: { count: 'SELECT COUNT(*) FROM games g WHERE g.publisher_id = t.publisher_id', list: catalogBy('publisher_id') },
});

export const genresRouter = crudRouter({
  table: 'genres', pk: 'genre_id', fields: ['name'], required: ['name'],
  gamesSql: {
    count: 'SELECT COUNT(*) FROM game_genres gg WHERE gg.genre_id = t.genre_id',
    list: `SELECT c.game_id, c.title, c.final_price, c.cover_color FROM v_game_catalog c
           JOIN game_genres gg USING (game_id) WHERE gg.genre_id = $1 ORDER BY c.title`,
  },
});

export const platformsRouter = crudRouter({
  table: 'platforms', pk: 'platform_id', fields: ['name'], required: ['name'], orderBy: 'platform_id',
  gamesSql: {
    count: 'SELECT COUNT(*) FROM game_platforms gp WHERE gp.platform_id = t.platform_id',
    list: `SELECT c.game_id, c.title, c.final_price, c.cover_color FROM v_game_catalog c
           JOIN game_platforms gp USING (game_id) WHERE gp.platform_id = $1 ORDER BY c.title`,
  },
});
