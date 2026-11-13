import axios from 'axios';
import { cache, TTL } from '../../cache/memcache.js';

const BASE = 'https://lm-api-reads.fantasy.espn.com/apis/v3/games';

function espnSport(sport: 'nfl' | 'mlb') {
  return sport === 'nfl' ? 'ffl' : 'flb';
}

function espnSeason(sport: 'nfl' | 'mlb') {
  return sport === 'nfl' ? '2025' : '2025';
}

function makeHeaders(espnS2?: string, swid?: string) {
  if (!espnS2 || !swid) return {};
  return { Cookie: `espn_s2=${espnS2}; SWID=${swid}` };
}

export async function getLeagueRosters(
  leagueId: string,
  sport: 'nfl' | 'mlb',
  scoringPeriodId: number,
  espnS2?: string,
  swid?: string
) {
  const key = `espn:rosters:${sport}:${leagueId}:${scoringPeriodId}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const game = espnSport(sport);
  const season = espnSeason(sport);
  const url = `${BASE}/${game}/seasons/${season}/segments/0/leagues/${leagueId}`;

  const res = await axios.get(url, {
    params: { view: 'mRoster', scoringPeriodId },
    headers: makeHeaders(espnS2, swid),
  });

  cache.set(key, res.data, TTL.ESPN_ROSTER);
  return res.data;
}

export async function getLeagueSettings(
  leagueId: string,
  sport: 'nfl' | 'mlb',
  espnS2?: string,
  swid?: string
) {
  const key = `espn:settings:${sport}:${leagueId}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const game = espnSport(sport);
  const season = espnSeason(sport);
  const url = `${BASE}/${game}/seasons/${season}/segments/0/leagues/${leagueId}`;

  const res = await axios.get(url, {
    params: { view: 'mSettings' },
    headers: makeHeaders(espnS2, swid),
  });

  cache.set(key, res.data, TTL.ESPN_ROSTER);
  return res.data;
}

