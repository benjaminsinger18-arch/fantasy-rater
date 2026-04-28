import axios from 'axios';
import { cache, TTL } from '../../cache/memcache.js';

const BASE = 'https://fantasy.premierleague.com/api';

export interface FPLElement {
  id: number;
  first_name: string;
  second_name: string;
  web_name: string;
  team: number;
  team_code: number;
  element_type: number; // 1=GK 2=DEF 3=MID 4=FWD
  now_cost: number; // divide by 10 for £ value
  total_points: number;
  form: string;
  points_per_game: string;
  selected_by_percent: string;
  chance_of_playing_next_round: number | null;
  news: string;
  ict_index: string;
  transfers_in_event: number;
  transfers_out_event: number;
  ep_next: string; // expected points next GW
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  yellow_cards: number;
  red_cards: number;
  bonus: number;
  bps: number;
  influence: string;
  creativity: string;
  threat: string;
  code: number; // used to construct photo URL
  photo: string; // e.g. "14937.jpg"
}

export interface FPLTeam {
  id: number;
  name: string;
  short_name: string;
}

export interface FPLBootstrap {
  elements: FPLElement[];
  teams: FPLTeam[];
  events: Array<{ id: number; name: string; is_current: boolean; is_next: boolean; finished: boolean }>;
  element_types: Array<{ id: number; singular_name: string; plural_name_short: string }>;
}

const POSITION_MAP: Record<number, string> = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' };

export async function getBootstrap(): Promise<FPLBootstrap> {
  const cached = cache.get<FPLBootstrap>('fpl:bootstrap');
  if (cached) return cached;
  const res = await axios.get<FPLBootstrap>(`${BASE}/bootstrap-static/`);
  cache.set('fpl:bootstrap', res.data, TTL.FPL_BOOTSTRAP);
  return res.data;
}

export async function searchPlayers(query: string, position?: string, limit = 20) {
  const bootstrap = await getBootstrap();
  const teams = Object.fromEntries(bootstrap.teams.map(t => [t.id, t.name]));
  const shortNames = Object.fromEntries(bootstrap.teams.map(t => [t.id, t.short_name]));
  const posId = position ? Object.entries(POSITION_MAP).find(([, v]) => v === position.toUpperCase())?.[0] : null;

  // Team search: query in quotes e.g. "Arsenal" or "ARS"
  const teamMatch = query.match(/^"(.+)"$/);
  const q = teamMatch ? teamMatch[1].toLowerCase() : query.toLowerCase();
  const isTeamSearch = !!teamMatch;

  return bootstrap.elements
    .filter(p => {
      const teamName = teams[p.team]?.toLowerCase() ?? '';
      const teamShort = shortNames[p.team]?.toLowerCase() ?? '';
      const nameMatch = isTeamSearch
        ? teamName.includes(q) || teamShort === q
        : (p.web_name.toLowerCase().includes(q) || `${p.first_name} ${p.second_name}`.toLowerCase().includes(q));
      const posMatch = posId ? p.element_type === Number(posId) : true;
      return nameMatch && posMatch;
    })
    .sort((a, b) => b.total_points - a.total_points)
    .slice(0, limit)
    .map(p => {
      const epNext = parseFloat(p.ep_next) || 0;
      const form = parseFloat(p.form) || 0;
      const fantasyValue = Math.min(97, Math.max(5, Math.round(epNext * 5 + form * 2 + p.total_points * 0.1)));
      return {
        id: p.id,
        name: `${p.first_name} ${p.second_name}`,
        web_name: p.web_name,
        position: POSITION_MAP[p.element_type],
        team: teams[p.team],
        total_points: p.total_points,
        form: p.form,
        now_cost: p.now_cost / 10,
        epNext: epNext,
        chance_of_playing: p.chance_of_playing_next_round,
        news: p.news,
        selected_by_percent: p.selected_by_percent,
        photoCode: p.code,
        teamCode: p.team_code,
        fantasyValue,
      };
    });
}

export async function getPlayerDetail(playerId: number) {
  const key = `fpl:player:${playerId}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const res = await axios.get(`${BASE}/element-summary/${playerId}/`);
  cache.set(key, res.data, TTL.SLEEPER_PROJECTIONS);
  return res.data;
}

export async function getManagerTeam(managerId: number, gameweek: number) {
  const key = `fpl:manager:${managerId}:gw:${gameweek}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const res = await axios.get(`${BASE}/entry/${managerId}/event/${gameweek}/picks/`);
  cache.set(key, res.data, TTL.ESPN_ROSTER);
  return res.data;
}

export interface FPLLeagueStanding {
  entry: number;
  entry_name: string;
  player_name: string;
  rank: number;
  total: number;
}

export async function getLeagueStandings(leagueId: string): Promise<FPLLeagueStanding[]> {
  const key = `fpl:league:${leagueId}:standings`;
  const cached = cache.get<FPLLeagueStanding[]>(key);
  if (cached) return cached;
  const res = await axios.get<{ standings: { results: FPLLeagueStanding[] } }>(
    `${BASE}/leagues-classic/${leagueId}/standings/`
  );
  const results = res.data.standings.results;
  cache.set(key, results, TTL.ESPN_ROSTER);
  return results;
}

export async function getCurrentGameweek(): Promise<number> {
  const bootstrap = await getBootstrap();
  const current = bootstrap.events.find(e => e.is_current);
  const next = bootstrap.events.find(e => e.is_next);
  return (current || next)?.id ?? 1;
}

export async function getLiveEventPoints(gw: number): Promise<Record<number, number>> {
  const key = `fpl:live:${gw}`;
  const cached = cache.get<Record<number, number>>(key);
  if (cached) return cached;
  const res = await axios.get<{ elements: Array<{ id: number; stats: { total_points: number } }> }>(
    `${BASE}/event/${gw}/live/`
  );
  const points: Record<number, number> = {};
  for (const el of res.data.elements) {
    points[el.id] = el.stats.total_points;
  }
  cache.set(key, points, 30); // 30s TTL for live data
  return points;
}
