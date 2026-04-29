import { Router } from 'express';
import { scoreTrade } from '../services/rater.js';
import { buildTradePrompt, storePrompt } from '../services/claude.js';
import type { RaterPlayer } from '../services/rater.js';
import crypto from 'crypto';
import { requireAuth } from '../middleware/requireAuth.js';
import { checkUsage } from '../middleware/usageLimit.js';
import db from '../db.js';

const router = Router();

// POST /api/trade/rate
router.post('/rate', requireAuth('free'), checkUsage('trade', 3), (req, res) => {
  const { sideA, sideB, sport = 'nfl', scoringFormat = 'PPR', week = 1, leagueSize = 12, weeksRemaining = 10 } = req.body as {
    sideA: RaterPlayer[];
    sideB: RaterPlayer[];
    sport?: string;
    scoringFormat?: string;
    week?: number;
    leagueSize?: number;
    weeksRemaining?: number;
  };

  if (!sideA?.length || !sideB?.length) {
    return res.status(400).json({ error: 'Both sides of the trade must have at least one player' });
  }

  try {
    const tradeScore = scoreTrade(sideA, sideB);
    const prompt = buildTradePrompt({
      sport, scoringFormat, week, leagueSize, weeksRemaining, sideA, sideB, ...tradeScore,
    });

    const hash = crypto.createHash('sha256').update(prompt).digest('hex').slice(0, 16);
    storePrompt(hash, prompt);

    // Persist to trade history for signed-in users
    if (req.userId) {
      try {
        db.prepare(`
          INSERT INTO trade_history (clerk_user_id, sport, side_a, side_b, side_a_score, side_b_score, verdict, scoring_format, created_at, analysis_hash)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          req.userId,
          sport,
          JSON.stringify(sideA.map(p => p.name)),
          JSON.stringify(sideB.map(p => p.name)),
          tradeScore.sideAScore,
          tradeScore.sideBScore,
          tradeScore.verdict,
          scoringFormat,
          Math.floor(Date.now() / 1000),
          hash,
        );
      } catch { /* non-fatal — don't break the rating */ }
    }

    return res.json({ ...tradeScore, analysisHash: hash });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
});

// GET /api/trade/history — last 30 trades for the signed-in user
router.get('/history', requireAuth('free'), (req, res) => {
  const rows = db.prepare(`
    SELECT id, sport, side_a, side_b, side_a_score, side_b_score, verdict, scoring_format, created_at, analysis_hash, ai_analysis
    FROM trade_history
    WHERE clerk_user_id = ?
    ORDER BY created_at DESC
    LIMIT 30
  `).all(req.userId) as Array<{
    id: number;
    sport: string;
    side_a: string;
    side_b: string;
    side_a_score: number;
    side_b_score: number;
    verdict: string;
    scoring_format: string;
    created_at: number;
    analysis_hash: string | null;
    ai_analysis: string | null;
  }>;

  return res.json(rows.map(r => ({
    id: r.id,
    sport: r.sport,
    sideA: JSON.parse(r.side_a) as string[],
    sideB: JSON.parse(r.side_b) as string[],
    sideAScore: r.side_a_score,
    sideBScore: r.side_b_score,
    verdict: r.verdict,
    scoringFormat: r.scoring_format,
    createdAt: r.created_at,
    analysisHash: r.analysis_hash ?? null,
    aiAnalysis: r.ai_analysis ?? null,
  })));
});

export default router;
