import { Router } from 'express';
import { scoreTrade } from '../services/rater.js';
import { buildTradePrompt, storePrompt } from '../services/claude.js';
import type { RaterPlayer } from '../services/rater.js';
import crypto from 'crypto';
import { requireAuth } from '../middleware/requireAuth.js';
import { checkUsage } from '../middleware/usageLimit.js';

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
      sport,
      scoringFormat,
      week,
      leagueSize,
      weeksRemaining,
      sideA,
      sideB,
      ...tradeScore,
    });

    const hash = crypto.createHash('sha256').update(prompt).digest('hex').slice(0, 16);
    storePrompt(hash, prompt);

    return res.json({ ...tradeScore, analysisHash: hash });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
});

export default router;
