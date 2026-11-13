import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { pool } from './db.js';
import { errorHandler } from './middleware/errors.js';
import authRoutes from './routes/auth.js';
import gameRoutes from './routes/games.js';
import storeRoutes from './routes/store.js';
import communityRoutes from './routes/community.js';
import { developersRouter, publishersRouter, genresRouter, platformsRouter } from './routes/crudFactory.js';

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',') || true }));
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', async (_req, res) => {
  const { rows } = await pool.query('SELECT NOW() AS db_time');
  res.json({ ok: true, ...rows[0] });
});

app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/developers', developersRouter);
app.use('/api/publishers', publishersRouter);
app.use('/api/genres', genresRouter);
app.use('/api/platforms', platformsRouter);
app.use('/api', communityRoutes);  // reviews, users, friends, achievements admin, admin stats
app.use('/api', storeRoutes);      // cart, checkout, orders, library, wishlist (login required)

app.use('/api', (_req, res) => res.status(404).json({ error: 'Unknown API route.' }));
app.use(errorHandler);

export default app;

const port = Number(process.env.PORT) || 4000;
if (process.env.VERCEL !== '1') {
  app.listen(port, () => console.log(`Vapor API listening on http://localhost:${port}`));
}
