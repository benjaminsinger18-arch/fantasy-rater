import { Router } from 'express';
import * as yahoo from '../services/platforms/yahoo.js';
import crypto from 'crypto';

const router = Router();

// In-memory CSRF state store
const stateStore = new Map<string, number>();

// GET /api/auth/yahoo
router.get('/yahoo', (_req, res) => {
  const state = crypto.randomUUID();
  stateStore.set(state, Date.now() + 10 * 60 * 1000); // 10 min expiry

  const authUrl = yahoo.getAuthUrl(state);
  res.redirect(authUrl);
});

// GET /api/auth/yahoo/callback
router.get('/yahoo/callback', async (req, res) => {
  const { code, state } = req.query as { code: string; state: string };

  const expiry = stateStore.get(state);
  if (!expiry || Date.now() > expiry) {
    return res.status(400).send('Invalid or expired state parameter');
  }
  stateStore.delete(state);

  try {
    const { sessionId } = await yahoo.exchangeCode(code);
    const clientUrl = process.env.CLIENT_URL ?? 'http://localhost:5173';
    return res.redirect(`${clientUrl}/?yahoo_session=${sessionId}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Auth failed';
    return res.status(500).send(`Yahoo auth error: ${message}`);
  }
});

export default router;
