import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { getMatchup } from '../services/platforms/sleeper.js';

const router = Router();

// GET /api/live/matchup?leagueId=&week=&rosterId=
// Free — no usage limit, called every 90s during game day
router.get('/matchup', requireAuth('free'), async (req, res) => {
  const { leagueId, week, rosterId } = req.query as Record<string, string>;
  if (!leagueId || !week || !rosterId) {
    return res.status(400).json({ error: 'leagueId, week, and rosterId are required' });
  }

  try {
    const data = await getMatchup(leagueId, Number(week), Number(rosterId));
    return res.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch matchup';
    return res.status(500).json({ error: msg });
  }
});

export default router;
