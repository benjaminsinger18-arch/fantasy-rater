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
  roster?: Array<{ name: string; position: string; team: string; rank?: number }>;
}

// POST /api/chat — PRO + 20 messages/day free limit, streams SSE
router.post('/', requireAuth('free'), checkUsage('chat', 20), async (req, res) => {
  const { messages, context } = req.body as { messages: ChatMessage[]; context: ChatContext };

  if (!messages?.length) {
    return res.status(400).json({ error: 'messages required' });
  }

  const systemPrompt = [
    `You are an expert fantasy ${context.sport.toUpperCase()} advisor with deep knowledge of player values, start/sit decisions, trade strategy, and waiver wire pickups.`,
    '',
    'LEAGUE CONTEXT:',
    `  Sport: ${context.sport.toUpperCase()}`,
    `  Scoring: ${context.scoringFormat}`,
    `  League size: ${context.leagueSize} teams`,
    `  Current week: ${context.currentWeek}`,
    ...(context.roster?.length ? [
      '',
      'MY ROSTER:',
      ...context.roster.map(p => `  ${p.position} ${p.name} (${p.team})${p.rank ? ` — value ${Math.round(p.rank)}` : ''}`),
    ] : []),
    '',
    'Rules: Be direct and opinionated. Pick a side. Use specific player names. 2–4 sentences unless a detailed breakdown is requested. No hedging.',
  ].join('\n');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  try {
    const stream = anthropic.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
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
