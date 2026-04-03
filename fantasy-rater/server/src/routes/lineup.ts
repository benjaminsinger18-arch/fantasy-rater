import { Router } from 'express';
import crypto from 'crypto';
import { requireAuth } from '../middleware/requireAuth.js';
import { checkUsage } from '../middleware/usageLimit.js';
import { optimizeLineup } from '../services/lineupOptimizer.js';
import { storePrompt } from '../services/claude.js';
import type { RaterPlayer } from '../services/rater.js';

const router = Router();

// POST /api/lineup/optimize — PRO only, 3/day for free (PRO unlimited)
router.post('/optimize', requireAuth('free'), checkUsage('lineup', 3), (req, res) => {
  const { players, sport = 'nfl', scoringFormat = 'PPR', week = 1 } = req.body as {
    players: RaterPlayer[];
    sport?: string;
    scoringFormat?: string;
    week?: number;
  };

  if (!players?.length) {
    return res.status(400).json({ error: 'players array required' });
  }

  const result = optimizeLineup(players, sport);

  const promptText = [
    `You are a fantasy ${sport.toUpperCase()} expert. Analyze this optimized lineup for ${scoringFormat} scoring, Week ${week}.`,
    '',
    'STARTING LINEUP:',
    ...result.starters.map(s =>
      `  ${s.position}: ${s.player.name} (${s.player.team ?? 'FA'})${s.player.injuryStatus ? ` [${s.player.injuryStatus.toUpperCase()}]` : ''} — score ${Math.round(s.score)}, ${s.confidence} confidence`
    ),
    '',
    'BENCH:',
    ...result.bench.map(p =>
      `  ${p.position}: ${p.name}${p.injuryStatus ? ` [${p.injuryStatus.toUpperCase()}]` : ''}`
    ),
    '',
    'In 3–4 concise bullet points, explain the key start/sit decisions. Call out injury risks, strong matchups, or anyone on the bench who deserves a look in other formats. Be direct and opinionated.',
  ].join('\n');

  const hash = crypto.createHash('sha256').update(promptText).digest('hex').slice(0, 16);
  storePrompt(hash, promptText);

  return res.json({ ...result, analysisHash: hash });
});

export default router;
