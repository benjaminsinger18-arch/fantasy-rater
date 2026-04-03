import type { RaterPlayer } from './rater.js';

export interface LineupSlot {
  position: string;
  player: RaterPlayer;
  score: number;
  confidence: 'high' | 'medium' | 'low';
}

interface SlotConfig {
  eligible: string[];
  count: number;
}

const NFL_SLOTS: Record<string, SlotConfig> = {
  QB:   { eligible: ['QB'], count: 1 },
  RB:   { eligible: ['RB'], count: 2 },
  WR:   { eligible: ['WR'], count: 2 },
  TE:   { eligible: ['TE'], count: 1 },
  FLEX: { eligible: ['RB', 'WR', 'TE'], count: 1 },
  K:    { eligible: ['K'], count: 1 },
  DEF:  { eligible: ['DEF'], count: 1 },
};

const MLB_SLOTS: Record<string, SlotConfig> = {
  C:    { eligible: ['C'], count: 1 },
  '1B': { eligible: ['1B'], count: 1 },
  '2B': { eligible: ['2B'], count: 1 },
  '3B': { eligible: ['3B'], count: 1 },
  SS:   { eligible: ['SS'], count: 1 },
  OF:   { eligible: ['OF'], count: 3 },
  SP:   { eligible: ['SP'], count: 2 },
  RP:   { eligible: ['RP'], count: 2 },
  UTIL: { eligible: ['C', '1B', '2B', '3B', 'SS', 'OF', 'DH'], count: 1 },
};

const FPL_SLOTS: Record<string, SlotConfig> = {
  GK:    { eligible: ['GK'], count: 1 },
  DEF:   { eligible: ['DEF'], count: 3 },
  MID:   { eligible: ['MID'], count: 3 },
  FWD:   { eligible: ['FWD'], count: 1 },
  BENCH1: { eligible: ['DEF', 'MID', 'FWD'], count: 1 },
};

export function optimizeLineup(
  players: RaterPlayer[],
  sport: string,
): { starters: LineupSlot[]; bench: RaterPlayer[] } {
  const slots = sport === 'mlb' ? MLB_SLOTS : sport === 'fpl' ? FPL_SLOTS : NFL_SLOTS;

  // Higher rank = better player — sort descending
  const ranked = [...players].sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0));

  const used = new Set<string>();
  const starters: LineupSlot[] = [];

  // Fill required/primary slots first, FLEX/UTIL/BENCH last
  const slotOrder = Object.entries(slots).sort(([a]) =>
    a === 'FLEX' || a === 'UTIL' || a.startsWith('BENCH') ? 1 : -1
  );

  for (const [slotName, config] of slotOrder) {
    for (let i = 0; i < config.count; i++) {
      const eligible = ranked.filter(
        p => config.eligible.includes(p.position ?? '') && !used.has(p.name)
      );
      if (!eligible.length) continue;
      const best = eligible[0];
      used.add(best.name);
      const score = best.rank ?? 25;
      starters.push({
        position: config.count > 1 && !slotName.startsWith('BENCH') ? `${slotName}${i + 1}` : slotName,
        player: best,
        score,
        confidence: score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low',
      });
    }
  }

  const bench = players.filter(p => !used.has(p.name));
  return { starters, bench };
}
