export interface RaterPlayer {
  name: string;
  position: string;
  team: string;
  injuryStatus?: string | null;
  avgPoints?: number;        // last 4 weeks avg
  projectedRemaining?: number; // projected pts rest of season
  rank?: number;             // position rank (lower is better)
  form?: number;             // FPL form score
  epNext?: number;           // FPL expected points next GW
}

// MLB position base scores (used as fallback when rank unavailable)
export const MLB_POSITION_BASE: Record<string, number> = {
  SP: 42, OF: 38, DH: 36, '1B': 35, P: 35, SS: 34, '3B': 33, '2B': 32, C: 30, RP: 28,
};

const INJURY_PENALTY: Record<string, number> = {
  out: -30,
  ir: -30,
  pup: -25,
  doubtful: -15,
  dtd: -10,
  questionable: -5,
  ques: -5,
};

function injuryPenalty(status?: string | null): number {
  if (!status) return 0;
  return INJURY_PENALTY[status.toLowerCase()] ?? 0;
}

export function scorePlayer(p: RaterPlayer): number {
  const penalty = injuryPenalty(p.injuryStatus);

  // FPL-specific scoring
  if (p.epNext !== undefined) {
    return Math.max(5, (p.epNext ?? 0) * 10 + (p.form ?? 0) * 5) + penalty;
  }

  // Primary: rank is a pre-computed 0-100 fantasy value score (higher = better)
  if (p.rank && p.rank > 0) {
    const recentBoost = p.avgPoints ? p.avgPoints * 0.5 : 0;
    return Math.min(100, p.rank + recentBoost) + penalty;
  }

  // Fallback: use projected/avg points if rank unavailable
  if (p.projectedRemaining || p.avgPoints) {
    return (p.projectedRemaining ?? 0) * 0.4 + (p.avgPoints ?? 0) * 3 + penalty;
  }

  // Last resort: unknown player gets a low base score
  return 10 + penalty;
}

export function scoreTrade(sideA: RaterPlayer[], sideB: RaterPlayer[]) {
  const aScore = sideA.reduce((sum, p) => sum + scorePlayer(p), 0);
  const bScore = sideB.reduce((sum, p) => sum + scorePlayer(p), 0);
  // both zero → toss-up; bScore=0 only → giving something for nothing → horrible
  const ratio = bScore === 0 ? (aScore === 0 ? 1 : 2) : aScore / bScore;

  let verdict: string;
  if (ratio < 0.75) verdict = 'Great Deal';
  else if (ratio < 0.90) verdict = 'Good Deal';
  else if (ratio <= 1.10) verdict = 'Toss Up';
  else if (ratio <= 1.25) verdict = 'Bad Deal';
  else verdict = 'Horrible Deal';

  return {
    sideAScore: Math.round(aScore * 10) / 10,
    sideBScore: Math.round(bScore * 10) / 10,
    ratio: Math.round(ratio * 1000) / 1000,
    verdict,
  };
}

export function scoreTeam(roster: RaterPlayer[]): { score: number; grade: string; positionBreakdown: Record<string, { score: number; grade: string }> } {
  const byPosition: Record<string, RaterPlayer[]> = {};
  for (const p of roster) {
    if (!byPosition[p.position]) byPosition[p.position] = [];
    byPosition[p.position].push(p);
  }

  const positionBreakdown: Record<string, { score: number; grade: string }> = {};
  let totalScore = 0;
  let count = 0;

  for (const [pos, players] of Object.entries(byPosition)) {
    const avgScore = players.reduce((sum, p) => sum + scorePlayer(p), 0) / players.length;
    positionBreakdown[pos] = { score: Math.round(avgScore), grade: toGrade(avgScore) };
    totalScore += avgScore;
    count++;
  }

  const overall = count > 0 ? totalScore / count : 0;
  return {
    score: Math.round(overall),
    grade: toGrade(overall),
    positionBreakdown,
  };
}

function toGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 80) return 'A-';
  if (score >= 77) return 'B+';
  if (score >= 73) return 'B';
  if (score >= 70) return 'B-';
  if (score >= 67) return 'C+';
  if (score >= 63) return 'C';
  if (score >= 60) return 'C-';
  if (score >= 57) return 'D+';
  if (score >= 53) return 'D';
  return 'F';
}
