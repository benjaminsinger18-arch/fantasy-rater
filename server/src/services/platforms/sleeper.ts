import axios from 'axios';
import { cache, TTL } from '../../cache/memcache.js';

const BASE = 'https://api.sleeper.app/v1';

export interface SleeperPlayer {
  player_id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  position: string;
  team: string;
  injury_status: string | null;
  status: string;
  age: number;
  years_exp: number;
  fantasy_positions: string[];
  search_rank: number;
  espn_id?: string;
  rotowire_id?: string;
}

export interface SleeperRoster {
  roster_id: number;
  owner_id: string;
  players: string[];
  starters: string[];
  reserve: string[];
  settings: {
    wins: number;
    losses: number;
    ties: number;
    fpts: number;
    fpts_decimal: number;
    fpts_against: number;
    fpts_against_decimal: number;
  };
}

export interface SleeperUser {
  user_id: string;
  display_name: string;
  metadata?: { team_name?: string };
}

let playerRefreshInterval: ReturnType<typeof setInterval> | null = null;

async function fetchAndCachePlayers(): Promise<Record<string, SleeperPlayer>> {
  const res = await axios.get<Record<string, SleeperPlayer>>(`${BASE}/players/nfl`, { timeout: 10000 });
  cache.set('sleeper:players:nfl', res.data, TTL.SLEEPER_PLAYERS);
  return res.data;
}

export async function getAllPlayers(): Promise<Record<string, SleeperPlayer>> {
  const cached = cache.get<Record<string, SleeperPlayer>>('sleeper:players:nfl');
  if (cached) return cached;
  return fetchAndCachePlayers();
}

export function startPlayerRefresh() {
  if (playerRefreshInterval) return;
  playerRefreshInterval = setInterval(fetchAndCachePlayers, TTL.SLEEPER_PLAYERS);
  fetchAndCachePlayers().catch(console.error);
}

export async function searchPlayers(query: string, position?: string): Promise<SleeperPlayer[]> {
  const all = await getAllPlayers();

  // Team search: query wrapped in quotes e.g. "KC" or "Chiefs"
  const teamMatch = query.match(/^"(.+)"$/);
  if (teamMatch) {
    const teamQ = teamMatch[1].toLowerCase();
    return Object.values(all)
      .filter(p => {
        const teamMatch = p.team?.toLowerCase() === teamQ ||
          p.team?.toLowerCase().includes(teamQ);
        const posMatch = position ? p.position === position.toUpperCase() : true;
        return teamMatch && posMatch && p.status !== 'Inactive';
      })
      .sort((a, b) => (a.search_rank || 9999) - (b.search_rank || 9999))
      .slice(0, 30);
  }

  const q = query.toLowerCase();
  return Object.values(all)
    .filter(p => {
      const nameMatch = p.full_name?.toLowerCase().includes(q);
      const posMatch = position ? p.position === position.toUpperCase() : true;
      return nameMatch && posMatch && p.status !== 'Inactive';
    })
    .sort((a, b) => (a.search_rank || 9999) - (b.search_rank || 9999))
    .slice(0, 20);
}

export async function getLeague(leagueId: string) {
  const key = `sleeper:league:${leagueId}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const res = await axios.get(`${BASE}/league/${leagueId}`);
  cache.set(key, res.data, TTL.ESPN_ROSTER);
  return res.data;
}

export async function getRosters(leagueId: string): Promise<SleeperRoster[]> {
  const key = `sleeper:rosters:${leagueId}`;
  const cached = cache.get<SleeperRoster[]>(key);
  if (cached) return cached;
  const res = await axios.get<SleeperRoster[]>(`${BASE}/league/${leagueId}/rosters`);
  cache.set(key, res.data, TTL.ESPN_ROSTER);
  return res.data;
}

export async function getProjections(week: number, season = '2025'): Promise<Record<string, Record<string, number>>> {
  const key = `sleeper:projections:${season}:${week}`;
  const cached = cache.get<Record<string, Record<string, number>>>(key);
  if (cached) return cached;
  const res = await axios.get<Record<string, Record<string, number>>>(
    `${BASE}/projections/nfl/${season}/${week}`
  );
  cache.set(key, res.data, TTL.SLEEPER_PROJECTIONS);
  return res.data;
}

export async function getPlayerWeeklyStats(
  playerId: string,
  season = '2025'
): Promise<Record<string, Record<string, number>>> {
  const key = `sleeper:stats:player:${playerId}:${season}`;
  const cached = cache.get<Record<string, Record<string, number>>>(key);
  if (cached) return cached;
  const res = await axios.get<Record<string, Record<string, number>>>(
    `${BASE}/stats/nfl/player/${playerId}?season_type=regular&season=${season}&grouping=week`
  );
  cache.set(key, res.data, TTL.SLEEPER_PROJECTIONS);
  return res.data;
}

export async function getLeagueUsers(leagueId: string): Promise<SleeperUser[]> {
  const key = `sleeper:users:${leagueId}`;
  const cached = cache.get<SleeperUser[]>(key);
  if (cached) return cached;
  const res = await axios.get<SleeperUser[]>(`${BASE}/league/${leagueId}/users`);
  cache.set(key, res.data, TTL.ESPN_ROSTER);
  return res.data;
}

export async function getTrending(type: 'add' | 'drop' = 'add') {
  const key = `sleeper:trending:${type}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const res = await axios.get(`${BASE}/players/nfl/trending/${type}?lookback_hours=24&limit=25`);
  cache.set(key, res.data, TTL.SLEEPER_TRENDING);
  return res.data;
}

export interface LiveMatchupPlayer {
  id: string;
  name: string;
  position: string;
  team: string;
  points: number;
  isStarter: boolean;
}

