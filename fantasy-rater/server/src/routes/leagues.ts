import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import db from '../db.js';

const router = Router();

// GET /api/leagues — list all saved leagues for the user
router.get('/', requireAuth('free'), (req, res) => {
  const userId = req.userId!;
  const tier = req.userTier;

  const leagues = db.prepare(
    'SELECT * FROM saved_leagues WHERE clerk_user_id = ? ORDER BY is_primary DESC, created_at ASC'
  ).all(userId);

  return res.json({ leagues, tier });
});

// POST /api/leagues — save a new league
router.post('/', requireAuth('free'), (req, res) => {
  const userId = req.userId!;
  const tier = req.userTier;

  const { sport, platform, league_id, roster_id, team_name, scoring_format, league_size, espn_s2, swid } = req.body;

  if (!sport || !platform || !league_id) {
    return res.status(400).json({ error: 'sport, platform, and league_id are required' });
  }

  // Free users limited to 1 league
  if (tier !== 'pro') {
    const count = (db.prepare('SELECT COUNT(*) as c FROM saved_leagues WHERE clerk_user_id = ?').get(userId) as { c: number }).c;
    if (count >= 1) {
      return res.status(402).json({ error: 'upgrade_required', message: 'Free tier: 1 saved league. Upgrade to Pro for unlimited leagues.' });
    }
  }

  try {
    const existing = db.prepare('SELECT COUNT(*) as c FROM saved_leagues WHERE clerk_user_id = ?').get(userId) as { c: number };
    const isPrimary = existing.c === 0 ? 1 : 0;

    const result = db.prepare(`
      INSERT INTO saved_leagues (clerk_user_id, sport, platform, league_id, roster_id, team_name, scoring_format, league_size, espn_s2, swid, is_primary)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(clerk_user_id, platform, league_id) DO UPDATE SET
        roster_id = excluded.roster_id,
        team_name = excluded.team_name,
        scoring_format = excluded.scoring_format,
        league_size = excluded.league_size,
        espn_s2 = excluded.espn_s2,
        swid = excluded.swid
    `).run(userId, sport, platform, league_id, roster_id ?? null, team_name ?? null, scoring_format ?? 'PPR', league_size ?? 12, espn_s2 ?? null, swid ?? null, isPrimary);

    const saved = db.prepare('SELECT * FROM saved_leagues WHERE id = ?').get(result.lastInsertRowid);
    return res.json(saved);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
});

// PUT /api/leagues/:id — update a saved league (or set as primary)
router.put('/:id', requireAuth('free'), (req, res) => {
  const userId = req.userId!;
  const id = Number(req.params.id);
  const { team_name, roster_id, scoring_format, league_size, espn_s2, swid, is_primary } = req.body;

  const league = db.prepare('SELECT * FROM saved_leagues WHERE id = ? AND clerk_user_id = ?').get(id, userId);
  if (!league) return res.status(404).json({ error: 'League not found' });

  if (is_primary) {
    db.prepare('UPDATE saved_leagues SET is_primary = 0 WHERE clerk_user_id = ?').run(userId);
    db.prepare('UPDATE saved_leagues SET is_primary = 1 WHERE id = ?').run(id);
  } else {
    db.prepare(`
      UPDATE saved_leagues SET team_name = COALESCE(?, team_name), roster_id = COALESCE(?, roster_id),
        scoring_format = COALESCE(?, scoring_format), league_size = COALESCE(?, league_size),
        espn_s2 = COALESCE(?, espn_s2), swid = COALESCE(?, swid)
      WHERE id = ?
    `).run(team_name ?? null, roster_id ?? null, scoring_format ?? null, league_size ?? null, espn_s2 ?? null, swid ?? null, id);
  }

  const updated = db.prepare('SELECT * FROM saved_leagues WHERE id = ?').get(id);
  return res.json(updated);
});

// DELETE /api/leagues/:id — remove a saved league
router.delete('/:id', requireAuth('free'), (req, res) => {
  const userId = req.userId!;
  const id = Number(req.params.id);

  const league = db.prepare('SELECT * FROM saved_leagues WHERE id = ? AND clerk_user_id = ?').get(id, userId) as { is_primary: number } | undefined;
  if (!league) return res.status(404).json({ error: 'League not found' });

  db.prepare('DELETE FROM saved_leagues WHERE id = ?').run(id);

  // If we deleted the primary, promote the next one
  if (league.is_primary) {
    const next = db.prepare('SELECT id FROM saved_leagues WHERE clerk_user_id = ? ORDER BY created_at ASC LIMIT 1').get(userId) as { id: number } | undefined;
    if (next) db.prepare('UPDATE saved_leagues SET is_primary = 1 WHERE id = ?').run(next.id);
  }

  return res.json({ deleted: true });
});

export default router;