export async function getLeagueTeams(
  leagueId: string,
  sport: 'nfl' | 'mlb',
  scoringPeriodId: number,
  espnS2?: string,
  swid?: string
) {
  const key = `espn:teams:${sport}:${leagueId}:${scoringPeriodId}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const game = espnSport(sport);
  const season = espnSeason(sport);
  const url = `${BASE}/${game}/seasons/${season}/segments/0/leagues/${leagueId}`;

  const res = await axios.get(url, {
    params: { view: ['mTeam', 'mRoster'], scoringPeriodId },
    headers: makeHeaders(espnS2, swid),
  });

  cache.set(key, res.data, TTL.ESPN_ROSTER);
  return res.data;
}

// ESPN fantasy baseball defaultPositionId → fantasy position
const MLB_POSITION_MAP: Record<number, string> = {
  1: 'SP', 2: 'C', 3: '1B', 4: '2B', 5: '3B', 6: 'SS',
  7: 'OF', 8: 'OF', 9: 'OF', 10: 'DH', 11: 'RP', 12: 'UTIL',
};

// ESPN MLB proTeamId → abbreviation (matches ESPN sports site team IDs)
const MLB_TEAM_MAP: Record<number, string> = {
  1: 'BAL', 2: 'BOS', 3: 'LAA', 4: 'CHW', 5: 'CLE', 6: 'DET',
  7: 'KC', 8: 'MIL', 9: 'MIN', 10: 'NYY', 11: 'ATH', 12: 'SEA',
  13: 'TEX', 14: 'TOR', 15: 'ATL', 16: 'CHC', 17: 'CIN', 18: 'HOU',
  19: 'LAD', 20: 'WSH', 21: 'NYM', 22: 'PHI', 23: 'PIT', 24: 'STL',
  25: 'SD', 26: 'SF', 27: 'COL', 28: 'MIA', 29: 'ARI', 30: 'TB',
};

const NFL_POSITION_MAP: Record<number, string> = {
  1: 'QB', 2: 'RB', 3: 'WR', 4: 'TE', 5: 'K', 16: 'DEF',
};

export interface ESPNPlayerResult {
  espnId: number;
  name: string;
  position: string;
  team: string;
  injuryStatus: string | null;
  percentOwned?: number;
}

// Get top MLB players sorted by % owned (no leagueId needed)
export async function getTopMLBPlayers(position?: string, limit = 100): Promise<ESPNPlayerResult[]> {
  const cacheKey = `espn:top:mlb:${position ?? 'all'}:${limit}`;
  const cached = cache.get<ESPNPlayerResult[]>(cacheKey);
  if (cached) return cached;

  const filter: Record<string, unknown> = {
    players: {
      sortPercOwned: { sortPriority: 1, sortAsc: false },
      limit: Math.min(limit * 3, 500), // fetch extra so we can filter by position
      filterStatus: { value: ['FREEAGENT', 'WAIVERS', 'ONTEAM'] },
    },
  };

  const res = await axios.get(
    `${BASE}/flb/seasons/2026/players?view=players_wl`,
    { headers: { 'x-fantasy-filter': JSON.stringify(filter) }, timeout: 8000 }
  );

  const all: any[] = Array.isArray(res.data) ? res.data : [];
  const sorted = all.sort((a, b) =>
    (b.ownership?.percentOwned ?? 0) - (a.ownership?.percentOwned ?? 0)
  );

  const filtered = position
    ? sorted.filter(p => MLB_POSITION_MAP[p.defaultPositionId] === position.toUpperCase())
    : sorted;

  const results: ESPNPlayerResult[] = filtered.slice(0, limit).map(p => ({
    espnId: p.id,
    name: p.fullName ?? '',
    position: MLB_POSITION_MAP[p.defaultPositionId] ?? 'UTIL',
    team: MLB_TEAM_MAP[p.proTeamId] ?? (p.proTeamId === 0 ? 'FA' : 'MLB'),
    injuryStatus: null,
    percentOwned: p.ownership?.percentOwned ?? 0,
  }));

  cache.set(cacheKey, results, 15 * 60 * 1000); // 15 min cache
  return results;
}

// Map real MLB positions → fantasy positions
function toFantasyPosition(abbrev: string): string {
  if (['LF', 'CF', 'RF', 'OF'].includes(abbrev)) return 'OF';
  if (['SP', 'P', 'PITCH', 'ST'].includes(abbrev)) return 'SP';
  if (['C', '1B', '2B', '3B', 'SS', 'RP', 'DH'].includes(abbrev)) return abbrev;
  if (['UN', 'UTL', 'UTIL', ''].includes(abbrev)) return 'UTIL';
  return abbrev;
}

// Public search — no leagueId or auth needed; uses ESPN site API + core athlete detail
export async function searchPlayersPublic(sport: 'nfl' | 'mlb', query: string): Promise<ESPNPlayerResult[]> {
  const sportStr = sport === 'mlb' ? 'baseball' : 'football';
  const league = sport === 'mlb' ? 'mlb' : 'nfl';

  const cacheKey = `espn:pub:${sport}:${query.toLowerCase().trim()}`;
  const cached = cache.get<ESPNPlayerResult[]>(cacheKey);
  if (cached) return cached;

  const res = await axios.get('https://site.web.api.espn.com/apis/common/v3/search', {
    params: { query, sport: sportStr, league, limit: 10, type: 'player' },
    timeout: 5000,
  });

  const items: any[] = res.data?.items ?? [];

  // Fetch position from ESPN core API in parallel (team comes from search result)
  const results = await Promise.all(items.map(async (item: any) => {
    try {
      const team = item.teamRelationships?.[0]?.core?.abbreviation ?? 'FA';
      let position = 'UTIL';
      try {
        const ar = await axios.get(
          `https://sports.core.api.espn.com/v2/sports/${sportStr}/leagues/${league}/athletes/${item.id}`,
          { timeout: 3000 }
        );
        const rawPos = ar.data?.position?.abbreviation ?? 'UTIL';
        position = sport === 'mlb' ? toFantasyPosition(rawPos) : rawPos;
      } catch { /* use default position */ }

      return {
        espnId: Number(item.id),
        name: item.displayName ?? '',
        position,
        team,
        injuryStatus: null,
      } as ESPNPlayerResult;
    } catch {
      return null;
    }
  }));

  const filtered = results.filter(Boolean) as ESPNPlayerResult[];
  cache.set(cacheKey, filtered, 10 * 60 * 1000); // 10 min cache
  return filtered;
}

export async function searchPlayers(
  leagueId: string,
  sport: 'nfl' | 'mlb',
  query: string,
  espnS2?: string,
  swid?: string
): Promise<ESPNPlayerResult[]> {
  const game = espnSport(sport);
  const season = espnSeason(sport);
  const url = `${BASE}/${game}/seasons/${season}/segments/0/leagues/${leagueId}`;

  const res = await axios.get(url, {
    params: { view: 'kona_player_info' },
    headers: {
      ...makeHeaders(espnS2, swid),
      'x-fantasy-filter': JSON.stringify({
        players: {
          filterStatus: { value: ['FREEAGENT', 'WAIVERS', 'ONTEAM'] },
          filterSlotIds: { value: [] },
          filterRanksForScoringPeriodIds: { value: [1] },
          sortPercOwned: { sortPriority: 1, sortAsc: false },
          limit: 20,
          filterSearchText: { value: query },
        },
      }),
    },
  });

  const posMap = sport === 'mlb' ? MLB_POSITION_MAP : NFL_POSITION_MAP;
  const entries: any[] = res.data.players ?? [];

  return entries.map(entry => {
    const pool = entry.playerPoolEntry ?? {};
    const p = pool.player ?? {};
    const injuryStatus = pool.injuryStatus && pool.injuryStatus !== 'ACTIVE'
      ? (pool.injuryStatus as string).toLowerCase()
      : null;
    return {
      espnId: p.id ?? entry.id,
      name: p.fullName ?? '',
      position: posMap[p.defaultPositionId] ?? 'UTIL',
      team: p.proTeam?.abbrev ?? 'FA',
      injuryStatus,
    };
  });
}
