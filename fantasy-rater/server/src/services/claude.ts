import Anthropic from '@anthropic-ai/sdk';
import { cache, TTL } from '../cache/memcache.js';
import type { RaterPlayer } from './rater.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function getSystemPrompt(): string {
  return `You are a sharp fantasy sports analyst. Be extremely brief and stat-focused. Never use markdown headers or bullet lists. Write 2-3 tight sentences max. Lead with the numbers, end with a clear verdict. No filler, no hedging.

Today's date: ${new Date().toISOString().split('T')[0]}. CRITICAL: Only reference player names, teams, stats, and facts explicitly provided in this prompt. Never fill gaps from your training knowledge — it goes stale and causes errors. If a player's info isn't in the prompt, don't invent it.`;
}

function playerLine(p: RaterPlayer): string {
  const injury = p.injuryStatus ? ` [${p.injuryStatus.toUpperCase()}]` : '';
  const pts = p.avgPoints ? ` — ${p.avgPoints.toFixed(1)} pts/wk avg` : '';
  const proj = p.projectedRemaining ? `, ${p.projectedRemaining} proj pts ROS` : '';
  const fpl = p.epNext !== undefined ? ` — ${p.epNext} EP next GW, form ${p.form}` : '';
  return `  • ${p.name} (${p.position}, ${p.team})${injury}${pts || fpl}${proj}`;
}

export function buildTradePrompt(params: {
  sport: string;
  scoringFormat: string;
  week: number | string;
  leagueSize: number;
  weeksRemaining: number;
  sideA: RaterPlayer[];
  sideB: RaterPlayer[];
  sideAScore: number;
  sideBScore: number;
  ratio: number;
  verdict: string;
}): string {
  return `SPORT: ${params.sport.toUpperCase()}
SCORING FORMAT: ${params.scoringFormat}
WEEK/GAMEWEEK: ${params.week}
LEAGUE SIZE: ${params.leagueSize} teams
WEEKS REMAINING: ${params.weeksRemaining}

=== TRADE DETAILS ===
SIDE A gives:
${params.sideA.map(playerLine).join('\n')}

SIDE B gives:
${params.sideB.map(playerLine).join('\n')}

=== ALGORITHMIC PRE-SCORE ===
Side A total value: ${params.sideAScore}
Side B total value: ${params.sideBScore}
Fairness ratio: ${params.ratio} (${params.verdict})

Give a 2-sentence verdict: who wins the trade and why (cite specific stats), then a one-word accept/decline recommendation.`;
}

export function buildTeamPrompt(params: {
  sport: string;
  scoringFormat: string;
  week: number | string;
  roster: RaterPlayer[];
  overallScore: number;
  overallGrade: string;
  positionBreakdown: Record<string, { score: number; grade: string }>;
}): string {
  const posLines = Object.entries(params.positionBreakdown)
    .map(([pos, { score, grade }]) => `  ${pos}: ${grade} (${score})`)
    .join('\n');

  return `SPORT: ${params.sport.toUpperCase()}
SCORING FORMAT: ${params.scoringFormat}
WEEK/GAMEWEEK: ${params.week}

=== ROSTER ===
${params.roster.map(playerLine).join('\n')}

=== ALGORITHMIC SCORES ===
Overall: ${params.overallGrade} (${params.overallScore}/100)
By position:
${posLines}

In 2-3 sentences: name the strongest and weakest position group (cite stats), then one specific player to target on waivers or in a trade.`;
}

export function buildLeaguePredictorPrompt(params: {
  sport: string;
  scoringFormat: string;
  myTeam: {
    teamName: string;
    currentRecord: string;
    currentRank: number;
    rosterGrade: string;
    rosterScore: number;
    projectedRank: number;
    projectedRange: [number, number];
    positionBreakdown: Record<string, { score: number; grade: string }>;
  };
  leagueSize: number;
  leagueAvgRosterScore: number;
  rivals: Array<{ teamName: string; rosterGrade: string; projectedRank: number }>;
}): string {
  const posLines = Object.entries(params.myTeam.positionBreakdown)
    .map(([pos, { grade, score }]) => `  ${pos}: ${grade} (${score})`)
    .join('\n');

  const rivalLines = params.rivals
    .map(r => `  ${r.teamName}: ${r.rosterGrade} — projected #${r.projectedRank}`)
    .join('\n');

  return `SPORT: ${params.sport.toUpperCase()}
SCORING FORMAT: ${params.scoringFormat}
LEAGUE SIZE: ${params.leagueSize} teams

=== YOUR TEAM: ${params.myTeam.teamName} ===
Current record: ${params.myTeam.currentRecord} (#${params.myTeam.currentRank} in league)
Roster grade: ${params.myTeam.rosterGrade} (${params.myTeam.rosterScore}/100)
By position:
${posLines}

=== PROJECTION ===
Projected finish: #${params.myTeam.projectedRank} (range: #${params.myTeam.projectedRange[0]}–#${params.myTeam.projectedRange[1]})
League average roster score: ${params.leagueAvgRosterScore}/100

=== CLOSEST RIVALS ===
${rivalLines}

In 2-3 sentences: explain the projected finish (cite the roster grade vs league average), name the biggest positional advantage or weakness vs rivals, then give one specific action to improve the final position.`;
}

export function buildPlayerPrompt(params: {
  sport: string;
  scoringFormat: string;
  player: RaterPlayer & { age?: number; yearsExp?: number; searchRank?: number | null };
}): string {
  const p = params.player;
  const injury = p.injuryStatus ? ` [${p.injuryStatus.toUpperCase()}]` : '';
  const pts = p.avgPoints ? ` | ${p.avgPoints.toFixed(1)} pts/wk avg` : '';
  const exp = p.yearsExp !== undefined ? ` | Exp: ${p.yearsExp}y` : '';
  const age = p.age ? ` | Age: ${p.age}` : '';
  const rank = p.searchRank ? ` | Overall Rank: #${p.searchRank}` : '';

  return `SPORT: ${params.sport.toUpperCase()} | FORMAT: ${params.scoringFormat}

PLAYER: ${p.name} (${p.position}, ${p.team || 'N/A'})${injury}
Fantasy Value: ${p.rank ?? 'N/A'}/100${rank}${pts}${age}${exp}

In 2 tight sentences: explain this player's current fantasy value and situation (cite stats). End with a clear START/SIT/HOLD/DROP verdict.`;
}

// Stored pending requests for streaming (keyed by hash)
const pendingPrompts = new Map<string, string>();

export function storePrompt(hash: string, prompt: string) {
  pendingPrompts.set(hash, prompt);
  setTimeout(() => pendingPrompts.delete(hash), 5 * 60 * 1000);
}

export function getStoredPrompt(hash: string): string | undefined {
  return pendingPrompts.get(hash);
}

export async function streamAnalysis(
  prompt: string,
  onChunk: (text: string) => void,
  onDone: (fullText: string) => void,
  onError: (err: Error) => void
) {
  // Check cache first
  const cacheKey = `claude:${hashString(prompt)}`;
  const cached = cache.get<string>(cacheKey);
  if (cached) {
    onChunk(cached);
    onDone(cached);
    return;
  }

  try {
    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      system: getSystemPrompt(),
      messages: [{ role: 'user', content: prompt }],
    });

    let fullText = '';
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        fullText += chunk.delta.text;
        onChunk(chunk.delta.text);
      }
    }

    cache.set(cacheKey, fullText, TTL.CLAUDE_ANALYSIS);
    onDone(fullText);
  } catch (err) {
    onError(err as Error);
  }
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}
