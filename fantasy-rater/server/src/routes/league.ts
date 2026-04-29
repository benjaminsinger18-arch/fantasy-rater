import { Router, type Response } from 'express';
import crypto from 'crypto';
import { requireAuth } from '../middleware/requireAuth.js';
import { scoreTeam } from '../services/rater.js';
import { buildLeaguePredictorPrompt, storePrompt } from '../services/claude.js';
import type { RaterPlayer } from '../services/rater.js';
import * as sleeper from '../services/platforms/sleeper.js';
import * as fplApi from '../services/platforms/fpl.js';
import * as espn from '../services/platforms/espn.js';
import { simulatePlayoffProbabilities, type SimTeam } from '../services/playoffSimulator.js';

const router = Router();

const POSITION_MAP: Record<number, string> = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' };

function winPct(wins: number, losses: number, ties: number): number {
  const total = wins + losses + ties;
  if (total === 0) return 0.5;
  return (wins + ties * 0.5) / total;
}

function compositeScore(rosterScore: number, winPctValue: number): number {
  return (rosterScore / 100) * 0.6 + winPctValue * 0.4;
}

function projectedRange(teams: { compositeScore: number }[], myIdx: number): [number, number] {
  const myScore = teams[myIdx].compositeScore;
  // Count how many teams are within 3% composite score
  const margin = 0.03;
  let min = myIdx + 1;
  let max = myIdx + 1;
  for (let i = 0; i < teams.length; i++) {
    if (Math.abs(teams[i].compositeScore - myScore) <= margin) {
      min = Math.min(min, i + 1);
      max = Math.max(max, i + 1);
    }
  }
  return [min, max];
}

