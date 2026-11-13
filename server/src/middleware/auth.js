import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'dev-secret';

export const signToken = (user) =>
  jwt.sign({ user_id: user.user_id, username: user.username, is_admin: user.is_admin }, SECRET, {
    expiresIn: '7d',
  });

/** Reads "Authorization: Bearer <token>" if present; never rejects. */
export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      req.user = jwt.verify(token, SECRET);
    } catch {
      /* ignore bad token for optional routes */
    }
  }
  next();
}

/** Rejects with 401 unless a valid token is present. */
export function requireAuth(req, res, next) {
  optionalAuth(req, res, () => {
    if (!req.user) return res.status(401).json({ error: 'Please log in first.' });
    next();
  });
}

/** Rejects with 403 unless the user is an admin. */
export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (!req.user.is_admin) return res.status(403).json({ error: 'Admin only.' });
    next();
  });
}
