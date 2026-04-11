import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { requireAuth } from '../middleware/requireAuth.js';
import { checkUsage } from '../middleware/usageLimit.js';

const router = Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatContext {
  sport: string;
  scoringFormat: string;
  leagueSize: number;
  currentWeek: number;
  roster?: Array<{
    name: string;
    position: string;
    team: string;
    injuryStatus?: string | null;
    avgPoints?: number;
    rank?: number;
  }>;
}

// POST /api/chat — PRO + 20 messages/day free limit, streams SSE
router.post('/', requireAuth('free'), checkUsage('chat', 20), async (req, res) => {
  const { messages, context } = req.body as { messages: ChatMessage[]; context: ChatContext };

  if (!messages?.length) {
    return res.status(400).json({ error: 'messages required' });
  }
  if (messages.length > 20) {
    return res.status(400).json({ error: 'Too many messages (max 20)' });
  }
  for (const m of messages) {
    if (typeof m.content !== 'string' || m.content.length > 2000) {
      return res.status(400).json({ error: 'Message content too long (max 2000 chars)' });
    }
  }

  const systemPrompt = [
    `You are an expert fantasy ${context.sport.toUpperCase()} advisor with deep knowledge of player values, start/sit decisions, trade strategy, and waiver wire pickups.`,
    '',
    `Today's date: ${new Date().toISOString().split('T')[0]}.`,
    '',
    "CRITICAL: Only reference player names, teams, stats, and facts explicitly provided in this prompt. Never fill gaps from your training knowledge — it goes stale and causes hallucinations. If asked about a player not listed here, say you don't have current data on them rather than guessing.",
    '',
    'LEAGUE CONTEXT:',
    `  Sport: ${context.sport.toUpperCase()}`,
    `  Scoring: ${context.scoringFormat}`,
    `  League size: ${context.leagueSize} teams`,
    `  Current week: ${context.currentWeek}`,
    ...(context.roster?.length ? [
      '',
      'MY ROSTER (authoritative — treat these team assignments as current fact):',
      ...context.roster.map(p => {
        const injury = p.injuryStatus ? ` [${p.injuryStatus.toUpperCase()}]` : '';
        const pts = p.avgPoints ? ` — ${p.avgPoints.toFixed(1)} pts/wk` : '';
        const rank = p.rank ? ` (value ${Math.round(p.rank)}/100)` : '';
        return `  ${p.position} ${p.name} (${p.team})${injury}${pts}${rank}`;
      }),
    ] : []),
    '',
    'Rules: Be direct and opinionated. Pick a side. Use specific player names from the roster above. 2–4 sentences unless a detailed breakdown is requested. No hedging.',
  ].join('\n');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  // CORS is handled by the app-level cors() middleware — do not override with wildcard here
  res.flushHeaders();

  try {
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: systemPrompt,
      messages: messages.slice(-12), // last 12 turns for context
    });

    stream.on('text', (text) => {
      res.write(`data: ${JSON.stringify({ text })}\n\n`);
    });

    await stream.finalMessage();
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Claude error';
    res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
    res.end();
  }

  req.on('close', () => res.end());
});

export default router;
