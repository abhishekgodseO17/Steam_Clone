import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { ah, HttpError } from '../middleware/errors.js';
import { requireAuth, signToken } from '../middleware/auth.js';

const r = Router();

const PUBLIC_USER_COLS = `user_id, username, email, display_name, country, bio, wallet_balance, is_admin, created_at`;

// POST /api/auth/register  — CREATE user
r.post('/register', ah(async (req, res) => {
  const { username, email, password, display_name, country } = req.body;
  if (!username || !email || !password) throw new HttpError(400, 'Username, email and password are required.');
  if (password.length < 6) throw new HttpError(400, 'Password must be at least 6 characters.');
  const hash = await bcrypt.hash(password, 10);
  const { rows } = await query(
    `INSERT INTO users (username, email, password_hash, display_name, country)
     VALUES ($1, $2, $3, $4, $5) RETURNING ${PUBLIC_USER_COLS}`,
    [username, email.toLowerCase(), hash, display_name || username, country || null]
  );
  res.status(201).json({ user: rows[0], token: signToken(rows[0]) });
}));

// POST /api/auth/login
r.post('/login', ah(async (req, res) => {
  const { username, password } = req.body;
  const { rows } = await query(
    `SELECT *, password_hash FROM users WHERE username = $1 OR email = LOWER($1)`,
    [username || '']
  );
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password || '', user.password_hash)))
    throw new HttpError(401, 'Wrong username or password.');
  delete user.password_hash;
  res.json({ user, token: signToken(user) });
}));

// GET /api/auth/me
r.get('/me', requireAuth, ah(async (req, res) => {
  const { rows } = await query(`SELECT ${PUBLIC_USER_COLS} FROM users WHERE user_id = $1`, [req.user.user_id]);
  if (!rows[0]) throw new HttpError(404, 'User not found.');
  res.json(rows[0]);
}));

export default r;
