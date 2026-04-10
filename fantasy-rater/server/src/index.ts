import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import playersRouter from './routes/players.js';
import tradeRouter from './routes/trade.js';
import teamRouter from './routes/team.js';
import analyzeRouter from './routes/analyze.js';
import authRouter from './routes/auth.js';
import leagueRouter from './routes/league.js';
import billingRouter from './routes/billing.js';
import leaguesRouter from './routes/leagues.js';
import startsitRouter from './routes/startsit.js';
import waiverRouter from './routes/waiver.js';
import draftRouter from './routes/draft.js';
import notificationsRouter from './routes/notifications.js';
import liveRouter from './routes/live.js';
import lineupRouter from './routes/lineup.js';
import chatRouter from './routes/chat.js';
import matchupRouter from './routes/matchup.js';

import { startPlayerRefresh } from './services/platforms/sleeper.js';
import { startCronJobs } from './services/cron.js';
import './db.js'; // Initialize database on startup

const app = express();
const PORT = process.env.PORT ?? 3001;

app.set('trust proxy', 1);
app.use(helmet());

app.use(cors({
  origin: (origin, cb) => {
    const allowed = [
      process.env.CLIENT_URL,
      'http://localhost:5173',
    ].filter(Boolean);
    if (!origin || allowed.some(o => origin === o) || /\.vercel\.app$/.test(origin) || /raterzone\.xyz$/.test(origin)) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed by CORS'));
    }
  },
}));

// Raw body parser for Stripe webhooks — must come BEFORE express.json()
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '1mb' }));

// Global rate limit
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 60 : 2000,
  standardHeaders: true,
  legacyHeaders: false,
}));

// Tighter limit for /photo — each request makes up to 3 external HTTP calls
const photoLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many photo requests, please slow down' },
});
app.use('/api/players/photo', photoLimiter);

app.use('/api/players', playersRouter);
app.use('/api/trade', tradeRouter);
app.use('/api/team', teamRouter);
app.use('/api/analyze', analyzeRouter);
app.use('/api/auth', authRouter);
app.use('/api/league', leagueRouter);
app.use('/api/billing', billingRouter);
app.use('/api/leagues', leaguesRouter);
app.use('/api/startsit', startsitRouter);
app.use('/api/waiver', waiverRouter);
app.use('/api/draft', draftRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/live', liveRouter);
app.use('/api/lineup', lineupRouter);
app.use('/api/chat', chatRouter);
app.use('/api/matchup', matchupRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  const msg = process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message ?? 'Internal server error');
  res.status(500).json({ error: msg });
});

app.listen(PORT, () => {
  console.log(`Fantasy Rater API running on http://localhost:${PORT}`);
  startPlayerRefresh();
  startCronJobs();
});
