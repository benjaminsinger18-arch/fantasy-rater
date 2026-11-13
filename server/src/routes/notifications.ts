import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import db from '../db.js';

const router = Router();

// GET /api/notifications/vapid-public-key — no auth needed (client needs this to subscribe)
router.get('/vapid-public-key', (_req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return res.status(503).json({ error: 'Push notifications not configured' });
  return res.json({ key });
});

// GET /api/notifications/preferences
router.get('/preferences', requireAuth('free'), async (req, res) => {
  const userId = req.userId!;
  let result = await db.execute({
    sql: 'SELECT * FROM user_prefs WHERE clerk_user_id = ?',
    args: [userId],
  });

  if (!result.rows[0]) {
    await db.execute({ sql: 'INSERT OR IGNORE INTO user_prefs (clerk_user_id) VALUES (?)', args: [userId] });
    result = await db.execute({ sql: 'SELECT * FROM user_prefs WHERE clerk_user_id = ?', args: [userId] });
  }

  return res.json(result.rows[0]);
});

// PUT /api/notifications/preferences
router.put('/preferences', requireAuth('free'), async (req, res) => {
  const userId = req.userId!;
  const { email_weekly_digest, email_injury_alerts, push_injury_alerts, push_waiver_reminders, email } = req.body;

  await db.execute({
    sql: `INSERT INTO user_prefs (clerk_user_id, email_weekly_digest, email_injury_alerts, push_injury_alerts, push_waiver_reminders, email)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(clerk_user_id) DO UPDATE SET
            email_weekly_digest = COALESCE(excluded.email_weekly_digest, email_weekly_digest),
            email_injury_alerts = COALESCE(excluded.email_injury_alerts, email_injury_alerts),
            push_injury_alerts = COALESCE(excluded.push_injury_alerts, push_injury_alerts),
            push_waiver_reminders = COALESCE(excluded.push_waiver_reminders, push_waiver_reminders),
            email = COALESCE(excluded.email, email),
            updated_at = unixepoch()`,
    args: [userId, email_weekly_digest ?? null, email_injury_alerts ?? null, push_injury_alerts ?? null, push_waiver_reminders ?? null, email ?? null],
  });

  const result = await db.execute({ sql: 'SELECT * FROM user_prefs WHERE clerk_user_id = ?', args: [userId] });
  return res.json(result.rows[0]);
});

// POST /api/notifications/push/subscribe
router.post('/push/subscribe', requireAuth('free'), async (req, res) => {
  const userId = req.userId!;
  const { endpoint, keys } = req.body;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'endpoint, keys.p256dh, and keys.auth are required' });
  }

  await db.execute({
    sql: `INSERT INTO push_subscriptions (clerk_user_id, endpoint, p256dh, auth)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(endpoint) DO UPDATE SET clerk_user_id = excluded.clerk_user_id`,
    args: [userId, endpoint, keys.p256dh, keys.auth],
  });

  return res.json({ subscribed: true });
});

// DELETE /api/notifications/push/subscribe
router.delete('/push/subscribe', requireAuth('free'), async (req, res) => {
  const userId = req.userId!;
  const { endpoint } = req.body;

  if (!endpoint) return res.status(400).json({ error: 'endpoint required' });

  await db.execute({
    sql: 'DELETE FROM push_subscriptions WHERE clerk_user_id = ? AND endpoint = ?',
    args: [userId, endpoint],
  });
  return res.json({ unsubscribed: true });
});

// POST /api/notifications/roster/save — save roster player IDs for injury monitoring
router.post('/roster/save', requireAuth('free'), async (req, res) => {
  const userId = req.userId!;
  const { platform, league_id, roster_id, sport, player_ids } = req.body;

  if (!platform || !league_id || !sport || !Array.isArray(player_ids)) {
    return res.status(400).json({ error: 'platform, league_id, sport, and player_ids are required' });
  }

  await db.execute({
    sql: `INSERT INTO saved_rosters (clerk_user_id, platform, league_id, roster_id, sport, player_ids, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, unixepoch())
          ON CONFLICT(clerk_user_id, platform, league_id) DO UPDATE SET
            player_ids = excluded.player_ids,
            roster_id = excluded.roster_id,
            updated_at = unixepoch()`,
    args: [userId, platform, league_id, roster_id ?? null, sport, JSON.stringify(player_ids)],
  });

  return res.json({ saved: true, count: player_ids.length });
});

export default router;
