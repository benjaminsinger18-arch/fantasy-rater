import { Router } from 'express';
import crypto from 'crypto';
import * as sleeper from '../services/platforms/sleeper.js';
import { scorePlayer } from '../services/rater.js';
import { storePrompt } from '../services/claude.js';
import type { RaterPlayer } from '../services/rater.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { checkUsage } from '../middleware/usageLimit.js';

const router = Router();

// POST /api/startsit/compare
router.post('/compare', requireAuth('free'), checkUsage('startsit', 2), async (req, res) => {
  const { playerA, playerB, sport = 'nfl', scoringFormat = 'PPR', week = 1 } = req.body as {
    playerA: RaterPlayer & { id?: string };
    playerB: RaterPlayer & { id?: string };
    sport?: string;
    scoringFormat?: string;
    week?: number;
  };

  if (!playerA?.name || !playerB?.name) {
    return res.status(400).json({ error: 'Both playerA and playerB are required' });
  }

  try {
    // Fetch recent weekly stats for both players (last 3 weeks)
    let statsA: Record<string, Record<string, number>> = {};
    let statsB: Record<string, Record<string, number>> = {};

    if (sport === 'nfl' && playerA.id) {
      statsA = await sleeper.getPlayerWeeklyStats(playerA.id).catch(() => ({}));
    }
    if (sport === 'nfl' && playerB.id) {
      statsB = await sleeper.getPlayerWeeklyStats(playerB.id).catch(() => ({}));
    }

    // Get last 3 weeks of points
    function recentPoints(stats: Record<string, Record<string, number>>): number[] {
      return Object.entries(stats)
        .map(([, s]) => ({ pts: s.pts_ppr ?? s.pts_std ?? 0 }))
        .sort((a, b) => b.pts - a.pts) // sort by recency approximation
        .slice(0, 3)
        .map(e => Math.round(e.pts * 10) / 10);
    }

    const recentA = recentPoints(statsA);
    const recentB = recentPoints(statsB);
    const avgA = recentA.length ? recentA.reduce((s, p) => s + p, 0) / recentA.length : (playerA.avgPoints ?? 0);
    const avgB = recentB.length ? recentB.reduce((s, p) => s + p, 0) / recentB.length : (playerB.avgPoints ?? 0);

    const scoreA = scorePlayer(playerA);
    const scoreB = scorePlayer(playerB);
    const recommended = scoreA >= scoreB ? 'A' : 'B';
    const diff = Math.abs(scoreA - scoreB);
    const confidence = diff < 5 ? 'Lean' : diff < 15 ? 'Start' : 'Clear Start';

    const injuryLineA = playerA.injuryStatus ? ` [${playerA.injuryStatus.toUpperCase()}]` : '';
    const injuryLineB = playerB.injuryStatus ? ` [${playerB.injuryStatus.toUpperCase()}]` : '';

    const prompt = `SPORT: ${sport.toUpperCase()} | FORMAT: ${scoringFormat} | WEEK: ${week}

=== START/SIT COMPARISON ===

PLAYER A: ${playerA.name} (${playerA.position}, ${playerA.team ?? 'FA'})${injuryLineA}
Fantasy Value Score: ${Math.round(scoreA)}
Recent PPR points (last 3 weeks): ${recentA.length ? recentA.join(', ') : 'N/A'}
Season avg: ${avgA.toFixed(1)} pts/wk

PLAYER B: ${playerB.name} (${playerB.position}, ${playerB.team ?? 'FA'})${injuryLineB}
Fantasy Value Score: ${Math.round(scoreB)}
Recent PPR points (last 3 weeks): ${recentB.length ? recentB.join(', ') : 'N/A'}
Season avg: ${avgB.toFixed(1)} pts/wk

ALGORITHMIC RECOMMENDATION: Start ${recommended === 'A' ? playerA.name : playerB.name} (${confidence})

In 2-3 tight sentences: explain who to start and why (cite recent stats and injury risk). Be direct.`;

    const hash = crypto.createHash('sha256').update(prompt).digest('hex').slice(0, 16);
    storePrompt(hash, prompt);

    return res.json({
      recommended: recommended === 'A' ? playerA.name : playerB.name,
      confidence,
      scoreA: Math.round(scoreA),
      scoreB: Math.round(scoreB),
      recentA,
      recentB,
      avgA: Math.round(avgA * 10) / 10,
      avgB: Math.round(avgB * 10) / 10,
      analysisHash: hash,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
});

export default router;
