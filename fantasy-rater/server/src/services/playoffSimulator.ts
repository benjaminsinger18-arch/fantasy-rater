export interface SimTeam {
  name: string;
  wins: number;
  losses: number;
  ties: number;
  currentPoints: number;
}

function gaussianRandom(mean: number, sigma: number): number {
  const u = Math.max(Number.EPSILON, Math.random());
  const v = Math.max(Number.EPSILON, Math.random());
  return mean + sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function simulatePlayoffProbabilities(
  teams: SimTeam[],
  playoffSpots: number,
  weeksRemaining: number,
  simCount = 500,
): Record<string, number> {
  const n = teams.length;
  const playoffCounts: Record<string, number> = {};
  for (const t of teams) playoffCounts[t.name] = 0;

  for (let sim = 0; sim < simCount; sim++) {
    const simWins = teams.map(t => t.wins);
    const simPts = teams.map(t => t.currentPoints);

    for (let week = 0; week < weeksRemaining; week++) {
      const indices = [...Array(n).keys()].sort(() => Math.random() - 0.5);
      for (let i = 0; i + 1 < indices.length; i += 2) {
        const a = indices[i], b = indices[i + 1];
        const gamesA = Math.max(1, teams[a].wins + teams[a].losses + teams[a].ties + week);
        const gamesB = Math.max(1, teams[b].wins + teams[b].losses + teams[b].ties + week);
        const avgA = simPts[a] / gamesA;
        const avgB = simPts[b] / gamesB;
        const scoreA = Math.max(0, gaussianRandom(avgA, avgA * 0.22));
        const scoreB = Math.max(0, gaussianRandom(avgB, avgB * 0.22));
        simPts[a] += scoreA;
        simPts[b] += scoreB;
        if (scoreA > scoreB) simWins[a]++;
        else if (scoreB > scoreA) simWins[b]++;
      }
    }

    const ranked = teams
      .map((t, i) => ({ name: t.name, wins: simWins[i], pts: simPts[i] }))
      .sort((a, b) => b.wins !== a.wins ? b.wins - a.wins : b.pts - a.pts);

    for (let i = 0; i < Math.min(playoffSpots, ranked.length); i++) {
      playoffCounts[ranked[i].name]++;
    }
  }

  const result: Record<string, number> = {};
  for (const [name, count] of Object.entries(playoffCounts)) {
    result[name] = Math.round((count / simCount) * 100);
  }
  return result;
}
