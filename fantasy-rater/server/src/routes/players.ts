import { Router } from 'express';
import axios from 'axios';
import * as sleeper from '../services/platforms/sleeper.js';
import * as fpl from '../services/platforms/fpl.js';
import * as espn from '../services/platforms/espn.js';
import * as ipl from '../services/platforms/ipl.js';
import { cache } from '../cache/memcache.js';

const router = Router();

const POSITION_BASE_SCORE: Record<string, number> = {
  QB: 45, RB: 38, WR: 36, TE: 30, K: 20, DEF: 20, DST: 20,
  // FPL
  GK: 22, DEF_FPL: 30, MID: 38, FWD: 35,
};

function normalizeRanks<T extends { rank?: number }>(players: T[]): T[] {
  const n = players.length;
  if (n === 0) return players;
  if (n === 1) return [{ ...players[0], rank: 99 }];
  return players.map((p, i) => ({
    ...p,
    rank: Math.round(99 - (i / (n - 1)) * 98), // i=0 → 99, i=n-1 → 1
  }));
}

function rankToFantasyValue(rank: number | null | undefined, position: string): number {
  if (rank && rank > 0) {
    return Math.round(Math.max(5, 100 / (1 + rank / 30)));
  }
  return POSITION_BASE_SCORE[position?.toUpperCase()] ?? 25;
}

// GET /api/players/gameweek?sport=fpl  — returns current FPL gameweek
router.get('/gameweek', async (req, res) => {
  const { sport = 'nfl' } = req.query as Record<string, string>;
  try {
    if (sport === 'fpl') {
      const bootstrap = await fpl.getBootstrap();
      const current = bootstrap.events.find(e => e.is_current) ?? bootstrap.events.find(e => e.is_next);
      return res.json({ currentWeek: current?.id ?? 1 });
    }
    return res.json({ currentWeek: 1 });
  } catch {
    return res.json({ currentWeek: 1 });
  }
});