// GET /api/league/predict
router.get('/predict', requireAuth('pro'), async (req, res) => {
  const {
    leagueId,
    sport = 'nfl',
    scoringFormat = 'PPR',
    currentWeek = '1',
    myRosterId,
    espnS2,
    swid,
    weeksRemaining = '10',
  } = req.query as Record<string, string>;

  if (!leagueId) return res.status(400).json({ error: 'leagueId required' });

  try {
    if (sport === 'fpl') {
      return await handleFpl(res, leagueId, myRosterId, scoringFormat, Number(weeksRemaining));
    } else if (sport === 'nfl' || sport === 'mlb') {
      const platform = sport === 'mlb' ? 'espn' : 'sleeper';
      if (platform === 'espn') {
        return await handleEspn(res, leagueId, sport as 'nfl' | 'mlb', Number(currentWeek), myRosterId, scoringFormat, espnS2, swid, Number(weeksRemaining));
      }
      return await handleSleeper(res, leagueId, myRosterId, scoringFormat, Number(weeksRemaining));
    } else {
      return await handleSleeper(res, leagueId, myRosterId, scoringFormat, Number(weeksRemaining));
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
});

async function handleSleeper(res: Response, leagueId: string, myRosterId: string | undefined, scoringFormat: string, weeksRemaining: number) {
  const [rosters, allPlayers, users] = await Promise.all([
    sleeper.getRosters(leagueId),
    sleeper.getAllPlayers(),
    sleeper.getLeagueUsers(leagueId),
  ]);

  const userMap = Object.fromEntries(users.map(u => [u.user_id, u.metadata?.team_name || u.display_name]));

  const teams = rosters.map(roster => {
    const rosterPlayers: RaterPlayer[] = (roster.players ?? [])
      .map(id => {
        const p = allPlayers[id];
        if (!p) return null;
        return {
          name: p.full_name,
          position: p.position,
          team: p.team ?? 'FA',
          injuryStatus: p.injury_status,
          rank: p.search_rank,
        } as RaterPlayer;
      })
      .filter(Boolean) as RaterPlayer[];

    const teamScore = rosterPlayers.length > 0 ? scoreTeam(rosterPlayers) : { score: 0, grade: 'F', positionBreakdown: {} };
    const settings = roster.settings ?? { wins: 0, losses: 0, ties: 0, fpts: 0, fpts_decimal: 0 };
    const wp = winPct(settings.wins, settings.losses, settings.ties);
    const composite = compositeScore(teamScore.score, wp);
    const record = `${settings.wins}-${settings.losses}${settings.ties > 0 ? `-${settings.ties}` : ''}`;
    const pts = settings.fpts + (settings.fpts_decimal ?? 0) / 100;

    return {
      rosterId: roster.roster_id,
      teamName: userMap[roster.owner_id] ?? `Team ${roster.roster_id}`,
      currentRecord: record,
      currentPoints: pts,
      wins: settings.wins,
      losses: settings.losses,
      ties: settings.ties,
      rosterScore: teamScore.score,
      rosterGrade: teamScore.grade,
      positionBreakdown: teamScore.positionBreakdown,
      compositeScore: composite,
      projectedRank: 0,
    };
  });

  return buildResponse(res, teams, myRosterId?.toString(), scoringFormat, 'nfl', weeksRemaining);
}

async function handleFpl(res: Response, leagueId: string, myManagerId: string | undefined, scoringFormat: string, weeksRemaining: number) {
  const [standings, gw, bootstrap] = await Promise.all([
    fplApi.getLeagueStandings(leagueId),
    fplApi.getCurrentGameweek(),
    fplApi.getBootstrap(),
  ]);

  const playerMap = Object.fromEntries(bootstrap.elements.map(e => [e.id, e]));
  const teamMap = Object.fromEntries(bootstrap.teams.map(t => [t.id, t.short_name]));

  // Cap at 20 managers to avoid rate limiting
  const capped = standings.slice(0, 20);

  const teamsRaw = await Promise.all(
    capped.map(async standing => {
      try {
        const picks = await fplApi.getManagerTeam(standing.entry, gw);
        const rosterPlayers: RaterPlayer[] = (picks.picks ?? []).map((pick: { element: number }) => {
          const el = playerMap[pick.element];
          if (!el) return null;
          return {
            name: `${el.first_name} ${el.second_name}`,
            position: POSITION_MAP[el.element_type],
            team: teamMap[el.team] ?? 'UNK',
            injuryStatus: el.chance_of_playing_next_round !== null && el.chance_of_playing_next_round < 50 ? 'Doubtful' : null,
            form: Number(el.form),
            epNext: Number(el.ep_next),
          } as RaterPlayer;
        }).filter(Boolean) as RaterPlayer[];

        const teamScore = rosterPlayers.length > 0 ? scoreTeam(rosterPlayers) : { score: 0, grade: 'F', positionBreakdown: {} };
        // Normalize total points to a win percentage equivalent (max ~3000 pts in a season)
        const wp = Math.min(1, standing.total / 2000);
        const composite = compositeScore(teamScore.score, wp);

        return {
          rosterId: standing.entry,
          teamName: standing.entry_name,
          currentRecord: `${standing.total} pts`,
          currentPoints: standing.total,
          wins: 0,
          losses: 0,
          ties: 0,
          rosterScore: teamScore.score,
          rosterGrade: teamScore.grade,
          positionBreakdown: teamScore.positionBreakdown,
          compositeScore: composite,
          projectedRank: 0,
        };
      } catch {
        return null;
      }
    })
  );

  const teams = teamsRaw.filter((t): t is NonNullable<typeof t> => t !== null);
  return buildResponse(res, teams, myManagerId?.toString(), scoringFormat, 'fpl', weeksRemaining);
}

async function handleEspn(res: Response, leagueId: string, sport: 'nfl' | 'mlb', currentWeek: number, myRosterId: string | undefined, scoringFormat: string, espnS2?: string, swid?: string, weeksRemaining: number = 10) {
  const data = await espn.getLeagueTeams(leagueId, sport, currentWeek, espnS2, swid);
  const espnTeams: any[] = data.teams ?? [];

  const teams = espnTeams.map(team => {
    const record = team.record?.overall ?? { wins: 0, losses: 0, ties: 0, pointsFor: 0 };
    const wp = winPct(record.wins, record.losses, record.ties);

    // Extract roster players from ESPN mRoster view
    const rosterEntries: any[] = team.roster?.entries ?? [];
    const rosterPlayers: RaterPlayer[] = rosterEntries
      .map(entry => {
        const playerPoolEntry = entry.playerPoolEntry;
        const p = playerPoolEntry?.player;
        if (!p) return null;
        const pos = p.defaultPositionId;
        const posMap: Record<number, string> = { 1: 'QB', 2: 'RB', 3: 'WR', 4: 'TE', 5: 'K', 16: 'DEF' };
        return {
          name: p.fullName,
          position: posMap[pos] ?? 'FLEX',
          team: p.proTeam?.abbrev ?? 'FA',
          injuryStatus: playerPoolEntry.injuryStatus !== 'ACTIVE' ? playerPoolEntry.injuryStatus?.toLowerCase() : null,
          rank: playerPoolEntry.onTeamId ? undefined : undefined,
        } as RaterPlayer;
      })
      .filter(Boolean) as RaterPlayer[];

    const teamScore = rosterPlayers.length > 0 ? scoreTeam(rosterPlayers) : { score: 0, grade: 'F', positionBreakdown: {} };
    const composite = compositeScore(teamScore.score, wp);
    const recordStr = `${record.wins}-${record.losses}${record.ties > 0 ? `-${record.ties}` : ''}`;

    return {
      rosterId: team.id,
      teamName: `${team.location ?? ''} ${team.nickname ?? ''}`.trim() || `Team ${team.id}`,
      currentRecord: recordStr,
      currentPoints: record.pointsFor ?? 0,
      wins: record.wins,
      losses: record.losses,
      ties: record.ties,
      rosterScore: teamScore.score,
      rosterGrade: teamScore.grade,
      positionBreakdown: teamScore.positionBreakdown,
      compositeScore: composite,
      projectedRank: 0,
    };
  });

  return buildResponse(res, teams, myRosterId?.toString(), scoringFormat, sport, weeksRemaining);
}

function buildResponse(res: Response, teams: any[], myRosterId: string | undefined, scoringFormat: string, sport: string, weeksRemaining = 10) {
  // Sort by composite score descending
  teams.sort((a, b) => b.compositeScore - a.compositeScore);

  // Monte Carlo playoff probability
  const playoffSpots = Math.max(2, Math.ceil(teams.length / 3));
  const simTeams: SimTeam[] = teams.map(t => ({
    name: t.teamName,
    wins: t.wins ?? 0,
    losses: t.losses ?? 0,
    ties: t.ties ?? 0,
    currentPoints: t.currentPoints ?? 0,
  }));
  const playoffProbs = simulatePlayoffProbabilities(simTeams, playoffSpots, weeksRemaining);
  for (const team of teams) {
    team.playoffProbability = playoffProbs[team.teamName] ?? 0;
  }

  // Assign projected ranks
  teams.forEach((t, i) => { t.projectedRank = i + 1; });

  // Add current rank based on win % then points
  const byRecord = [...teams].sort((a, b) => {
    const wpA = winPct(a.wins, a.losses, a.ties);
    const wpB = winPct(b.wins, b.losses, b.ties);
    if (wpB !== wpA) return wpB - wpA;
    return b.currentPoints - a.currentPoints;
  });
  byRecord.forEach((t, i) => { t.currentRank = i + 1; });

  const leagueAvgRosterScore = Math.round(teams.reduce((s, t) => s + t.rosterScore, 0) / (teams.length || 1));

  let myTeam = null;
  let analysisHash = '';

  if (myRosterId) {
    const myIdx = teams.findIndex(t => String(t.rosterId) === myRosterId);
    if (myIdx !== -1) {
      const range = projectedRange(teams, myIdx);
      myTeam = { ...teams[myIdx], projectedRange: range };

      // Build rivals: the 2 teams above and 1 below in projected standings
      const rivals = [];
      if (myIdx > 0) rivals.push(teams[myIdx - 1]);
      if (myIdx > 1) rivals.push(teams[myIdx - 2]);
      if (myIdx < teams.length - 1) rivals.push(teams[myIdx + 1]);

      const prompt = buildLeaguePredictorPrompt({
        sport,
        scoringFormat,
        myTeam: {
          teamName: myTeam.teamName,
          currentRecord: myTeam.currentRecord,
          currentRank: myTeam.currentRank,
          rosterGrade: myTeam.rosterGrade,
          rosterScore: myTeam.rosterScore,
          projectedRank: myTeam.projectedRank,
          projectedRange: range,
          positionBreakdown: myTeam.positionBreakdown,
        },
        leagueSize: teams.length,
        leagueAvgRosterScore,
        rivals: rivals.map(r => ({ teamName: r.teamName, rosterGrade: r.rosterGrade, projectedRank: r.projectedRank })),
      });
      analysisHash = crypto.createHash('sha256').update(prompt).digest('hex').slice(0, 16);
      storePrompt(analysisHash, prompt);
    }
  }

  // Strip internal fields before sending
  const responseTeams = teams.map(({ compositeScore: _c, wins: _w, losses: _l, ties: _t, currentPoints: _p, ...rest }) => rest);
  const responseMyTeam = myTeam ? (({ compositeScore: _c, wins: _w, losses: _l, ties: _t, currentPoints: _p, ...rest }) => rest)(myTeam) : null;

  return res.json({ teams: responseTeams, myTeam: responseMyTeam, leagueAvgRosterScore, analysisHash });
}

export default router;
