import { Router } from 'express';
import crypto from 'crypto';
import { getStoredPrompt, streamAnalysis, buildPlayerPrompt, storePrompt } from '../services/claude.js';
import type { RaterPlayer } from '../services/rater.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

// GET /api/analyze/stream?hash=abc123
router.get('/stream', async (req, res) => {
  const { hash } = req.query as { hash: string };

  if (!hash) {
    return res.status(400).json({ error: 'hash required' });
  }

  const prompt = getStoredPrompt(hash);
  if (!prompt) {
    return res.status(404).json({ error: 'Analysis request not found or expired — re-submit the trade/team' });
  }

  // Set up SSE — CORS handled by app-level cors() middleware
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  await streamAnalysis(
    prompt,
    (text) => {
      res.write(`data: ${JSON.stringify({ text })}\n\n`);
    },
    (_fullText) => {
      res.write('data: [DONE]\n\n');
      res.end();
    },
    (err) => {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  );

  req.on('close', () => res.end());
});

// POST /api/analyze/player
router.post('/player', requireAuth('pro'), (req, res) => {
  const { sport = 'nfl', scoringFormat = 'PPR', player } = req.body as {
    sport?: string;
    scoringFormat?: string;
    player: RaterPlayer & { age?: number; yearsExp?: number; searchRank?: number | null };
  };

  if (!player) {
    return res.status(400).json({ error: 'player required' });
  }

  const prompt = buildPlayerPrompt({ sport, scoringFormat, player });
  const hash = crypto.createHash('sha256').update(prompt).digest('hex').slice(0, 16);
  storePrompt(hash, prompt);
  return res.json({ analysisHash: hash });
});

export default router;
