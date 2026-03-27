import axios from 'axios';
import { cache } from '../../cache/memcache.js';

// Team badge fallbacks (Wikipedia CDN — reliable, stable)
const IPL_TEAM_BADGES: Record<string, string> = {
  CSK: 'https://upload.wikimedia.org/wikipedia/en/2/2b/Chennai_Super_Kings_Logo.svg',
  MI:  'https://upload.wikimedia.org/wikipedia/en/c/cd/Mumbai_Indians_Logo.svg',
  RCB: 'https://upload.wikimedia.org/wikipedia/en/d/d4/Royal_Challengers_Bengaluru_Logo.svg',
  KKR: 'https://upload.wikimedia.org/wikipedia/en/4/4c/Kolkata_Knight_Riders_Logo.svg',
  DC:  'https://upload.wikimedia.org/wikipedia/commons/c/c5/Delhi_Capitals_Logo.png',
  PBKS:'https://upload.wikimedia.org/wikipedia/en/d/d4/Punjab_Kings_Logo.svg',
  RR:  'https://upload.wikimedia.org/wikipedia/commons/6/69/Rajasthan_Royals_Logo.png',
  SRH: 'https://upload.wikimedia.org/wikipedia/en/5/51/Sunrisers_Hyderabad_Logo.svg',
  GT:  'https://upload.wikimedia.org/wikipedia/en/0/09/Gujarat_Titans_Logo.svg',
  LSG: 'https://upload.wikimedia.org/wikipedia/en/3/34/Lucknow_Super_Giants_Logo.svg',
};

// TheSportsDB team IDs for all 10 IPL franchises
const IPL_TEAM_IDS: Record<string, number> = {
  CSK: 135800,
  MI: 135795,
  RCB: 135796,
  KKR: 135794,
  DC: 135792,
  PBKS: 135793,
  RR: 135801,
  SRH: 135797,
  GT: 145834,
  LSG: 145835,
};

function mapPosition(raw: string | null | undefined): string {
  if (!raw) return 'UTIL';
  const r = raw.trim();
  if (r === 'Batsman' || r === 'Batter') return 'BAT';
  if (r === 'Bowler') return 'BOWL';
  if (r === 'All-Rounder' || r === 'All Rounder') return 'AR';
  if (r === 'Wicket Keeper' || r === 'Wicket-Keeper' || r === 'Wicketkeeper') return 'WK';
  return 'UTIL';
}

const POSITION_BASE: Record<string, number> = {
  AR: 80, BAT: 70, WK: 65, BOWL: 55, UTIL: 45,
};

export interface IPLPlayerResult {
  id: string;
  name: string;
  position: string;
  team: string;
  nationality: string;
  photo: string | null;
  fantasyValue: number;
}

const CACHE_KEY = 'ipl:all_players';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function getAllIPLPlayers(): Promise<IPLPlayerResult[]> {
  const cached = cache.get<IPLPlayerResult[]>(CACHE_KEY);
  if (cached) return cached;

  // Fetch teams sequentially to avoid TheSportsDB free-tier rate limits
  const entries: Omit<IPLPlayerResult, 'fantasyValue'>[][] = [];
  for (const [teamAbbr, teamId] of Object.entries(IPL_TEAM_IDS)) {
    try {
      const playersRes = await axios.get(
        `https://www.thesportsdb.com/api/v1/json/3/lookup_all_players.php?id=${teamId}`,
        { timeout: 8000 }
      );
      const players: any[] = playersRes.data?.player ?? [];
      const teamBadge: string | null = IPL_TEAM_BADGES[teamAbbr] ?? null;
      entries.push(players.map(p => ({
        id: String(p.idPlayer ?? ''),
        name: p.strPlayer ?? '',
        position: mapPosition(p.strPosition),
        team: teamAbbr,
        nationality: p.strNationality ?? '',
        photo: p.strThumb || p.strCutout || teamBadge,
        fantasyValue: 0, // will be set below
      })));
    } catch {
      entries.push([]);
    }
    await new Promise(r => setTimeout(r, 200));
  }

  const flat: Omit<IPLPlayerResult, 'fantasyValue'>[] = entries.flat();

  // Assign fantasy values: base score minus within-position index (alphabetical)
  const byPosition: Record<string, Omit<IPLPlayerResult, 'fantasyValue'>[]> = {};
  for (const p of flat) {
    if (!byPosition[p.position]) byPosition[p.position] = [];
    byPosition[p.position].push(p);
  }
  for (const pos of Object.keys(byPosition)) {
    byPosition[pos].sort((a, b) => a.name.localeCompare(b.name));
  }

  const results: IPLPlayerResult[] = flat.map(p => {
    const idx = byPosition[p.position].indexOf(p);
    return { ...p, fantasyValue: Math.max(1, (POSITION_BASE[p.position] ?? 45) - idx) };
  });

  cache.set(CACHE_KEY, results, CACHE_TTL);
  return results;
}

export async function searchPlayers(q: string, position?: string): Promise<IPLPlayerResult[]> {
  const all = await getAllIPLPlayers();
  const query = q.trim().toLowerCase();
  return all.filter(p => {
    const nameMatch = !query || p.name.toLowerCase().includes(query);
    const posMatch = !position || p.position === position.toUpperCase();
    return nameMatch && posMatch;
  });
}

export async function getTopPlayers(position?: string, limit = 100): Promise<IPLPlayerResult[]> {
  const all = await getAllIPLPlayers();
  const filtered = position
    ? all.filter(p => p.position === position.toUpperCase())
    : all;
  return filtered
    .sort((a, b) => b.fantasyValue - a.fantasyValue)
    .slice(0, limit);
}

export async function getPlayerByName(name: string): Promise<IPLPlayerResult | null> {
  const all = await getAllIPLPlayers();
  const lower = name.toLowerCase();
  return all.find(p => p.name.toLowerCase() === lower) ?? null;
}
