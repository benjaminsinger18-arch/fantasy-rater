import Anthropic from '@anthropic-ai/sdk';
import { cache, TTL } from '../cache/memcache.js';
import type { RaterPlayer } from './rater.js';

let _anthropic: Anthropic | undefined;
function getAnthropic(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}

function getSystemPrompt(): string {
  return `You are a fantasy sports buddy who talks like a real person — fun, confident, and to the point. Keep it to 2-3 sentences max. No bullet lists, no markdown headers, no fancy jargon. Use simple everyday words. Be direct and tell it like it is.

Today's date: ${new Date().toISOString().split('T')[0]}. CRITICAL: Only reference player names, teams, stats, and facts explicitly provided in this prompt. Never fill gaps from your training knowledge — it goes stale and causes errors. If a player's info isn't in the prompt, don't invent it.`;
}

/** Strip newlines and control characters from user-supplied text to prevent prompt injection. */
function sanitizeText(s: unknown, maxLen = 100): string {
  return String(s ?? '').replace(/[\r\n\t\x00-\x1F\x7F]/g, ' ').slice(0, maxLen);
}

/** Validate and normalize the sport field. Falls back to 'unknown' for unsupported values. */
const VALID_SPORTS = new Set(['nfl', 'mlb', 'fpl', 'ipl', 'nba']);
function sanitizeSport(sport: string): string {
  const s = sport.toLowerCase().trim();
  return VALID_SPORTS.has(s) ? s : sanitizeText(s, 20);
}

function playerLine(p: RaterPlayer): string {
  const name = sanitizeText(p.name, 60);
  const pos = sanitizeText(p.position, 10);
  const team = sanitizeText(p.team, 10);
  const injury = p.injuryStatus ? ` [${sanitizeText(p.injuryStatus, 20).toUpperCase()}]` : '';
  const pts = p.avgPoints ? ` — ${p.avgPoints.toFixed(1)} pts/wk avg` : '';
  const proj = p.projectedRemaining ? `, ${p.projectedRemaining} proj pts ROS` : '';
  const fpl = p.epNext !== undefined ? ` — ${p.epNext} EP next GW, form ${p.form}` : '';
  return `  • ${name} (${pos}, ${team})${injury}${pts || fpl}${proj}`;
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
  return `SPORT: ${sanitizeSport(params.sport).toUpperCase()}
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

In 1-2 sentences, say who wins this trade and the main reason why (use the numbers). Then say ACCEPT or DECLINE.`;
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

  return `SPORT: ${sanitizeSport(params.sport).toUpperCase()}
SCORING FORMAT: ${params.scoringFormat}
WEEK/GAMEWEEK: ${params.week}

=== ROSTER ===
${params.roster.map(playerLine).join('\n')}

=== ALGORITHMIC SCORES ===
Overall: ${params.overallGrade} (${params.overallScore}/100)
By position:
${posLines}

In 1-2 sentences, say what's hot and what's a problem on this team (use the numbers). Then name one player to grab off waivers or trade for.`;
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

  return `SPORT: ${sanitizeSport(params.sport).toUpperCase()}
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

In 2 sentences, explain where this team will finish and why (compare their grade to the rest of the league). Give one simple thing they should do right now to move up.`;
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

  return `SPORT: ${sanitizeSport(params.sport).toUpperCase()} | FORMAT: ${params.scoringFormat}

PLAYER: ${sanitizeText(p.name, 60)} (${sanitizeText(p.position, 10)}, ${sanitizeText(p.team || 'N/A', 10)})${injury}
Fantasy Value: ${p.rank ?? 'N/A'}/100${rank}${pts}${age}${exp}

In 1-2 sentences, say how good this player is right now in plain English (use their numbers). End with START, SIT, HOLD, or DROP.`;
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
    const stream = await getAnthropic().messages.stream({
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
