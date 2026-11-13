/** Wraps an async route handler so thrown errors reach the error middleware. */
export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** An error with an HTTP status, thrown from route handlers. */
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Translates PostgreSQL error codes into friendly HTTP responses. */
export function errorHandler(err, _req, res, _next) {
  if (err.status) return res.status(err.status).json({ error: err.message });

  switch (err.code) {
    case '23505': // unique_violation
      return res.status(409).json({ error: `Already exists (${err.constraint || 'duplicate'}).` });
    case '23503': // foreign_key_violation
      return res.status(409).json({ error: 'This record is referenced by, or references, a missing record.' });
    case '23514': // check_violation (also raised by our triggers)
      return res.status(400).json({ error: err.message });
    case '22P02': // invalid_text_representation
      return res.status(400).json({ error: 'Invalid input format.' });
    case '23502': // not_null_violation
      return res.status(400).json({ error: `Missing required field: ${err.column}.` });
    default:
      console.error(err);
      return res.status(500).json({ error: 'Internal server error.' });
  }
}
