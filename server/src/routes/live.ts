import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { getMatchup } from '../services/platforms/sleeper.js';
import * as fplApi from '../services/platforms/fpl.js';

const router = Router();

// GET /api/live/matchup?leagueId=&week=&rosterId=&sport=
router.get('/matchup', requireAuth('free'), async (req, res) => {
  const { leagueId, week, rosterId, sport = 'nfl' } = req.query as Record<string, string>;

  if (sport === 'fpl') {
    if (!leagueId || !week) {
      return res.status(400).json({ error: 'leagueId (manager ID) and week required for FPL' });
    }
    try {
      const data = await handleFplLive(Number(leagueId), Number(week));
      return res.json(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch FPL live score';
      return res.status(500).json({ error: msg });
    }
  }

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

const POSITION_MAP: Record<number, string> = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' };

async function handleFplLive(managerId: number, gw: number) {
  const [picks, livePoints, bootstrap] = await Promise.all([
    fplApi.getManagerTeam(managerId, gw),
    fplApi.getLiveEventPoints(gw),
    fplApi.getBootstrap(),
  ]);

  const playerMap = Object.fromEntries(bootstrap.elements.map((e: { id: number }) => [e.id, e])) as unknown as Record<number, { first_name: string; second_name: string; element_type: number; team: number } | undefined>;
  const teamMap = Object.fromEntries(bootstrap.teams.map((t: { id: number; short_name: string }) => [t.id, t.short_name]));

  const picksArr: Array<{ element: number; position: number; multiplier: number }> = picks.picks ?? [];

  const players = picksArr
    .map(pick => {
      const el = playerMap[pick.element];
      if (!el) return null;
      const rawPts = livePoints[pick.element] ?? 0;
      return {
        id: String(pick.element),
        name: `${el.first_name} ${el.second_name}`,
        position: POSITION_MAP[el.element_type] ?? '?',
        team: teamMap[el.team] ?? 'UNK',
        points: rawPts * pick.multiplier,
        isStarter: pick.position <= 11,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  const totalPoints = players
    .filter(p => p.isStarter)
    .reduce((sum, p) => sum + p.points, 0);

  return {
    mine: { rosterId: managerId, matchupId: gw, totalPoints, players },
    opponent: null,
  };
}

export default router;