// GET /api/players/search?q=mahomes&sport=nfl&position=QB&platform=sleeper&week=1
router.get('/search', async (req, res) => {
  const { q = '', sport = 'nfl', position, platform = 'sleeper', leagueId, espnS2, swid, week = '1' } = req.query as Record<string, string>;

  try {
    if (sport === 'fpl') {
      const results = await fpl.searchPlayers(q, position);
      return res.json(results.map(p => ({
        ...p,
        rank: p.fantasyValue, // computed from ep_next, form, total_points
      })));
    }

    if ((platform === 'espn' || sport === 'mlb') && leagueId) {
      const results = await espn.searchPlayers(leagueId, sport as 'nfl' | 'mlb', q, espnS2, swid);
      return res.json(results.map(p => ({
        id: String(p.espnId),
        espnId: p.espnId,
        name: p.name,
        position: p.position,
        team: p.team,
        injuryStatus: p.injuryStatus,
        rank: rankToFantasyValue(null, p.position),
      })));
    }

    if (sport === 'mlb') {
      // Public search — no leagueId required
      const results = await espn.searchPlayersPublic('mlb', q);
      return res.json(results.map(p => ({
        id: String(p.espnId),
        espnId: p.espnId,
        name: p.name,
        position: p.position,
        team: p.team,
        injuryStatus: p.injuryStatus,
        rank: rankToFantasyValue(null, p.position),
      })));
    }

    if (sport === 'ipl') {
      const results = await ipl.searchPlayers(q, position);
      return res.json(results.map(p => ({
        id: p.id,
        name: p.name,
        position: p.position,
        team: p.team,
        nationality: p.nationality,
        rank: p.fantasyValue,
        photo: p.photo,
      })));
    }

    // Default: Sleeper (NFL)
    const [results, projections] = await Promise.all([
      sleeper.searchPlayers(q, position),
      sleeper.getProjections(Number(week)).catch(() => ({} as Record<string, Record<string, number>>)),
    ]);
    return res.json(results.map(p => ({
      id: p.player_id,
      espnId: p.espn_id ? Number(p.espn_id) : undefined,
      rotowireId: p.rotowire_id ?? undefined,
      name: p.full_name,
      position: p.position,
      team: p.team,
      injuryStatus: p.injury_status,
      age: p.age,
      yearsExp: p.years_exp,
      rank: rankToFantasyValue(p.search_rank, p.position),
      searchRank: p.search_rank ?? null,
      avgPoints: projections[p.player_id]?.pts_ppr ?? undefined,
    })));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// GET /api/players/rankings?sport=nfl&position=QB&week=1
router.get('/rankings', async (req, res) => {
  const { sport = 'nfl', position, week = '1', leagueId, espnS2, swid } = req.query as Record<string, string>;
  try {
    if (sport === 'mlb') {
      const pos = position?.toUpperCase();
      const results = await espn.getTopMLBPlayers(pos, 100);
      return res.json(normalizeRanks(results.map(p => ({
        id: String(p.espnId),
        espnId: p.espnId,
        name: p.name,
        position: p.position,
        team: p.team,
        injuryStatus: p.injuryStatus,
        percentOwned: p.percentOwned,
        rank: 0,
      }))));
    }

    if (sport === 'fpl') {
      const results = await fpl.searchPlayers('', position, 500);
      const sorted = results
        .map(p => ({ ...p, rank: p.fantasyValue }))
        .sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0))
        .slice(0, 100);
      return res.json(normalizeRanks(sorted));
    }

    if (sport === 'ipl') {
      const results = await ipl.getTopPlayers(position?.toUpperCase(), 100);
      return res.json(normalizeRanks(results.map(p => ({
        id: p.id,
        name: p.name,
        position: p.position,
        team: p.team,
        nationality: p.nationality,
        rank: p.fantasyValue,
        photo: p.photo,
      }))));
    }

    const [all, projections] = await Promise.all([
      sleeper.getAllPlayers(),
      sleeper.getProjections(Number(week)).catch(() => ({} as Record<string, Record<string, number>>)),
    ]);
    const players = Object.values(all)
      .filter(p => {
        const posMatch = position ? p.position === position.toUpperCase() : ['QB','RB','WR','TE','K','DEF'].includes(p.position);
        const isDef = p.position === 'DEF';
        return p.status !== 'Inactive' && posMatch && (isDef || (p.search_rank != null && p.search_rank > 0));
      })
      .sort((a, b) => {
        if (!a.search_rank && !b.search_rank) {
          const aProj = projections[a.player_id]?.pts_ppr ?? 0;
          const bProj = projections[b.player_id]?.pts_ppr ?? 0;
          if (aProj !== bProj) return bProj - aProj;
          return (a.team || '').localeCompare(b.team || '');
        }
        return (a.search_rank || 9999) - (b.search_rank || 9999);
      })
      .slice(0, 100)
      .map(p => {
        const defPts = projections[p.player_id]?.pts_ppr;
        const defRank = p.position === 'DEF'
          ? (defPts ? Math.min(90, Math.round(defPts * 4)) : POSITION_BASE_SCORE.DEF)
          : rankToFantasyValue(p.search_rank, p.position);
        return {
          id: p.player_id,
          espnId: p.espn_id ? Number(p.espn_id) : undefined,
          rotowireId: p.rotowire_id ?? undefined,
          name: p.full_name || p.team,
          position: p.position,
          team: p.team,
          injuryStatus: p.injury_status,
          age: p.age,
          yearsExp: p.years_exp,
          rank: defRank,
          searchRank: p.search_rank ?? null,
          avgPoints: projections[p.player_id]?.pts_ppr ?? undefined,
        };
      });
    return res.json(normalizeRanks(players));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// GET /api/players/:id/history?sport=nfl
router.get('/:id/history', async (req, res) => {
  const { id } = req.params;
  const { sport = 'nfl' } = req.query as Record<string, string>;
  try {
    if (sport === 'fpl') {
      const detail = await fpl.getPlayerDetail(Number(id));
      const history = (detail.history ?? []).slice(-5).reverse().map((h: Record<string, number>) => ({
        round: h.round,
        points: h.total_points,
        minutes: h.minutes,
        goals: h.goals_scored,
        assists: h.assists,
        cleanSheets: h.clean_sheets,
        bonus: h.bonus,
        yellowCards: h.yellow_cards,
      }));
      return res.json(history);
    }
    const stats = await sleeper.getPlayerWeeklyStats(id);
    const weeks = Object.entries(stats)
      .map(([week, s]) => ({
        round: Number(week),
        points: s.pts_ppr ?? s.pts_std ?? 0,
        passYd: s.pass_yd ?? 0,
        passTd: s.pass_td ?? 0,
        rushYd: s.rush_yd ?? 0,
        rushTd: s.rush_td ?? 0,
        rec: s.rec ?? 0,
        recYd: s.rec_yd ?? 0,
        recTd: s.rec_td ?? 0,
      }))
      .sort((a, b) => b.round - a.round)
      .slice(0, 5);
    return res.json(weeks);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// GET /api/players/photo?name=Patrick+Mahomes&team=GB&sport=nfl — server-side photo lookup
router.get('/photo', async (req, res) => {
  const { name, team, sport = 'nfl', teamCode } = req.query as { name: string; team?: string; sport?: string; teamCode?: string };
  if (!name) return res.status(400).json({ url: null });

  const cacheKey = `photo:${sport}:${name.toLowerCase().trim()}`;
  const cached = cache.get<string>(cacheKey);
  if (cached === 'none') return res.json({ url: null });
  if (cached) return res.json({ url: cached });

  let url: string | null = null;

  if (sport === 'fpl') {
    // TheSportsDB — try full name, then first-2-words, then last-2-words (handles "El Hadji X Y" → "X Y")
    const nameParts = name.trim().split(' ');
    const firstName2 = nameParts.length > 2 ? nameParts.slice(0, 2).join(' ') : null;
    const lastName2 = nameParts.length > 2 ? nameParts.slice(-2).join(' ') : null;
    const shortNames: string[] = [...new Set([firstName2, lastName2].filter((x): x is string => !!x))];
    for (const tryName of [name.trim(), ...shortNames]) {
      if (url) break;
      try {
        const tsdb = await axios.get(
          `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(tryName)}`,
          { timeout: 4000 }
        );
        const players: any[] = tsdb.data?.player ?? [];
        // Prefer the player whose team matches the provided team param
        const p = team
          ? players.find(pl => pl.strTeam?.toLowerCase().includes(team.toLowerCase().replace("nott'm", 'nottingham'))) ?? players[0]
          : players[0];
        const candidate = p?.strThumb || p?.strCutout || null;
        if (candidate) {
          const check = await axios.head(candidate, { timeout: 2000 }).catch(() => null);
          if (check?.status === 200) url = candidate;
        }
      } catch { /* fall through */ }
    }

    // ESPN Premier League headshot search
    if (!url) {
      const espnQuery = firstName2 ?? name.trim();
      try {
        const espnRes = await axios.get(
          `https://site.web.api.espn.com/apis/common/v3/search?query=${encodeURIComponent(espnQuery)}&sport=soccer&league=eng.1&limit=3`,
          { timeout: 4000 }
        );
        const espnId = espnRes.data?.items?.[0]?.id ?? espnRes.data?.results?.[0]?.items?.[0]?.id;
        if (espnId) {
          const candidate = `https://a.espncdn.com/i/headshots/soccer/players/full/${espnId}.png`;
          const check = await axios.head(candidate, { timeout: 2000 }).catch(() => null);
          if (check?.status === 200) url = candidate;
        }
      } catch { /* fall through */ }
    }
    // No badge fallback — position placeholder is cleaner than a team crest
  } else if (sport === 'ipl') {
    // 1. Check in-memory cache (TheSportsDB players already fetched by team)
    const cachedPlayer = await ipl.getPlayerByName(name.trim());
    if (cachedPlayer?.photo && !cachedPlayer.photo.startsWith('https://upload.wikimedia')) url = cachedPlayer.photo;

    // 2. TheSportsDB Cricket search — try full name then last word (handles "MS Dhoni" → "Dhoni")
    //    &s=Cricket prevents wrong-sport matches (e.g. Nortje=rugby, Klaasen=tennis)
    if (!url) {
      const iplNameParts = name.trim().split(' ');
      const iplLastWord = iplNameParts.length > 1 ? iplNameParts[iplNameParts.length - 1] : null;
      const iplTeamNames: Record<string, string> = {
        CSK: 'chennai', MI: 'mumbai', RCB: 'royal challengers', KKR: 'kolkata',
        DC: 'delhi', PBKS: 'punjab', RR: 'rajasthan', SRH: 'sunrisers',
        GT: 'gujarat', LSG: 'lucknow',
      };
      const iplTeamHint = team ? (iplTeamNames[team.toUpperCase()] ?? team.toLowerCase()) : null;
      for (const tryName of [...new Set([name.trim(), iplLastWord].filter((x): x is string => !!x))]) {
        if (url) break;
        try {
          const tsdb = await axios.get(
            `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(tryName)}&s=Cricket`,
            { timeout: 4000 }
          );
          const iplPlayers: any[] = tsdb.data?.player ?? [];
          const p = iplTeamHint
            ? iplPlayers.find(pl => pl.strTeam?.toLowerCase().includes(iplTeamHint)) ?? iplPlayers[0]
            : iplPlayers[0];
          const candidate = p?.strThumb || p?.strCutout || null;
          if (candidate) url = candidate;
        } catch { /* fall through */ }
      }
    }

    // 3. ESPN cricket search — covers international stars well
    if (!url) {
      try {
        const espnCricket = await axios.get(
          `https://site.web.api.espn.com/apis/common/v3/search?query=${encodeURIComponent(name.trim())}&limit=3&type=player&sport=cricket`,
          { timeout: 4000 }
        );
        const espnId = espnCricket.data?.items?.[0]?.id;
        if (espnId) {
          const candidate = `https://a.espncdn.com/i/headshots/cricket/players/full/${espnId}.png`;
          const check = await axios.head(candidate, { timeout: 3000 }).catch(() => null);
          if (check?.status === 200) url = candidate;
        }
      } catch { /* fall through */ }
    }

    // 4. Wikipedia search fallback — covers players absent from ESPN/TheSportsDB
    //    Use generator=search with +cricket to get the right person in one call
    if (!url) {
      try {
        const wiki = await axios.get(
          `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(name.trim())}+cricket&gsrlimit=1&prop=pageimages&pithumbsize=250&pilicense=any&format=json`,
          { timeout: 4000, headers: { 'User-Agent': 'FantasyRater/1.0 (fantasy-rater app; contact@fantasyrater.app)' } }
        );
        const pages = wiki.data?.query?.pages ?? {};
        const page = Object.values(pages)[0] as any;
        const thumb = page?.thumbnail?.source;
        // Reject SVGs — those are logos, not headshots
        if (thumb && !thumb.endsWith('.svg')) url = thumb;
      } catch { /* fall through */ }
    }
  } else if (sport === 'mlb') {
    // MLB: ESPN baseball headshot
    try {
      const espnSearch = await axios.get(
        `https://site.web.api.espn.com/apis/common/v3/search?query=${encodeURIComponent(name.trim())}&limit=3&type=player&sport=baseball&league=mlb`,
        { timeout: 4000 }
      );
      const espnId = espnSearch.data?.items?.[0]?.id;
      if (espnId) {
        const candidate = `https://a.espncdn.com/i/headshots/mlb/players/full/${espnId}.png`;
        const check = await axios.head(candidate, { timeout: 3000 }).catch(() => null);
        if (check?.status === 200) url = candidate;
      }
    } catch { /* fall through */ }

    // TheSportsDB baseball fallback
    if (!url) {
      try {
        const tsdb = await axios.get(
          `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(name.trim())}&s=Baseball`,
          { timeout: 4000 }
        );
        const p = tsdb.data?.player?.[0];
        url = p?.strThumb || p?.strCutout || null;
      } catch { /* fall through */ }
    }
  } else {
    // NFL DEF unit — return a key defender's face from the team roster
    const isDefUnit = (req.query.position === 'DEF') || name.includes('D/ST');
    if (isDefUnit && team) {
      try {
        const rosterRes = await axios.get(
          `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${team.toLowerCase()}/roster`,
          { timeout: 4000 }
        );
        const defPositions = new Set(['LB', 'DL', 'DB', 'DE', 'DT', 'CB', 'S', 'MLB', 'OLB', 'ILB', 'FS', 'SS']);
        outer: for (const group of rosterRes.data?.athletes ?? []) {
          for (const athlete of group?.items ?? []) {
            if (defPositions.has(athlete.position?.abbreviation) && athlete.headshot?.href) {
              url = athlete.headshot.href;
              break outer;
            }
          }
        }
      } catch { /* fall through */ }
    }

    // 1. ESPN NFL name search (for non-DEF players)
    if (!url) {
      try {
        const espnSearch = await axios.get(
          `https://site.web.api.espn.com/apis/common/v3/search?query=${encodeURIComponent(name.trim())}&limit=3&mode=prefix&type=player&sport=football&league=nfl`,
          { timeout: 4000 }
        );
        const espnId = espnSearch.data?.results?.[0]?.items?.[0]?.id;
        if (espnId) {
          const candidate = `https://a.espncdn.com/i/headshots/nfl/players/full/${espnId}.png`;
          const check = await axios.head(candidate, { timeout: 3000 }).catch(() => null);
          if (check?.status === 200) url = candidate;
        }
      } catch { /* fall through */ }
    }

    // 2. ESPN team roster lookup (most comprehensive — covers every active rostered player)
    if (!url && team && !isDefUnit) {
      try {
        const rosterRes = await axios.get(
          `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${team.toLowerCase()}/roster`,
          { timeout: 4000 }
        );
        const nameLower = name.toLowerCase();
        for (const group of rosterRes.data?.athletes ?? []) {
          for (const athlete of group?.items ?? []) {
            if ((athlete.fullName ?? '').toLowerCase() === nameLower) {
              const headshot = athlete.headshot?.href;
              if (headshot) { url = headshot; break; }
            }
          }
          if (url) break;
        }
      } catch { /* fall through */ }
    }

    // 3. TheSportsDB fallback
    if (!url) {
      try {
        const tsdb = await axios.get(
          `https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(name.trim())}`,
          { timeout: 4000 }
        );
        const p = tsdb.data?.player?.[0];
        url = p?.strThumb || p?.strCutout || null;
      } catch { /* fall through */ }
    }
  }

  const failureTtl = sport === 'ipl' ? 30 * 1000 : 5 * 60 * 1000;
  cache.set(cacheKey, url ?? 'none', url ? 24 * 60 * 60 * 1000 : failureTtl);
  return res.json({ url });
});

// DELETE /api/players/photo-cache?sport=fpl — bust all cached photo entries for a sport
router.delete('/photo-cache', (req, res) => {
  const { sport = 'fpl' } = req.query as { sport?: string };
  const prefix = `photo:${sport}:`;
  cache.invalidatePrefix(prefix);
  res.json({ cleared: true, prefix });
});

// GET /api/players/trending?sport=nfl&type=add
router.get('/trending', async (req, res) => {
  const { type = 'add' } = req.query as { type: 'add' | 'drop' };
  try {
    const data = await sleeper.getTrending(type);
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export default router;
