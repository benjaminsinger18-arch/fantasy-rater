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

// Seed list of well-known IPL players — guarantees enough data even when TheSportsDB has gaps
const IPL_SEED_PLAYERS: Array<Omit<IPLPlayerResult, 'fantasyValue'>> = [
  // AR — All-Rounders
  { id: 'seed_ar1',  name: 'Hardik Pandya',       position: 'AR',   team: 'MI',   nationality: 'India',       photo: null },
  { id: 'seed_ar2',  name: 'Ravindra Jadeja',      position: 'AR',   team: 'CSK',  nationality: 'India',       photo: null },
  { id: 'seed_ar3',  name: 'Axar Patel',           position: 'AR',   team: 'DC',   nationality: 'India',       photo: null },
  { id: 'seed_ar4',  name: 'Shivam Dube',          position: 'AR',   team: 'CSK',  nationality: 'India',       photo: null },
  { id: 'seed_ar5',  name: 'Mitchell Marsh',       position: 'AR',   team: 'DC',   nationality: 'Australia',   photo: null },
  { id: 'seed_ar6',  name: 'Liam Livingstone',     position: 'AR',   team: 'PBKS', nationality: 'England',     photo: null },
  { id: 'seed_ar7',  name: 'Marcus Stoinis',       position: 'AR',   team: 'LSG',  nationality: 'Australia',   photo: null },
  { id: 'seed_ar8',  name: 'Krunal Pandya',        position: 'AR',   team: 'LSG',  nationality: 'India',       photo: null },
  { id: 'seed_ar9',  name: 'Venkatesh Iyer',       position: 'AR',   team: 'KKR',  nationality: 'India',       photo: null },
  { id: 'seed_ar10', name: 'Washington Sundar',    position: 'AR',   team: 'GT',   nationality: 'India',       photo: null },
  { id: 'seed_ar11', name: 'Romario Shepherd',     position: 'AR',   team: 'LSG',  nationality: 'West Indies', photo: null },
  { id: 'seed_ar12', name: 'Jason Holder',         position: 'AR',   team: 'RR',   nationality: 'West Indies', photo: null },
  { id: 'seed_ar13', name: 'Cameron Green',        position: 'AR',   team: 'MI',   nationality: 'Australia',   photo: null },
  { id: 'seed_ar14', name: 'Tim David',            position: 'AR',   team: 'MI',   nationality: 'Singapore',   photo: null },
  { id: 'seed_ar15', name: 'Shardul Thakur',       position: 'AR',   team: 'CSK',  nationality: 'India',       photo: null },
  { id: 'seed_ar16', name: 'Moeen Ali',            position: 'AR',   team: 'CSK',  nationality: 'England',     photo: null },
  { id: 'seed_ar17', name: 'Nitish Kumar Reddy',   position: 'AR',   team: 'SRH',  nationality: 'India',       photo: null },
  { id: 'seed_ar18', name: 'Rinku Singh',          position: 'AR',   team: 'KKR',  nationality: 'India',       photo: null },
  { id: 'seed_ar19', name: 'Deepak Hooda',         position: 'AR',   team: 'LSG',  nationality: 'India',       photo: null },
  { id: 'seed_ar20', name: 'Alzarri Joseph',       position: 'AR',   team: 'MI',   nationality: 'West Indies', photo: null },
  { id: 'seed_ar21', name: 'Ashutosh Sharma',      position: 'AR',   team: 'PBKS', nationality: 'India',       photo: null },
  { id: 'seed_ar22', name: 'Sherfane Rutherford',  position: 'AR',   team: 'GT',   nationality: 'West Indies', photo: null },
  { id: 'seed_ar23', name: 'Tristan Stubbs',       position: 'AR',   team: 'MI',   nationality: 'South Africa',photo: null },
  { id: 'seed_ar24', name: 'Ramandeep Singh',      position: 'AR',   team: 'KKR',  nationality: 'India',       photo: null },
  { id: 'seed_ar25', name: 'Naman Dhir',           position: 'AR',   team: 'MI',   nationality: 'India',       photo: null },
  // BAT — Batters
  { id: 'seed_b1',   name: 'Virat Kohli',          position: 'BAT',  team: 'RCB',  nationality: 'India',       photo: null },
  { id: 'seed_b2',   name: 'Rohit Sharma',         position: 'BAT',  team: 'MI',   nationality: 'India',       photo: null },
  { id: 'seed_b3',   name: 'Shubman Gill',         position: 'BAT',  team: 'GT',   nationality: 'India',       photo: null },
  { id: 'seed_b4',   name: 'KL Rahul',             position: 'BAT',  team: 'LSG',  nationality: 'India',       photo: null },
  { id: 'seed_b5',   name: 'Faf du Plessis',       position: 'BAT',  team: 'RCB',  nationality: 'South Africa',photo: null },
  { id: 'seed_b6',   name: 'David Warner',         position: 'BAT',  team: 'DC',   nationality: 'Australia',   photo: null },
  { id: 'seed_b7',   name: 'Ruturaj Gaikwad',      position: 'BAT',  team: 'CSK',  nationality: 'India',       photo: null },
  { id: 'seed_b8',   name: 'Yashasvi Jaiswal',     position: 'BAT',  team: 'RR',   nationality: 'India',       photo: null },
  { id: 'seed_b9',   name: 'Devon Conway',         position: 'BAT',  team: 'CSK',  nationality: 'New Zealand', photo: null },
  { id: 'seed_b10',  name: 'Travis Head',          position: 'BAT',  team: 'SRH',  nationality: 'Australia',   photo: null },
  { id: 'seed_b11',  name: 'Prabhsimran Singh',    position: 'BAT',  team: 'PBKS', nationality: 'India',       photo: null },
  { id: 'seed_b12',  name: 'Quinton de Kock',      position: 'BAT',  team: 'LSG',  nationality: 'South Africa',photo: null },
  { id: 'seed_b13',  name: 'Rajat Patidar',        position: 'BAT',  team: 'RCB',  nationality: 'India',       photo: null },
  { id: 'seed_b14',  name: 'Sai Sudharsan',        position: 'BAT',  team: 'GT',   nationality: 'India',       photo: null },
  { id: 'seed_b15',  name: 'Jake Fraser-McGurk',   position: 'BAT',  team: 'DC',   nationality: 'Australia',   photo: null },
  { id: 'seed_b16',  name: 'Tilak Varma',          position: 'BAT',  team: 'MI',   nationality: 'India',       photo: null },
  { id: 'seed_b17',  name: 'Riyan Parag',          position: 'BAT',  team: 'RR',   nationality: 'India',       photo: null },
  { id: 'seed_b18',  name: 'Jonny Bairstow',       position: 'BAT',  team: 'PBKS', nationality: 'England',     photo: null },
  { id: 'seed_b19',  name: 'Aiden Markram',        position: 'BAT',  team: 'SRH',  nationality: 'South Africa',photo: null },
  { id: 'seed_b20',  name: 'Suryakumar Yadav',     position: 'BAT',  team: 'MI',   nationality: 'India',       photo: null },
  { id: 'seed_b21',  name: 'Shikhar Dhawan',       position: 'BAT',  team: 'PBKS', nationality: 'India',       photo: null },
  { id: 'seed_b22',  name: 'Ambati Rayudu',        position: 'BAT',  team: 'CSK',  nationality: 'India',       photo: null },
  { id: 'seed_b23',  name: 'Heinrich Klaasen',     position: 'BAT',  team: 'SRH',  nationality: 'South Africa',photo: null },
  { id: 'seed_b24',  name: 'Abhishek Sharma',      position: 'BAT',  team: 'SRH',  nationality: 'India',       photo: null },
  { id: 'seed_b25',  name: 'Mayank Agarwal',       position: 'BAT',  team: 'SRH',  nationality: 'India',       photo: null },
  // BOWL — Bowlers
  { id: 'seed_bw1',  name: 'Jasprit Bumrah',       position: 'BOWL', team: 'MI',   nationality: 'India',       photo: null },
  { id: 'seed_bw2',  name: 'Mohammed Shami',       position: 'BOWL', team: 'GT',   nationality: 'India',       photo: null },
  { id: 'seed_bw3',  name: 'Yuzvendra Chahal',     position: 'BOWL', team: 'RR',   nationality: 'India',       photo: null },
  { id: 'seed_bw4',  name: 'Rashid Khan',          position: 'BOWL', team: 'GT',   nationality: 'Afghanistan', photo: null },
  { id: 'seed_bw5',  name: 'Kuldeep Yadav',        position: 'BOWL', team: 'DC',   nationality: 'India',       photo: null },
  { id: 'seed_bw6',  name: 'T Natarajan',          position: 'BOWL', team: 'SRH',  nationality: 'India',       photo: null },
  { id: 'seed_bw7',  name: 'Bhuvneshwar Kumar',    position: 'BOWL', team: 'SRH',  nationality: 'India',       photo: null },
  { id: 'seed_bw8',  name: 'Arshdeep Singh',       position: 'BOWL', team: 'PBKS', nationality: 'India',       photo: null },
  { id: 'seed_bw9',  name: 'Harshal Patel',        position: 'BOWL', team: 'RCB',  nationality: 'India',       photo: null },
  { id: 'seed_bw10', name: 'Kagiso Rabada',        position: 'BOWL', team: 'PBKS', nationality: 'South Africa',photo: null },
  { id: 'seed_bw11', name: 'Mitchell Starc',       position: 'BOWL', team: 'KKR',  nationality: 'Australia',   photo: null },
  { id: 'seed_bw12', name: 'Pat Cummins',          position: 'BOWL', team: 'SRH',  nationality: 'Australia',   photo: null },
  { id: 'seed_bw13', name: 'Marco Jansen',         position: 'BOWL', team: 'SRH',  nationality: 'South Africa',photo: null },
  { id: 'seed_bw14', name: 'Spencer Johnson',      position: 'BOWL', team: 'GT',   nationality: 'Australia',   photo: null },
  { id: 'seed_bw15', name: 'Mohit Sharma',         position: 'BOWL', team: 'GT',   nationality: 'India',       photo: null },
  { id: 'seed_bw16', name: 'Lockie Ferguson',      position: 'BOWL', team: 'GT',   nationality: 'New Zealand', photo: null },
  { id: 'seed_bw17', name: 'Varun Chakravarthy',   position: 'BOWL', team: 'KKR',  nationality: 'India',       photo: null },
  { id: 'seed_bw18', name: 'Ravi Bishnoi',         position: 'BOWL', team: 'LSG',  nationality: 'India',       photo: null },
  { id: 'seed_bw19', name: 'Anrich Nortje',        position: 'BOWL', team: 'DC',   nationality: 'South Africa',photo: null },
  { id: 'seed_bw20', name: 'Deepak Chahar',        position: 'BOWL', team: 'CSK',  nationality: 'India',       photo: null },
  { id: 'seed_bw21', name: 'Trent Boult',          position: 'BOWL', team: 'MI',   nationality: 'New Zealand', photo: null },
  { id: 'seed_bw22', name: 'Gerald Coetzee',       position: 'BOWL', team: 'MI',   nationality: 'South Africa',photo: null },
  { id: 'seed_bw23', name: 'Mustafizur Rahman',    position: 'BOWL', team: 'CSK',  nationality: 'Bangladesh',  photo: null },
  { id: 'seed_bw24', name: 'Sandeep Sharma',       position: 'BOWL', team: 'SRH',  nationality: 'India',       photo: null },
  { id: 'seed_bw25', name: 'Simarjeet Singh',      position: 'BOWL', team: 'CSK',  nationality: 'India',       photo: null },
  // WK — Wicketkeepers
  { id: 'seed_wk1',  name: 'MS Dhoni',             position: 'WK',   team: 'CSK',  nationality: 'India',       photo: null },
  { id: 'seed_wk2',  name: 'Jos Buttler',          position: 'WK',   team: 'RR',   nationality: 'England',     photo: null },
  { id: 'seed_wk3',  name: 'Rishabh Pant',         position: 'WK',   team: 'DC',   nationality: 'India',       photo: null },
  { id: 'seed_wk4',  name: 'Sanju Samson',         position: 'WK',   team: 'RR',   nationality: 'India',       photo: null },
  { id: 'seed_wk5',  name: 'Ishan Kishan',         position: 'WK',   team: 'MI',   nationality: 'India',       photo: null },
  { id: 'seed_wk6',  name: 'Dinesh Karthik',       position: 'WK',   team: 'RCB',  nationality: 'India',       photo: null },
  { id: 'seed_wk7',  name: 'Nicholas Pooran',      position: 'WK',   team: 'LSG',  nationality: 'West Indies', photo: null },
  { id: 'seed_wk8',  name: 'Phil Salt',            position: 'WK',   team: 'KKR',  nationality: 'England',     photo: null },
  { id: 'seed_wk9',  name: 'Wriddhiman Saha',      position: 'WK',   team: 'GT',   nationality: 'India',       photo: null },
  { id: 'seed_wk10', name: 'Rahul Tewatia',        position: 'WK',   team: 'GT',   nationality: 'India',       photo: null },
];

