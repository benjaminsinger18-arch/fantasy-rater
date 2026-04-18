import { Router } from 'express';
import crypto from 'crypto';
import * as sleeper from '../services/platforms/sleeper.js';
import * as espn from '../services/platforms/espn.js';
import { storePrompt } from '../services/claude.js';
import { MLB_POSITION_BASE } from '../services/rater.js';
import type { RaterPlayer } from '../services/rater.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

const VALID_SPORTS = new Set(['nfl', 'mlb', 'fpl', 'ipl', 'nba']);
function sanitize(s: unknown, maxLen = 60): string {
  return String(s ?? '').replace(/[\r\n\t\x00-\x1F\x7F]/g, ' ').slice(0, maxLen);
}

const POSITION_BASE: Record<string, number> = {
  QB: 45, RB: 38, WR: 36, TE: 30, K: 20, DEF: 20,
  ...MLB_POSITION_BASE,
};

function rankToValue(rank: number | null | undefined, position: string): number {
  if (rank && rank > 0) return Math.round(Math.max(5, 100 / (1 + rank / 30)));
  return POSITION_BASE[position?.toUpperCase()] ?? 25;
}

// Count positions in my picks
function countPositions(players: RaterPlayer[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const p of players) {
    counts[p.position] = (counts[p.position] ?? 0) + 1;
  }
  return counts;
}

// Determine positional needs based on round and what's been drafted
function getPositionalNeed(myPicks: RaterPlayer[], totalTeams: number, currentPick: number, sport: string): string {
  const round = Math.ceil(currentPick / totalTeams);
  const counts = countPositions(myPicks);

  if (sport === 'mlb') {
    const ofs = counts['OF'] ?? 0;
    const sps = counts['SP'] ?? 0;
    const ss = counts['SS'] ?? 0;
    const first = counts['1B'] ?? 0;
    if (round <= 3) return ofs < 2 ? 'OF' : sps < 1 ? 'SP' : 'OF';
    if (round <= 6) return sps < 2 ? 'SP' : ss < 1 ? 'SS' : ofs < 3 ? 'OF' : '2B';
    if (round <= 9) return counts['C'] ? 'RP' : 'C';
    return first < 1 ? '1B' : 'RP';
  }

  const qbs = counts['QB'] ?? 0;
  const rbs = counts['RB'] ?? 0;
  const wrs = counts['WR'] ?? 0;
  const tes = counts['TE'] ?? 0;

  if (round <= 3) return rbs < 2 ? 'RB' : wrs < 2 ? 'WR' : 'RB';
  if (round <= 6) return tes < 1 ? 'TE' : qbs < 1 ? 'QB' : rbs < 3 ? 'RB' : 'WR';
  if (round <= 9) return qbs < 1 ? 'QB' : tes < 1 ? 'TE' : 'WR';
  return 'RB';
}

