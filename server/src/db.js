import pg from 'pg';
import 'dotenv/config';

// Return NUMERIC columns as JS numbers instead of strings (fine for prices at this scale)
pg.types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));
// Return COUNT(*) (bigint) as numbers
pg.types.setTypeParser(20, (v) => (v === null ? null : parseInt(v, 10)));
// Return DATE columns as plain 'YYYY-MM-DD' strings (avoid timezone shifts)
pg.types.setTypeParser(1082, (v) => v);

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

export const query = (text, params) => pool.query(text, params);

/** Run `fn(client)` inside a BEGIN/COMMIT transaction; rolls back on any error. */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
