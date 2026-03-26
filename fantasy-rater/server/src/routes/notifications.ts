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
router.get('/preferences', requireAuth('free'), (req, res) => {
  const userId = req.userId!;
  let prefs = db.prepare('SELECT * FROM user_prefs WHERE clerk_user_id = ?').get(userId) as Record<string, unknown> | undefined;

  if (!prefs) {
    db.prepare(`
      INSERT OR IGNORE INTO user_prefs (clerk_user_id) VALUES (?)
    `).run(userId);
    prefs = db.prepare('SELECT * FROM user_prefs WHERE clerk_user_id = ?').get(userId) as Record<string, unknown>;
  }

  return res.json(prefs);
});

// PUT /api/notifications/preferences
router.put('/preferences', requireAuth('free'), (req, res) => {
  const userId = req.userId!;
  const { email_weekly_digest, email_injury_alerts, push_injury_alerts, push_waiver_reminders, email } = req.body;

  db.prepare(`
    INSERT INTO user_prefs (clerk_user_id, email_weekly_digest, email_injury_alerts, push_injury_alerts, push_waiver_reminders, email)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(clerk_user_id) DO UPDATE SET
      email_weekly_digest = COALESCE(excluded.email_weekly_digest, email_weekly_digest),
      email_injury_alerts = COALESCE(excluded.email_injury_alerts, email_injury_alerts),
      push_injury_alerts = COALESCE(excluded.push_injury_alerts, push_injury_alerts),
      push_waiver_reminders = COALESCE(excluded.push_waiver_reminders, push_waiver_reminders),
      email = COALESCE(excluded.email, email),
      updated_at = unixepoch()
  `).run(
    userId,
    email_weekly_digest ?? null,
    email_injury_alerts ?? null,
    push_injury_alerts ?? null,
    push_waiver_reminders ?? null,
    email ?? null
  );

  const prefs = db.prepare('SELECT * FROM user_prefs WHERE clerk_user_id = ?').get(userId);
  return res.json(prefs);
});

// POST /api/notifications/push/subscribe
router.post('/push/subscribe', requireAuth('free'), (req, res) => {
  const userId = req.userId!;
  const { endpoint, keys } = req.body;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: 'endpoint, keys.p256dh, and keys.auth are required' });
  }

  db.prepare(`
    INSERT INTO push_subscriptions (clerk_user_id, endpoint, p256dh, auth)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET clerk_user_id = excluded.clerk_user_id
  `).run(userId, endpoint, keys.p256dh, keys.auth);

  return res.json({ subscribed: true });
});

// DELETE /api/notifications/push/subscribe
router.delete('/push/subscribe', requireAuth('free'), (req, res) => {
  const userId = req.userId!;
  const { endpoint } = req.body;

  if (!endpoint) return res.status(400).json({ error: 'endpoint required' });

  db.prepare('DELETE FROM push_subscriptions WHERE clerk_user_id = ? AND endpoint = ?').run(userId, endpoint);
  return res.json({ unsubscribed: true });
});

// POST /api/notifications/roster/save — save roster player IDs for injury monitoring
router.post('/roster/save', requireAuth('free'), (req, res) => {
  const userId = req.userId!;
  const { platform, league_id, roster_id, sport, player_ids } = req.body;

  if (!platform || !league_id || !sport || !Array.isArray(player_ids)) {
    return res.status(400).json({ error: 'platform, league_id, sport, and player_ids are required' });
  }

  db.prepare(`
    INSERT INTO saved_rosters (clerk_user_id, platform, league_id, roster_id, sport, player_ids, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, unixepoch())
    ON CONFLICT(clerk_user_id, platform, league_id) DO UPDATE SET
      player_ids = excluded.player_ids,
      roster_id = excluded.roster_id,
      updated_at = unixepoch()
  `).run(userId, platform, league_id, roster_id ?? null, sport, JSON.stringify(player_ids));

  return res.json({ saved: true, count: player_ids.length });
});

export default router;