const CACHE_KEY = 'ipl:all_players';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function getAllIPLPlayers(): Promise<IPLPlayerResult[]> {
  const cached = cache.get<IPLPlayerResult[]>(CACHE_KEY);
  if (cached) return cached;

  // Fetch all teams in parallel; retry each failed team once after a short delay
  const fetchTeam = async (teamAbbr: string, teamId: number): Promise<Omit<IPLPlayerResult, 'fantasyValue'>[]> => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const playersRes = await axios.get(
          `https://www.thesportsdb.com/api/v1/json/3/lookup_all_players.php?id=${teamId}`,
          { timeout: 8000 }
        );
        const players: any[] = playersRes.data?.player ?? [];
        const teamBadge: string | null = IPL_TEAM_BADGES[teamAbbr] ?? null;
        return players.map(p => ({
          id: String(p.idPlayer ?? ''),
          name: p.strPlayer ?? '',
          position: mapPosition(p.strPosition),
          team: teamAbbr,
          nationality: p.strNationality ?? '',
          photo: p.strThumb || p.strCutout || teamBadge,
          fantasyValue: 0, // will be set below
        }));
      } catch {
        if (attempt === 0) await new Promise(r => setTimeout(r, 1000));
      }
    }
    return [];
  };

  const entries = await Promise.all(
    Object.entries(IPL_TEAM_IDS).map(([teamAbbr, teamId]) => fetchTeam(teamAbbr, teamId))
  );

  const flat: Omit<IPLPlayerResult, 'fantasyValue'>[] = entries.flat();

  // Merge seed players: add any seed not already present (matched by name)
  const existingNames = new Set(flat.map(p => p.name.toLowerCase()));
  for (const seed of IPL_SEED_PLAYERS) {
    if (!existingNames.has(seed.name.toLowerCase())) {
      // Use team badge as photo fallback for seeds
      flat.push({ ...seed, photo: seed.photo ?? IPL_TEAM_BADGES[seed.team] ?? null });
    }
  }

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
