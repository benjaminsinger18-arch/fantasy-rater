import { Router } from 'express';
import crypto from 'crypto';
import * as sleeper from '../services/platforms/sleeper.js';
import * as fplApi from '../services/platforms/fpl.js';
import * as espn from '../services/platforms/espn.js';
import { scoreTeam, scorePlayer, MLB_POSITION_BASE } from '../services/rater.js';
import { storePrompt } from '../services/claude.js';
import type { RaterPlayer } from '../services/rater.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

const VALID_SPORTS = new Set(['nfl', 'mlb', 'fpl', 'ipl', 'nba']);

const POSITION_BASE: Record<string, number> = {
  QB: 45, RB: 38, WR: 36, TE: 30, K: 20, DEF: 20,
  ...MLB_POSITION_BASE,
};

function rankToValue(rank: number | null | undefined, position: string): number {
  if (rank && rank > 0) return Math.round(Math.max(5, 100 / (1 + rank / 30)));
  return POSITION_BASE[position?.toUpperCase()] ?? 25;
}

// GET /api/waiver/recommendations
router.get('/recommendations', requireAuth('pro'), async (req, res) => {
  const { sport = 'nfl', platform = 'sleeper', leagueId, rosterId, scoringFormat = 'PPR', week = '1', espnS2, swid } = req.query as Record<string, string>;

  if (!leagueId) return res.status(400).json({ error: 'leagueId required' });
  if (!VALID_SPORTS.has(sport.toLowerCase())) return res.status(400).json({ error: 'Invalid sport' });

  try {
    let myRoster: RaterPlayer[] = [];

    if (sport === 'fpl') {
      // FPL: rosterId is managerId
      const gw = Number(week) || await fplApi.getCurrentGameweek();
      const [picks, bootstrap] = await Promise.all([
        fplApi.getManagerTeam(Number(rosterId || leagueId), gw),
        fplApi.getBootstrap(),
      ]);
      type FplElement = { id: number; first_name: string; second_name: string; element_type: number; team: number; chance_of_playing_next_round: number | null; form: string; ep_next: string; total_points: number };
      const playerMap = Object.fromEntries(bootstrap.elements.map((e: FplElement) => [e.id, e]));
      const teamMap = Object.fromEntries(bootstrap.teams.map((t: { id: number; short_name: string }) => [t.id, t.short_name]));
      const posMap: Record<number, string> = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' };

      myRoster = picks.picks.map((pick: { element: number }) => {
        const el = playerMap[pick.element] as FplElement;
        return {
          name: `${el.first_name} ${el.second_name}`,
          position: posMap[el.element_type],
          team: teamMap[el.team],
          injuryStatus: el.chance_of_playing_next_round !== null && el.chance_of_playing_next_round < 50 ? 'Doubtful' : null,
          form: Number(el.form) || 0,
          epNext: Number(el.ep_next) || 0,
          rank: Math.min(97, Math.max(5, Math.round(Number(el.ep_next) * 5 + Number(el.form) * 2 + el.total_points * 0.1))),
        } as RaterPlayer;
      });
    } else if (sport === 'mlb' || platform === 'espn') {
      // ESPN (MLB or NFL ESPN leagues)
      const leagueData = await espn.getLeagueRosters(leagueId, sport as 'nfl' | 'mlb', Number(week) || 1, espnS2, swid);
      const teams: any[] = leagueData.teams ?? [];
      const targetTeam = rosterId
        ? teams.find((t: any) => String(t.id) === rosterId)
        : teams[0];

      if (!targetTeam) return res.status(404).json({ error: 'Roster not found' });

      const MLB_POS_MAP: Record<number, string> = { 1: 'SP', 2: 'C', 3: '1B', 4: '2B', 5: '3B', 6: 'SS', 7: 'OF', 8: 'OF', 9: 'OF', 10: 'DH', 11: 'RP', 12: 'UTIL' };
      const NFL_POS_MAP: Record<number, string> = { 1: 'QB', 2: 'RB', 3: 'WR', 4: 'TE', 5: 'K', 16: 'DEF' };
      const posMap = sport === 'mlb' ? MLB_POS_MAP : NFL_POS_MAP;

      myRoster = (targetTeam.roster?.entries ?? []).map((entry: any) => {
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
          rank: rankToValue(null, pos),
        } as RaterPlayer;
      }).filter((p: RaterPlayer) => p.name);
    } else {
      // Sleeper (NFL default)
      const [rosters, allPlayers] = await Promise.all([
        sleeper.getRosters(leagueId),
        sleeper.getAllPlayers(),
      ]);

      const targetRoster = rosterId
        ? rosters.find(r => r.roster_id === Number(rosterId))
        : rosters[0];

      if (!targetRoster) return res.status(404).json({ error: 'Roster not found' });

      myRoster = targetRoster.players
        .map(id => {
          const p = allPlayers[id];
          if (!p) return null;
          return {
            id,
            name: p.full_name,
            position: p.position,
            team: p.team ?? 'FA',
            injuryStatus: p.injury_status,
            rank: rankToValue(p.search_rank, p.position),
          } as RaterPlayer;
        })
        .filter(Boolean) as RaterPlayer[];
    }

    // Score roster to find weakest positions
    const teamScore = scoreTeam(myRoster);
    const posScores = teamScore.positionBreakdown;

    // Find weakest positions (grade C or below = score < 67)
    const weakPositions = Object.entries(posScores)
      .filter(([, v]) => v.score < 70)
      .sort((a, b) => a[1].score - b[1].score)
      .map(([pos]) => pos);

    // Priority positions to check (weak first, then all)
    const defaultPositions = sport === 'mlb'
      ? ['OF', 'SP', '1B', 'SS', '2B', '3B', 'C', 'RP']
      : ['RB', 'WR', 'QB', 'TE'];
    const priorityPositions = weakPositions.length > 0
      ? [...new Set([...weakPositions, ...defaultPositions])]
      : defaultPositions;

    // Get roster player IDs for "owned" check
    const ownedIds = new Set(myRoster.map(p => p.name));

    // Get trending adds for recency signal
    const trending = await sleeper.getTrending('add').catch(() => []) as Array<{ player_id: string; count: number }>;
    const trendingIds = new Set(trending.slice(0, 25).map(t => t.player_id));

    // Find available players per weak position
    const recommendations: Array<{ player: RaterPlayer & { id: string }; position: string; reason: string; priority: number; trending: boolean }> = [];

    if (sport === 'mlb' || platform === 'espn') {
      // ESPN: search per position for available (free agent/waiver) players
      for (const pos of priorityPositions.slice(0, 3)) {
        const espnResults = await espn.searchPlayers(leagueId, sport as 'nfl' | 'mlb', '', espnS2, swid).catch(() => []);
        const available = espnResults
          .filter(p => p.position === pos && !ownedIds.has(p.name) && !p.injuryStatus?.includes('out') && !p.injuryStatus?.includes('ir'))
          .slice(0, 5);

        for (const p of available) {
          const rp: RaterPlayer & { id: string } = {
            id: String(p.espnId),
            name: p.name,
            position: p.position,
            team: p.team,
            injuryStatus: p.injuryStatus,
            rank: rankToValue(null, p.position),
          };
          const isWeakPos = weakPositions.includes(pos);
          const posGrade = posScores[pos]?.grade ?? 'C';
          const reason = isWeakPos
            ? `Your ${pos} depth is ${posGrade} — this is a direct upgrade`
            : `Strong ${pos} depth add`;
          recommendations.push({
            player: rp,
            position: pos,
            reason,
            priority: scorePlayer(rp) + (isWeakPos ? 20 : 0),
            trending: false,
          });
        }
      }
    } else if (sport !== 'fpl') {
      const availablePool = await sleeper.getAllPlayers();
      for (const pos of priorityPositions.slice(0, 3)) {
        const available = Object.values(availablePool)
          .filter(p =>
            p.position === pos &&
            p.status !== 'Inactive' &&
            !ownedIds.has(p.full_name) &&
            p.search_rank != null &&
            p.search_rank > 0 &&
            !p.injury_status?.toLowerCase().includes('out') &&
            !p.injury_status?.toLowerCase().includes('ir')
          )
          .sort((a, b) => (a.search_rank || 9999) - (b.search_rank || 9999))
          .slice(0, 5);

        for (const p of available) {
          const rp: RaterPlayer & { id: string } = {
            id: p.player_id,
            name: p.full_name,
            position: p.position,
            team: p.team ?? 'FA',
            injuryStatus: p.injury_status,
            rank: rankToValue(p.search_rank, p.position),
          };
          const isTrending = trendingIds.has(p.player_id);
          const isWeakPos = weakPositions.includes(pos);
          const posGrade = posScores[pos]?.grade ?? 'C';

          const reason = isWeakPos
            ? `Your ${pos} depth is ${posGrade} — this is a direct upgrade`
            : `Strong ${pos} depth add`;

          recommendations.push({
            player: rp,
            position: pos,
            reason: isTrending ? `${reason} (🔥 trending)` : reason,
            priority: scorePlayer(rp) + (isWeakPos ? 20 : 0) + (isTrending ? 10 : 0),
            trending: isTrending,
          });
        }
      }
    }

    // Sort by priority descending, take top 10
    recommendations.sort((a, b) => b.priority - a.priority);
    const top = recommendations.slice(0, 10);

    // Build Claude prompt
    const weakLine = weakPositions.length > 0
      ? `Weakest positions: ${weakPositions.map(p => `${p} (${posScores[p]?.grade})`).join(', ')}.`
      : 'Roster is balanced.';

    const recLines = top.slice(0, 5).map((r, i) =>
      `  ${i + 1}. ${r.player.name} (${r.position}, ${r.player.team}) — ${r.reason}`
    ).join('\n');

    const prompt = `SPORT: ${sport.toUpperCase()} | FORMAT: ${scoringFormat} | WEEK: ${week}

=== WAIVER WIRE STRATEGY ===

MY ROSTER OVERVIEW:
Overall grade: ${teamScore.grade} (${teamScore.score}/100)
${weakLine}

TOP AVAILABLE PICKUPS:
${recLines}

In 1-2 sentences, say who to grab off waivers this week and why they help your team (mention the weak spot they fix).`;

    const hash = crypto.createHash('sha256').update(prompt).digest('hex').slice(0, 16);
    storePrompt(hash, prompt);

    return res.json({
      recommendations: top,
      teamScore,
      weakPositions,
      analysisHash: hash,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
});

export default router;
