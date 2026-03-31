import { useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Loader2, Target, TrendingUp } from 'lucide-react';
import { StreamingAnalysis } from '../shared/StreamingAnalysis.tsx';
import { GradeChip } from '../shared/GradeChip.tsx';
import { getWaiverRecommendations } from '../../lib/api.ts';
import { useLeague } from '../../lib/LeagueContext.tsx';

interface WaiverRec {
  player: {
    id: string;
    name: string;
    position: string;
    team: string;
    injuryStatus?: string | null;
    rank: number;
  };
  position: string;
  reason: string;
  priority: number;
  trending: boolean;
}

interface WaiverResult {
  recommendations: WaiverRec[];
  teamScore: { score: number; grade: string; positionBreakdown: Record<string, { score: number; grade: string }> };
  weakPositions: string[];
  analysisHash: string;
}

const POSITION_COLORS: Record<string, string> = {
  QB: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  RB: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  WR: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  TE: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  K: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  DEF: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  GK: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  MID: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  FWD: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  SP: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  RP: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
  OF: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  '1B': 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  '2B': 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  '3B': 'text-pink-400 bg-pink-500/10 border-pink-500/20',
  SS: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20',
  C: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
};

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

export function WaiverWire() {
  const { config } = useLeague();
  const [leagueId, setLeagueId] = useState(config.leagueId ?? '');
  const [rosterId, setRosterId] = useState(config.myRosterId ?? '');
  const [result, setResult] = useState<WaiverResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLoad() {
    if (!leagueId) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await getWaiverRecommendations({
        sport: config.sport,
        platform: config.platform,
        leagueId,
        rosterId: rosterId || undefined,
        scoringFormat: config.scoringFormat,
        week: config.currentWeek,
        espnS2: config.espnS2,
        swid: config.swid,
      });
      setResult(data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      if (msg !== 'upgrade_required') setError(msg ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-display font-black bg-gradient-to-r from-white via-blue-100 to-indigo-300 bg-clip-text text-transparent">
            Waiver Wire
          </h1>
          <span className="text-[10px] font-bold bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded-full">PRO</span>
        </div>
        <p className="text-xs text-slate-500 mt-1">Personalized pickup recommendations based on your roster's weakest positions</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6 flex flex-col md:flex-row gap-4 md:gap-6 min-h-0">
          {/* Left: Import */}
          <div className="w-full md:w-72 flex-shrink-0 flex flex-col gap-4">
            <div className="card-base p-4 border-l-4 border-l-violet-500/60">
              <p className="text-xs font-display font-bold text-slate-400 uppercase tracking-widest mb-3">Your League</p>
              <div className="flex flex-col gap-2">
                <input
                  value={leagueId}
                  onChange={e => setLeagueId(e.target.value)}
                  placeholder={config.sport === 'fpl' ? 'FPL Manager ID' : 'League ID'}
                  className="input-base"
                />
                <input
                  value={rosterId}
                  onChange={e => setRosterId(e.target.value)}
                  placeholder={config.sport === 'mlb' ? 'Your Team ID (optional)' : 'Your Roster ID (optional)'}
                  className="input-base"
                />
                {config.sport === 'mlb' && (
                  <p className="text-[10px] text-slate-500"><span className="font-bold text-red-400">MLB</span> uses ESPN — make sure your ESPN league ID is entered above</p>
                )}
                <button
                  onClick={handleLoad}
                  disabled={!leagueId || loading}
                  className="w-full py-2.5 rounded-xl font-display font-bold text-sm bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {loading ? <><Loader2 size={14} className="animate-spin" /> Loading...</> : 'Get Recommendations'}
                </button>
              </div>
              {error && <p className="text-rose-400 text-xs mt-2">{error}</p>}
            </div>

            {/* Roster grade summary */}
            {result && (
              <div className="card-base p-4 border-l-4 border-l-indigo-500/60">
                <p className="text-xs font-display font-bold text-slate-400 uppercase tracking-widest mb-3">Your Roster</p>
                <div className="flex items-center gap-3 mb-3">
                  <GradeChip grade={result.teamScore.grade} size="lg" />
                  <div>
                    <p className="text-white font-display font-bold animate-count-up">{result.teamScore.score}/100</p>
                    <p className="text-xs text-slate-500">Overall Score</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(result.teamScore.positionBreakdown).map(([pos, v]) => (
                    <div key={pos} className="flex items-center justify-between bg-slate-900/40 rounded-xl px-2.5 py-1.5">
                      <span className="text-xs text-slate-500 font-medium">{pos}</span>
                      <GradeChip grade={v.grade} size="sm" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Recommendations */}
          <div className="flex-1 min-w-0">
            {!result && !loading && (
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <ClipboardList size={40} className="mx-auto mb-3 text-slate-700" />
                  <p className="text-slate-500 text-sm">Enter your league ID to get personalized pickup recommendations</p>
                </div>
              </div>
            )}

            {result && (
              <div className="flex flex-col gap-4">
                {result.weakPositions.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl px-4 py-3 flex items-center gap-2">
                    <Target size={14} className="text-amber-400 flex-shrink-0" />
                    <p className="text-xs text-amber-400 font-semibold">
                      Weak spots: {result.weakPositions.join(', ')} — targeting these positions below
                    </p>
                  </div>
                )}

                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="flex flex-col gap-2"
                >
                  {result.recommendations.map((rec, i) => {
                    const posColor = POSITION_COLORS[rec.player.position] ?? POSITION_COLORS.K;
                    return (
                      <motion.div
                        key={rec.player.id}
                        variants={itemVariants}
                        whileHover={{ x: 4 }}
                        className="card-base p-4 flex items-start gap-4 hover:border-white/10 transition-colors cursor-pointer"
                      >
                        <div className="w-7 h-7 rounded-lg bg-slate-800/60 flex items-center justify-center text-sm font-display font-black text-slate-400 flex-shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-white text-sm">{rec.player.name}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${posColor}`}>{rec.player.position}</span>
                            {rec.trending && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20">
                                <TrendingUp size={10} /> HOT
                              </span>
                            )}
                            {rec.player.injuryStatus && (
                              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400">
                                {rec.player.injuryStatus}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">{rec.player.team} · {rec.reason}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-display font-bold text-white">{rec.player.rank}</p>
                          <p className="text-[10px] text-slate-500">Value</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>

                {/* AI Strategy */}
                <div className="card-base p-5 border-l-4 border-l-indigo-500/60">
                  <p className="text-xs font-display font-bold text-indigo-400 uppercase tracking-widest mb-3">Waiver Strategy</p>
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
