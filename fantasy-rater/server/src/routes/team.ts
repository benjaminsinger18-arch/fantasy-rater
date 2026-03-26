import { Router } from 'express';
import { scoreTeam, MLB_POSITION_BASE } from '../services/rater.js';
import { buildTeamPrompt, storePrompt } from '../services/claude.js';
import type { RaterPlayer } from '../services/rater.js';
import crypto from 'crypto';
import * as sleeper from '../services/platforms/sleeper.js';
import * as fplApi from '../services/platforms/fpl.js';
import * as espnApi from '../services/platforms/espn.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { checkUsage } from '../middleware/usageLimit.js';

const router = Router();

// POST /api/team/rate  — manual roster entry
router.post('/rate', requireAuth('free'), checkUsage('team', 2), (req, res) => {
  const { roster, sport = 'nfl', scoringFormat = 'PPR', week = 1 } = req.body as {
    roster: RaterPlayer[];
    sport?: string;
    scoringFormat?: string;
    week?: number;
  };

  if (!roster?.length) {
    return res.status(400).json({ error: 'Roster must have at least one player' });
  }

  const teamScore = scoreTeam(roster);
  const prompt = buildTeamPrompt({
    sport, scoringFormat, week, roster,
    overallScore: teamScore.score,
    overallGrade: teamScore.grade,
    positionBreakdown: teamScore.positionBreakdown,
  });
  const hash = crypto.createHash('sha256').update(prompt).digest('hex').slice(0, 16);
  storePrompt(hash, prompt);

  return res.json({ ...teamScore, analysisHash: hash });
});

// GET /api/team/import/sleeper?leagueId=X&rosterId=1
router.get('/import/sleeper', requireAuth('pro'), async (req, res) => {
  const { leagueId, rosterId } = req.query as { leagueId: string; rosterId: string };
  if (!leagueId) return res.status(400).json({ error: 'leagueId required' });

  try {
    const [rosters, allPlayers] = await Promise.all([
      sleeper.getRosters(leagueId),
      sleeper.getAllPlayers(),
    ]);

    const targetRoster = rosterId
      ? rosters.find(r => r.roster_id === Number(rosterId))
      : rosters[0];

    if (!targetRoster) return res.status(404).json({ error: 'Roster not found' });

    const POSITION_BASE: Record<string, number> = {
      QB: 45, RB: 38, WR: 36, TE: 30, K: 20, DEF: 20,
    };

    const rosterPlayers: RaterPlayer[] = targetRoster.players
      .map(id => {
        const p = allPlayers[id];
        if (!p) return null;
        return {
          id: id,
          espnId: p.espn_id ? Number(p.espn_id) : undefined,
          rotowireId: p.rotowire_id ?? undefined,
          name: p.full_name,
          position: p.position,
          team: p.team ?? 'FA',
          injuryStatus: p.injury_status,
          rank: p.search_rank
            ? Math.round(Math.max(5, 100 / (1 + p.search_rank / 30)))
            : (POSITION_BASE[p.position] ?? 25),
        } as RaterPlayer;
      })
      .filter(Boolean) as RaterPlayer[];

    return res.json({ rosters: rosters.map(r => ({ id: r.roster_id, players: r.players.length })), roster: rosterPlayers });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
});

// GET /api/team/import/fpl?managerId=X&gameweek=Y
router.get('/import/fpl', requireAuth('pro'), async (req, res) => {
  const { managerId, gameweek } = req.query as { managerId: string; gameweek?: string };
  if (!managerId) return res.status(400).json({ error: 'managerId required' });

  try {
    const gw = gameweek ? Number(gameweek) : await fplApi.getCurrentGameweek();
    const [picks, bootstrap] = await Promise.all([
      fplApi.getManagerTeam(Number(managerId), gw),
      fplApi.getBootstrap(),
    ]);

    const playerMap = Object.fromEntries(bootstrap.elements.map((e) => [e.id, e]));
    const teamMap = Object.fromEntries(bootstrap.teams.map((t) => [t.id, t.short_name]));
    const posMap: Record<number, string> = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' };

    const roster: RaterPlayer[] = picks.picks.map((pick: { element: number }) => {
      const el = playerMap[pick.element];
      const epNext = Number(el.ep_next) || 0;
      const form = Number(el.form) || 0;
      return {
        name: `${el.first_name} ${el.second_name}`,
        position: posMap[el.element_type],
        team: teamMap[el.team],
        injuryStatus: el.chance_of_playing_next_round !== null && el.chance_of_playing_next_round < 50 ? 'Doubtful' : null,
        form,
        epNext,
        rank: Math.min(97, Math.max(5, Math.round(epNext * 5 + form * 2 + el.total_points * 0.1))),
        total_points: el.total_points,
        selected_by_percent: el.selected_by_percent,
        now_cost: el.now_cost / 10,
        photoCode: el.code,
      } as RaterPlayer;
    });

    return res.json({ roster, gameweek: gw });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
});

// GET /api/team/import/espn?leagueId=X&rosterId=1&sport=mlb&espnS2=...&swid=...
router.get('/import/espn', requireAuth('pro'), async (req, res) => {
  const { leagueId, rosterId, sport = 'mlb', espnS2, swid, week = '1' } = req.query as Record<string, string>;
  if (!leagueId) return res.status(400).json({ error: 'leagueId required' });

  const MLB_POS_MAP: Record<number, string> = { 1: 'SP', 2: 'C', 3: '1B', 4: '2B', 5: '3B', 6: 'SS', 7: 'OF', 8: 'OF', 9: 'OF', 10: 'DH', 11: 'RP', 12: 'UTIL' };
  const NFL_POS_MAP: Record<number, string> = { 1: 'QB', 2: 'RB', 3: 'WR', 4: 'TE', 5: 'K', 16: 'DEF' };

  try {
    const leagueData = await espnApi.getLeagueRosters(leagueId, sport as 'nfl' | 'mlb', Number(week) || 1, espnS2, swid);
    const teams: any[] = leagueData.teams ?? [];
    const targetTeam = rosterId
      ? teams.find((t: any) => String(t.id) === rosterId)
      : teams[0];

    if (!targetTeam) return res.status(404).json({ error: 'Roster not found' });

    const posMap = sport === 'mlb' ? MLB_POS_MAP : NFL_POS_MAP;
    const POSITION_BASE: Record<string, number> = { QB: 45, RB: 38, WR: 36, TE: 30, K: 20, DEF: 20, ...MLB_POSITION_BASE };

    const rosterPlayers: RaterPlayer[] = (targetTeam.roster?.entries ?? []).map((entry: any) => {
      const pool = entry.playerPoolEntry ?? {};
      const p = pool.player ?? {};
      const pos = posMap[p.defaultPositionId] ?? 'UTIL';
      const injuryStatus = pool.injuryStatus && pool.injuryStatus !== 'ACTIVE'
        ? (pool.injuryStatus as string).toLowerCase() : null;
      return {
        id: String(p.id),
        name: p.fullName ?? '',
        position: pos,
        team: p.proTeam?.abbrev ?? 'FA',
        injuryStatus,
        rank: POSITION_BASE[pos] ?? 25,
      } as RaterPlayer;
    }).filter((p: RaterPlayer) => p.name);

    return res.json({ rosters: teams.map((t: any) => ({ id: t.id, players: (t.roster?.entries ?? []).length })), roster: rosterPlayers });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
});

export default router;
