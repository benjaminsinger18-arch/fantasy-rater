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
  const res = await axios.get<Record<string, SleeperPlayer>>(`${BASE}/players/nfl`);
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
  season = '2024'
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
