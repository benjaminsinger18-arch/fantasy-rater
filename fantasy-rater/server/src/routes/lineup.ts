import { Router } from 'express';
import crypto from 'crypto';
import { requireAuth } from '../middleware/requireAuth.js';
import { checkUsage } from '../middleware/usageLimit.js';
import { optimizeLineup } from '../services/lineupOptimizer.js';
import { storePrompt } from '../services/claude.js';
import type { RaterPlayer } from '../services/rater.js';

const router = Router();

const VALID_SPORTS = new Set(['nfl', 'mlb', 'fpl', 'ipl', 'nba']);
function sanitize(s: unknown, maxLen = 60): string {
  return String(s ?? '').replace(/[\r\n\t\x00-\x1F\x7F]/g, ' ').slice(0, maxLen);
}

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
  if (!VALID_SPORTS.has(sport.toLowerCase())) {
    return res.status(400).json({ error: 'Invalid sport' });
  }

  const result = optimizeLineup(players, sport);

  const promptText = [
    `You are a fantasy ${sanitize(sport, 20).toUpperCase()} expert. Analyze this optimized lineup for ${sanitize(scoringFormat, 20)} scoring, Week ${week}.`,
    '',
    'STARTING LINEUP:',
    ...result.starters.map(s =>
      `  ${sanitize(s.position, 10)}: ${sanitize(s.player.name)} (${sanitize(s.player.team ?? 'FA', 10)})${s.player.injuryStatus ? ` [${sanitize(s.player.injuryStatus, 20).toUpperCase()}]` : ''} — score ${Math.round(s.score)}, ${s.confidence} confidence`
    ),
    '',
    'BENCH:',
    ...result.bench.map(p =>
      `  ${sanitize(p.position, 10)}: ${sanitize(p.name)}${p.injuryStatus ? ` [${sanitize(p.injuryStatus, 20).toUpperCase()}]` : ''}`
    ),
    '',
    'In 3–4 concise bullet points, explain the key start/sit decisions. Call out injury risks, strong matchups, or anyone on the bench who deserves a look in other formats. Be direct and opinionated.',
  ].join('\n');

  const hash = crypto.createHash('sha256').update(promptText).digest('hex').slice(0, 16);
  storePrompt(hash, promptText);

  return res.json({ ...result, analysisHash: hash });
});

export default router;
