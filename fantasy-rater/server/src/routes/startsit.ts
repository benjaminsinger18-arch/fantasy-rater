import { Router } from 'express';
import crypto from 'crypto';
import * as sleeper from '../services/platforms/sleeper.js';
import { scorePlayer } from '../services/rater.js';
import { storePrompt } from '../services/claude.js';
import type { RaterPlayer } from '../services/rater.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { checkUsage } from '../middleware/usageLimit.js';

const router = Router();

const VALID_SPORTS = new Set(['nfl', 'mlb', 'fpl', 'ipl', 'nba']);
function sanitize(s: unknown, maxLen = 60): string {
  return String(s ?? '').replace(/[\r\n\t\x00-\x1F\x7F]/g, ' ').slice(0, maxLen);
}

// POST /api/startsit/compare
router.post('/compare', requireAuth('free'), checkUsage('startsit', 2), async (req, res) => {
  const { players, sport = 'nfl', scoringFormat = 'PPR', week = 1 } = req.body as {
    players: (RaterPlayer & { id?: string })[];
    sport?: string;
    scoringFormat?: string;
    week?: number;
  };

  if (!players?.length || players.length < 2) {
    return res.status(400).json({ error: 'At least 2 players are required' });
  }
  if (!VALID_SPORTS.has(sport.toLowerCase())) {
    return res.status(400).json({ error: 'Invalid sport' });
  }

  const limited = players.slice(0, 4);

  try {
    const statsArr = await Promise.all(
      limited.map(p =>
        sport === 'nfl' && p.id
          ? sleeper.getPlayerWeeklyStats(p.id).catch(() => ({}))
          : Promise.resolve({})
      )
    );

    function recentPoints(stats: Record<string, Record<string, number>>): number[] {
      return Object.entries(stats)
        .map(([, s]) => ({ pts: s.pts_ppr ?? s.pts_std ?? 0 }))
        .sort((a, b) => b.pts - a.pts)
        .slice(0, 3)
        .map(e => Math.round(e.pts * 10) / 10);
    }

    const ranked = limited
      .map((p, i) => {
        const recent = recentPoints(statsArr[i] as Record<string, Record<string, number>>);
        const avg = recent.length
          ? recent.reduce((s, x) => s + x, 0) / recent.length
          : (p.avgPoints ?? 0);
        const score = scorePlayer(p);
        return { player: p, score, recent, avg: Math.round(avg * 10) / 10 };
      })
      .sort((a, b) => b.score - a.score);

    const recommended = ranked[0].player.name;
    const diff = ranked[0].score - ranked[1].score;
    const confidence = diff < 5 ? 'Lean' : diff < 15 ? 'Start' : 'Clear Start';

    const labels = ['RECOMMENDED START', 'OPTION 2', 'OPTION 3', 'OPTION 4'];
    const prompt = `SPORT: ${sanitize(sport, 20).toUpperCase()} | FORMAT: ${sanitize(scoringFormat, 20)} | WEEK: ${week}

=== START/SIT COMPARISON ===
${ranked.map((r, i) => `
${labels[i]}: ${sanitize(r.player.name)} (${sanitize(r.player.position, 10)}, ${sanitize(r.player.team ?? 'FA', 10)})${r.player.injuryStatus ? ` [${sanitize(r.player.injuryStatus, 20).toUpperCase()}]` : ''}
Fantasy Value Score: ${Math.round(r.score)}
Recent PPR points: ${r.recent.length ? r.recent.join(', ') : 'N/A'}
Season avg: ${r.avg} pts/wk`).join('\n')}

In 1-2 sentences, say who to start this week and give the simple reason why (use their recent numbers).`;

    const hash = crypto.createHash('sha256').update(prompt).digest('hex').slice(0, 16);
    storePrompt(hash, prompt);

    return res.json({
      recommended,
      confidence,
      rankedPlayers: ranked.map(r => ({
        name: r.player.name,
        score: Math.round(r.score),
        recent: r.recent,
        avg: r.avg,
      })),
      analysisHash: hash,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
});

export default router;