// POST /api/draft/recommend
router.post('/recommend', requireAuth('pro'), async (req, res) => {
  const {
    pickedPlayerIds = [],
    myPickedPlayerIds = [],
    pickPosition = 1,
    totalTeams = 12,
    sport = 'nfl',
    scoringFormat = 'PPR',
    currentPick = 1,
  } = req.body as {
    pickedPlayerIds?: string[];
    myPickedPlayerIds?: string[];
    pickPosition?: number;
    totalTeams?: number;
    sport?: string;
    scoringFormat?: string;
    currentPick?: number;
  };

  if (!VALID_SPORTS.has(sport.toLowerCase())) {
    return res.status(400).json({ error: 'Invalid sport' });
  }

  try {
    const pickedSet = new Set(pickedPlayerIds.map(String));
    const myPickedSet = new Set(myPickedPlayerIds.map(String));

    let myPicks: RaterPlayer[] = [];
    let topPicks: (RaterPlayer & { id: string; searchRank: number })[] = [];

    if (sport === 'mlb') {
      // MLB: use ESPN public search for top players by key positions
      const mlbPositions = ['OF', 'SP', '1B', 'SS', '2B', '3B', 'C', 'RP'];
      const searches = await Promise.all(mlbPositions.map(pos =>
        espn.searchPlayersPublic('mlb', pos).catch(() => [])
      ));
      const allEspnPlayers = searches.flat().filter((p, i, arr) =>
        arr.findIndex(x => x.espnId === p.espnId) === i &&
        !pickedSet.has(String(p.espnId)) &&
        !myPickedSet.has(String(p.espnId))
      );

      // Build my current picks from the picked ids names
      myPicks = myPickedPlayerIds.map(id => {
        const p = allEspnPlayers.find(x => String(x.espnId) === String(id));
        if (!p) return null;
        return { name: p.name, position: p.position, team: p.team, rank: rankToValue(null, p.position) } as RaterPlayer;
      }).filter(Boolean) as RaterPlayer[];

      topPicks = allEspnPlayers.slice(0, 15).map(p => ({
        id: String(p.espnId),
        name: p.name,
        position: p.position,
        team: p.team,
        injuryStatus: p.injuryStatus,
        rank: rankToValue(null, p.position),
        searchRank: 0,
      }));
    } else {
      const allPlayers = await sleeper.getAllPlayers();

      myPicks = myPickedPlayerIds
        .map(id => {
          const p = allPlayers[id];
          if (!p) return null;
          return { name: p.full_name, position: p.position, team: p.team ?? 'FA', rank: rankToValue(p.search_rank, p.position) } as RaterPlayer;
        })
        .filter(Boolean) as RaterPlayer[];

      const available = Object.values(allPlayers)
        .filter(p =>
          !pickedSet.has(p.player_id) &&
          !myPickedSet.has(p.player_id) &&
          p.status !== 'Inactive' &&
          p.search_rank != null &&
          p.search_rank > 0 &&
          ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].includes(p.position)
        )
        .sort((a, b) => (a.search_rank || 9999) - (b.search_rank || 9999))
        .slice(0, 50);

      topPicks = available.slice(0, 15).map(p => ({
        id: p.player_id,
        name: p.full_name,
        position: p.position,
        team: p.team ?? 'FA',
        injuryStatus: p.injury_status,
        rank: rankToValue(p.search_rank, p.position),
        searchRank: p.search_rank,
      }));
    }

    const round = Math.ceil(currentPick / totalTeams);
    const positionalNeed = getPositionalNeed(myPicks, totalTeams, currentPick, sport);
    const posCounts = countPositions(myPicks);

    // Tier best available into tiers (top 5 = elite, 6-10 = solid, 11-15 = depth)
    const tier1 = topPicks.slice(0, 5);
    const tier2 = topPicks.slice(5, 10);
    const tier3 = topPicks.slice(10, 15);

    const myTeamLine = myPicks.length > 0
      ? myPicks.map(p => `${sanitize(p.name)} (${sanitize(p.position, 10)})`).join(', ')
      : 'No picks yet';

    const posCountLine = Object.entries(posCounts).map(([pos, c]) => `${pos}: ${c}`).join(', ') || 'None';

    const prompt = `SPORT: ${sanitize(sport, 20).toUpperCase()} | FORMAT: ${sanitize(scoringFormat, 20)}

=== DRAFT ASSISTANT ===
Round ${round}, Pick ${currentPick} overall (Position ${pickPosition} of ${totalTeams})
My current team: ${myTeamLine}
Position counts: ${posCountLine}
Biggest need: ${positionalNeed}

TOP AVAILABLE (by ADP/search rank):
TIER 1 (Elite):
${tier1.map(p => `  • ${sanitize(p.name)} (${sanitize(p.position, 10)}, ${sanitize(p.team, 10)}) — ADP rank #${p.searchRank}`).join('\n')}

TIER 2 (Solid):
${tier2.map(p => `  • ${sanitize(p.name)} (${sanitize(p.position, 10)}, ${sanitize(p.team, 10)}) — ADP rank #${p.searchRank}`).join('\n')}

TIER 3 (Depth):
${tier3.map(p => `  • ${sanitize(p.name)} (${sanitize(p.position, 10)}, ${sanitize(p.team, 10)}) — ADP rank #${p.searchRank}`).join('\n')}

In 2-3 sentences: recommend who to draft with this pick (name them directly), explain why based on ADP value and team need, and flag any positional scarcity. Be direct.`;

    const hash = crypto.createHash('sha256').update(prompt).digest('hex').slice(0, 16);
    storePrompt(hash, prompt);

    return res.json({
      topPicks,
      tier1,
      tier2,
      tier3,
      round,
      positionalNeed,
      positionCounts: posCounts,
      analysisHash: hash,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
});

export default router;
