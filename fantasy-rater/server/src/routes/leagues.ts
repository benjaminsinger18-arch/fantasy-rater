import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import db from '../db.js';

const router = Router();

// GET /api/leagues — list all saved leagues for the user
router.get('/', requireAuth('free'), async (req, res) => {
  const userId = req.userId!;
  const tier = req.userTier;

  const result = await db.execute({
    sql: 'SELECT * FROM saved_leagues WHERE clerk_user_id = ? ORDER BY is_primary DESC, created_at ASC',
    args: [userId],
  });

  return res.json({ leagues: result.rows, tier });
});

// POST /api/leagues — save a new league
router.post('/', requireAuth('free'), async (req, res) => {
  const userId = req.userId!;
  const tier = req.userTier;

  const { sport, platform, league_id, roster_id, team_name, scoring_format, league_size, espn_s2, swid } = req.body;

  if (!sport || !platform || !league_id) {
    return res.status(400).json({ error: 'sport, platform, and league_id are required' });
  }

  // Free users limited to 1 league
  if (tier !== 'pro') {
    const countResult = await db.execute({
      sql: 'SELECT COUNT(*) as c FROM saved_leagues WHERE clerk_user_id = ?',
      args: [userId],
    });
    const count = Number(countResult.rows[0]?.c ?? 0);
    if (count >= 1) {
      return res.status(402).json({ error: 'upgrade_required', message: 'Free tier: 1 saved league. Upgrade to Pro for unlimited leagues.' });
    }
  }

  try {
    const existingResult = await db.execute({
      sql: 'SELECT COUNT(*) as c FROM saved_leagues WHERE clerk_user_id = ?',
      args: [userId],
    });
    const isPrimary = Number(existingResult.rows[0]?.c ?? 0) === 0 ? 1 : 0;

    const insertResult = await db.execute({
      sql: `INSERT INTO saved_leagues (clerk_user_id, sport, platform, league_id, roster_id, team_name, scoring_format, league_size, espn_s2, swid, is_primary)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(clerk_user_id, platform, league_id) DO UPDATE SET
              roster_id = excluded.roster_id,
              team_name = excluded.team_name,
              scoring_format = excluded.scoring_format,
              league_size = excluded.league_size,
              espn_s2 = excluded.espn_s2,
              swid = excluded.swid`,
      args: [userId, sport, platform, league_id, roster_id ?? null, team_name ?? null, scoring_format ?? 'PPR', league_size ?? 12, espn_s2 ?? null, swid ?? null, isPrimary],
    });

    const savedResult = await db.execute({
      sql: 'SELECT * FROM saved_leagues WHERE id = ?',
      args: [insertResult.lastInsertRowid!],
    });
    return res.json(savedResult.rows[0]);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
});

// PUT /api/leagues/:id — update a saved league (or set as primary)
router.put('/:id', requireAuth('free'), async (req, res) => {
  const userId = req.userId!;
  const id = Number(req.params.id);
  const { team_name, roster_id, scoring_format, league_size, espn_s2, swid, is_primary } = req.body;

  const leagueResult = await db.execute({
    sql: 'SELECT * FROM saved_leagues WHERE id = ? AND clerk_user_id = ?',
    args: [id, userId],
  });
  if (!leagueResult.rows[0]) return res.status(404).json({ error: 'League not found' });

  if (is_primary) {
    await db.execute({ sql: 'UPDATE saved_leagues SET is_primary = 0 WHERE clerk_user_id = ?', args: [userId] });
    await db.execute({ sql: 'UPDATE saved_leagues SET is_primary = 1 WHERE id = ?', args: [id] });
  } else {
    await db.execute({
      sql: `UPDATE saved_leagues SET team_name = COALESCE(?, team_name), roster_id = COALESCE(?, roster_id),
              scoring_format = COALESCE(?, scoring_format), league_size = COALESCE(?, league_size),
              espn_s2 = COALESCE(?, espn_s2), swid = COALESCE(?, swid)
            WHERE id = ?`,
      args: [team_name ?? null, roster_id ?? null, scoring_format ?? null, league_size ?? null, espn_s2 ?? null, swid ?? null, id],
    });
  }

  const updatedResult = await db.execute({ sql: 'SELECT * FROM saved_leagues WHERE id = ?', args: [id] });
  return res.json(updatedResult.rows[0]);
});

// DELETE /api/leagues/:id — remove a saved league
router.delete('/:id', requireAuth('free'), async (req, res) => {
  const userId = req.userId!;
  const id = Number(req.params.id);

  const leagueResult = await db.execute({
    sql: 'SELECT * FROM saved_leagues WHERE id = ? AND clerk_user_id = ?',
    args: [id, userId],
  });
  const league = leagueResult.rows[0];
  if (!league) return res.status(404).json({ error: 'League not found' });

  await db.execute({ sql: 'DELETE FROM saved_leagues WHERE id = ?', args: [id] });

  if (league.is_primary) {
    const nextResult = await db.execute({
      sql: 'SELECT id FROM saved_leagues WHERE clerk_user_id = ? ORDER BY created_at ASC LIMIT 1',
      args: [userId],
    });
    const next = nextResult.rows[0];
    if (next) {
      await db.execute({ sql: 'UPDATE saved_leagues SET is_primary = 1 WHERE id = ?', args: [next.id] });
    }
  }

  return res.json({ deleted: true });
});

export default router;
