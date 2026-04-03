import { Router } from 'express';
import crypto from 'crypto';
import { requireAuth } from '../middleware/requireAuth.js';
import { checkUsage } from '../middleware/usageLimit.js';
import { scoreTeam } from '../services/rater.js';
import { storePrompt } from '../services/claude.js';
import type { RaterPlayer } from '../services/rater.js';

const router = Router();

interface MatchupSide {
  label: string;  // "Me" or "Opponent"
  players: RaterPlayer[];
  totalScore: number;
  byPosition: Record<string, { player: string; score: number }>;
}

// POST /api/matchup/analyze — free, 2/day
router.post('/analyze', requireAuth('free'), checkUsage('matchup', 2), (req, res) => {
  const { myRoster, opponentRoster, sport = 'nfl', scoringFormat = 'PPR', week = 1 } = req.body as {
    myRoster: RaterPlayer[];
    opponentRoster: RaterPlayer[];
    sport?: string;
    scoringFormat?: string;
    week?: number;
  };

  if (!myRoster?.length || !opponentRoster?.length) {
    return res.status(400).json({ error: 'Both rosters required' });
  }

  const myTeam = scoreTeam(myRoster);
  const oppTeam = scoreTeam(opponentRoster);

  // Build per-position head-to-head breakdown
  const positions = [...new Set([
    ...myRoster.map(p => p.position),
    ...opponentRoster.map(p => p.position),
  ])];

  function bestAtPos(players: RaterPlayer[], pos: string) {
    const p = players.filter(x => x.position === pos).sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0))[0];
    return p ? { player: p.name, score: p.rank ?? 0 } : { player: 'None', score: 0 };
  }

  const headToHead = positions.map(pos => ({
    position: pos,
    mine: bestAtPos(myRoster, pos),
    opponent: bestAtPos(opponentRoster, pos),
  }));

  const myWins = headToHead.filter(h => h.mine.score > h.opponent.score).length;
  const total = headToHead.filter(h => h.mine.score > 0 || h.opponent.score > 0).length;
  const winProb = total ? Math.round((myWins / total) * 100) : 50;

  // Swing plays: positions where the score gap is closest (most impactful decisions)
  const swingPlays = [...headToHead]
    .filter(h => h.mine.score > 0 && h.opponent.score > 0)
    .sort((a, b) => Math.abs(a.mine.score - a.opponent.score) - Math.abs(b.mine.score - b.opponent.score))
    .slice(0, 3);

  const promptText = [
    `You are a fantasy ${sport.toUpperCase()} expert analyzing a Week ${week} head-to-head matchup (${scoringFormat} scoring).`,
    '',
    `MY TEAM (score ${myTeam.score}, grade ${myTeam.grade}):`,
    ...myRoster.map(p => `  ${p.position} ${p.name} (${p.team ?? 'FA'}) — value ${Math.round(p.rank ?? 0)}`),
    '',
    `OPPONENT TEAM (score ${oppTeam.score}, grade ${oppTeam.grade}):`,
    ...opponentRoster.map(p => `  ${p.position} ${p.name} (${p.team ?? 'FA'}) — value ${Math.round(p.rank ?? 0)}`),
    '',
    `HEAD-TO-HEAD WIN PROBABILITY: ${winProb}% in my favor`,
    '',
    `SWING PLAYS (closest matchups):`,
    ...swingPlays.map(h => `  ${h.position}: My ${h.mine.player} (${Math.round(h.mine.score)}) vs Their ${h.opponent.player} (${Math.round(h.opponent.score)})`),
    '',
    'Provide a 4–5 bullet game plan: overall win probability assessment, my 2 biggest advantages, their 2 biggest advantages, and 1 key swing play to watch. Be direct and specific.',
  ].join('\n');

  const hash = crypto.createHash('sha256').update(promptText).digest('hex').slice(0, 16);
  storePrompt(hash, promptText);

  return res.json({
    myScore: myTeam.score,
    myGrade: myTeam.grade,
    oppScore: oppTeam.score,
    oppGrade: oppTeam.grade,
    winProb,
    headToHead,
    analysisHash: hash,
  });
});

export default router;
