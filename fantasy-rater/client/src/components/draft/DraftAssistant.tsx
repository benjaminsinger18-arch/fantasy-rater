import { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Loader2 } from 'lucide-react';
import { PlayerSearch } from '../shared/PlayerSearch.tsx';
import { StreamingAnalysis } from '../shared/StreamingAnalysis.tsx';
import { getDraftRecommendation } from '../../lib/api.ts';
import { useLeague } from '../../lib/LeagueContext.tsx';
import type { Player } from '../../types/index.ts';

interface DraftPlayer {
  id: string;
  name: string;
  position: string;
  team: string;
  searchRank?: number;
}

interface DraftResult {
  tier1: DraftPlayer[];
  tier2: DraftPlayer[];
  tier3: DraftPlayer[];
  round: number;
  positionalNeed: string;
  positionCounts: Record<string, number>;
  analysisHash: string;
}

const POSITION_COLORS: Record<string, string> = {
  QB: 'text-amber-400',
  RB: 'text-emerald-400',
  WR: 'text-blue-400',
  TE: 'text-violet-400',
  K: 'text-slate-400',
  DEF: 'text-rose-400',
};

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};
const itemVariants = {
  hidden: { opacity: 0, x: -8 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.18 } },
};

function TierList({ label, players, accent }: { label: string; players: DraftPlayer[]; accent: string }) {
  if (!players.length) return null;
  return (
    <div>
      <p className={`text-[10px] font-display font-bold uppercase tracking-widest mb-2 ${accent}`}>{label}</p>
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-1.5">
        {players.map(p => (
          <motion.div key={p.id} variants={itemVariants} className="flex items-center gap-3 card-base px-3 py-2.5 hover:border-white/10 transition-colors">
            <span className={`text-xs font-display font-bold w-8 ${POSITION_COLORS[p.position] ?? 'text-slate-400'}`}>{p.position}</span>
            <span className="flex-1 text-sm text-white font-medium">{p.name}</span>
            <span className="text-xs text-slate-500">{p.team}</span>
            {p.searchRank && <span className="text-xs text-slate-600">#{p.searchRank}</span>}
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

export function DraftAssistant() {
  const { config } = useLeague();
  const [pickPosition, setPickPosition] = useState(1);
  const [totalTeams, setTotalTeams] = useState(config.leagueSize ?? 12);
  const [currentPick, setCurrentPick] = useState(1);
  const [allPicked, setAllPicked] = useState<DraftPlayer[]>([]);
  const [myPicks, setMyPicks] = useState<DraftPlayer[]>([]);
  const [result, setResult] = useState<DraftResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function isMyPick(pick: number, pos: number, teams: number): boolean {
    const round = Math.ceil(pick / teams);
    const inRound = ((pick - 1) % teams) + 1;
    const isOddRound = round % 2 === 1;
    return isOddRound ? inRound === pos : (teams - inRound + 1) === pos;
  }

  function addPickedPlayer(player: Player, isMyTeam: boolean) {
    const dp: DraftPlayer = { id: player.id, name: player.name, position: player.position, team: player.team, searchRank: player.searchRank ?? undefined };
    setAllPicked(prev => [...prev, dp]);
    if (isMyTeam) setMyPicks(prev => [...prev, dp]);
    setCurrentPick(prev => prev + 1);
    setResult(null);
  }

  function undoLastPick() {
    if (!allPicked.length) return;
    const last = allPicked[allPicked.length - 1];
    setAllPicked(prev => prev.slice(0, -1));
    setMyPicks(prev => prev.filter(p => p.id !== last.id || prev.lastIndexOf(p) !== prev.length - 1));
    setCurrentPick(prev => Math.max(1, prev - 1));
    setResult(null);
  }

  async function handleRecommend() {
    setLoading(true);
    setError('');
    try {
      const data = await getDraftRecommendation({
        pickedPlayerIds: allPicked.map(p => p.id),
        myPickedPlayerIds: myPicks.map(p => p.id),
        pickPosition,
        totalTeams,
        sport: config.sport,
        scoringFormat: config.scoringFormat,
        currentPick,
      });
      setResult(data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      if (msg !== 'upgrade_required') setError(msg ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const myTurn = isMyPick(currentPick, pickPosition, totalTeams);
  const round = Math.ceil(currentPick / totalTeams);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-display font-black bg-gradient-to-r from-white via-blue-100 to-indigo-300 bg-clip-text text-transparent">
            Draft Assistant
          </h1>
          <span className="text-[10px] font-bold bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded-full">PRO</span>
        </div>
        <p className="text-xs text-slate-500 mt-1">Live draft guidance — enter picks as they happen to get real-time recommendations</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6 flex flex-col md:flex-row gap-4 md:gap-6 min-h-0">
          {/* Left: Draft settings + pick entry */}
          <div className="w-full md:w-80 flex-shrink-0 flex flex-col gap-4">
            {/* Settings */}
            <div className="card-base p-4">
              <p className="text-xs font-display font-bold text-slate-400 uppercase tracking-widest mb-3">Draft Settings</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider">My Pick #</label>
                  <input
                    type="number" min={1} max={totalTeams}
                    value={pickPosition}
                    onChange={e => setPickPosition(Number(e.target.value))}
                    className="input-base mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider">Teams</label>
                  <input
                    type="number" min={8} max={16}
                    value={totalTeams}
                    onChange={e => setTotalTeams(Number(e.target.value))}
                    className="input-base mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Current pick status */}
            <div className={`rounded-2xl border p-3 ${myTurn ? 'bg-emerald-500/10 border-emerald-500/30' : 'card-base'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Round <span className="font-display font-bold text-white animate-count-up">{round}</span>, Pick <span className="font-display font-bold text-white">{currentPick}</span></p>
                  {myTurn && <p className="text-sm font-display font-bold text-emerald-400 mt-0.5 flex items-center gap-1"><Target size={14} /> Your pick!</p>}
                </div>
                <button onClick={undoLastPick} disabled={!allPicked.length} className="text-xs text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors">
                  ↩ Undo
                </button>
              </div>
            </div>

            {/* Enter picks */}
            <div className="card-base p-4">
              <p className="text-xs font-display font-bold text-slate-400 uppercase tracking-widest mb-2">
                {myTurn ? 'Mark Your Pick' : 'Mark Picked Player'}
              </p>
              <PlayerSearch
                onSelect={p => addPickedPlayer(p, myTurn)}
                placeholder={myTurn ? 'Who are you drafting?' : 'Who was just picked?'}
              />
            </div>

            {/* My team */}
            {myPicks.length > 0 && (
              <div className="card-base p-4 border-l-4 border-l-indigo-500/50">
                <p className="text-xs font-display font-bold text-slate-400 uppercase tracking-widest mb-2">My Team ({myPicks.length})</p>
                <div className="flex flex-col gap-1">
                  {myPicks.map((p, i) => (
                    <div key={`${p.id}-${i}`} className="flex items-center gap-2">
                      <span className={`text-[10px] font-display font-bold w-7 ${POSITION_COLORS[p.position] ?? 'text-slate-400'}`}>{p.position}</span>
                      <span className="text-xs text-slate-300 truncate">{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleRecommend}
              disabled={loading}
              className="w-full py-3.5 rounded-2xl font-display font-bold text-sm bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black transition-all disabled:opacity-40 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 size={16} className="animate-spin" /> Loading...</> : 'Get Recommendation'}
            </button>

            {error && <p className="text-rose-400 text-xs">{error}</p>}
          </div>

          {/* Right: Recommendations */}
          <div className="flex-1 min-w-0">
            {!result && !loading && (
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <Target size={40} className="mx-auto mb-3 text-slate-700" />
                  <p className="text-slate-500 text-sm">Set up your draft and tap Get Recommendation</p>
                </div>
              </div>
            )}

            {result && (
              <div className="flex flex-col gap-4">
                {/* Round / need summary */}
                <div className="card-base p-4 flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-display font-black text-white animate-count-up">{result.round}</p>
                    <p className="text-xs text-slate-500">Round</p>
                  </div>
                  <div className="w-px h-10 bg-white/10" />
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Biggest Need</p>
                    <span className={`text-sm font-display font-bold ${POSITION_COLORS[result.positionalNeed] ?? 'text-white'}`}>
                      {result.positionalNeed}
                    </span>
                  </div>
                  <div className="ml-auto flex gap-2 flex-wrap">
                    {Object.entries(result.positionCounts).map(([pos, count]) => (
                      <span key={pos} className={`text-[10px] font-display font-bold px-2 py-1 rounded-lg bg-slate-900/60 ${POSITION_COLORS[pos] ?? 'text-slate-400'}`}>
                        {pos}: {count}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Tier lists */}
                <div className="card-base p-5 flex flex-col gap-5">
                  <TierList label="Tier 1 — Elite" players={result.tier1} accent="text-amber-400" />
                  <TierList label="Tier 2 — Solid" players={result.tier2} accent="text-blue-400" />
                  <TierList label="Tier 3 — Depth" players={result.tier3} accent="text-slate-400" />
                </div>

                {/* AI Analysis */}
                <div className="card-base p-5 border-l-4 border-l-indigo-500/60">
                  <p className="text-xs font-display font-bold text-indigo-400 uppercase tracking-widest mb-3">AI Recommendation</p>
                  <StreamingAnalysis hash={result.analysisHash} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
