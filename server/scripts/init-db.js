// Creates all tables/views/triggers and loads sample data.
// Usage: npm run db:init          (schema + seed)
//        npm run db:init -- --no-seed   (schema only)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import 'dotenv/config';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (f) => fs.readFileSync(path.join(here, '..', 'db', f), 'utf8');

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  console.log('→ Applying schema.sql …');
  await client.query(read('schema.sql'));
  if (!process.argv.includes('--no-seed')) {
    console.log('→ Loading seed.sql …');
    await client.query(read('seed.sql'));
  }
  const { rows } = await client.query(
    `SELECT (SELECT COUNT(*) FROM users) users, (SELECT COUNT(*) FROM games) games,
            (SELECT COUNT(*) FROM orders) orders, (SELECT COUNT(*) FROM reviews) reviews`
  );
  console.log('✓ Database ready:', rows[0]);
} catch (err) {
  console.error('✗ Failed:', err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