export interface LiveMatchupSide {
  rosterId: number;
  matchupId: number;
  totalPoints: number;
  players: LiveMatchupPlayer[];
}

export async function getMatchup(leagueId: string, week: number, rosterId: number): Promise<{ mine: LiveMatchupSide; opponent: LiveMatchupSide | null }> {
  const matchups = await axios.get<Array<{
    roster_id: number;
    matchup_id: number;
    points: number;
    players: string[];
    starters: string[];
    players_points: Record<string, number>;
  }>>(`${BASE}/league/${leagueId}/matchups/${week}`, { timeout: 8000 }).then(r => r.data);

  const mine = matchups.find(m => m.roster_id === rosterId);
  if (!mine) throw new Error(`Roster ${rosterId} not found in week ${week} matchups`);
  const opponent = matchups.find(m => m.matchup_id === mine.matchup_id && m.roster_id !== rosterId) ?? null;

  const allPlayers = await getAllPlayers();

  type SleeperMatchup = { roster_id: number; matchup_id: number; points: number; players: string[]; starters: string[]; players_points: Record<string, number> };
  function hydrateSide(side: SleeperMatchup): LiveMatchupSide {
    const starters = new Set(side.starters ?? []);
    const players: LiveMatchupPlayer[] = (side.players ?? []).map(pid => {
      const p = allPlayers[pid];
      return {
        id: pid,
        name: p?.full_name ?? pid,
        position: p?.position ?? '?',
        team: p?.team ?? 'FA',
        points: side.players_points?.[pid] ?? 0,
        isStarter: starters.has(pid),
      };
    });
    players.sort((a, b) => {
      if (a.isStarter !== b.isStarter) return a.isStarter ? -1 : 1;
      return b.points - a.points;
    });
    return {
      rosterId: side.roster_id,
      matchupId: side.matchup_id,
      totalPoints: side.points ?? 0,
      players,
    };
  }

  return { mine: hydrateSide(mine), opponent: opponent ? hydrateSide(opponent) : null };
}

export interface SleeperSeasonState {
  week: number;
  season_type: string; // 'pre' | 'regular' | 'post' | 'off'
  season: string;      // e.g. '2025'
  previous_season?: string | number;
}

export async function getSeasonState(sport: 'nfl' | 'mlb'): Promise<SleeperSeasonState> {
  const key = `sleeper:state:${sport}`;
  const cached = cache.get<SleeperSeasonState>(key);
  if (cached) return cached;
  const res = await axios.get<SleeperSeasonState>(`${BASE}/state/${sport}`, { timeout: 5000 });
  cache.set(key, res.data, 60 * 60 * 1000); // 1 hour
  return res.data;
}

export async function getNFLSeasonStats(
  season = '2024'
): Promise<Record<string, Record<string, number>>> {
  const key = `sleeper:season_stats:nfl:${season}`;
  const cached = cache.get<Record<string, Record<string, number>>>(key);
  if (cached) return cached;
  const res = await axios.get<Record<string, Record<string, number>>>(
    `${BASE}/stats/nfl/regular/${season}?grouping=season`,
    { timeout: 10000 }
  );
  cache.set(key, res.data, 24 * 60 * 60 * 1000); // 24 hours — historical data never changes
  return res.data;
}

export interface SleeperMLBPlayer {
  player_id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  position: string;
  team: string;
  status: string;
  espn_id?: string;
}

export async function getMLBPlayers(): Promise<Record<string, SleeperMLBPlayer>> {
  const key = 'sleeper:players:mlb';
  const cached = cache.get<Record<string, SleeperMLBPlayer>>(key);
  if (cached) return cached;
  const res = await axios.get<Record<string, SleeperMLBPlayer>>(`${BASE}/players/mlb`, { timeout: 10000 });
  cache.set(key, res.data, TTL.SLEEPER_PLAYERS); // 1 hour
  return res.data;
}

export async function getMLBSeasonStats(
  season = '2024'
): Promise<Record<string, Record<string, number>>> {
  const key = `sleeper:season_stats:mlb:${season}`;
  const cached = cache.get<Record<string, Record<string, number>>>(key);
  if (cached) return cached;
  const res = await axios.get<Record<string, Record<string, number>>>(
    `${BASE}/stats/mlb/regular/${season}?grouping=season`,
    { timeout: 10000 }
  );
  cache.set(key, res.data, 24 * 60 * 60 * 1000); // 24 hours
  return res.data;
}

export async function getMLBProjections(
  week: number,
  season = '2025'
): Promise<Record<string, Record<string, number>>> {
  const key = `sleeper:projections:mlb:${season}:${week}`;
  const cached = cache.get<Record<string, Record<string, number>>>(key);
  if (cached) return cached;
  const res = await axios.get<Record<string, Record<string, number>>>(
    `${BASE}/projections/mlb/${season}/${week}`,
    { timeout: 8000 }
  );
  cache.set(key, res.data, TTL.SLEEPER_PROJECTIONS); // 30 min
  return res.data;
}

export interface SleeperDraftPick {
  round: number;
  pick_no: number;
  player_id: string;
  picked_by: string;
  roster_id: number;
}

export interface SleeperDraftInfo {
  status: 'pre_draft' | 'drafting' | 'complete' | 'paused';
  settings?: { teams?: number; rounds?: number };
  draft_order?: Record<string, number>;
}

export async function getDraftInfo(draftId: string): Promise<SleeperDraftInfo> {
  const res = await axios.get<SleeperDraftInfo>(`https://api.sleeper.app/v1/draft/${draftId}`);
  return res.data;
}

export async function getDraftPicks(draftId: string): Promise<SleeperDraftPick[]> {
  const res = await axios.get<SleeperDraftPick[]>(`https://api.sleeper.app/v1/draft/${draftId}/picks`);
  return res.data;
}
