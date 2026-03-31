import { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Loader2, X } from 'lucide-react';
import { PlayerSearch } from '../shared/PlayerSearch.tsx';
import { StreamingAnalysis } from '../shared/StreamingAnalysis.tsx';
import { GradeChip } from '../shared/GradeChip.tsx';
import { compareStartSit } from '../../lib/api.ts';
import { useLeague } from '../../lib/LeagueContext.tsx';
import type { Player } from '../../types/index.ts';

interface StartSitResult {
  recommended: string;
  confidence: string;
  scoreA: number;
  scoreB: number;
  recentA: number[];
  recentB: number[];
  avgA: number;
  avgB: number;
  analysisHash: string;
}

function scoreToGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 80) return 'A-';
  if (score >= 77) return 'B+';
  if (score >= 73) return 'B';
  if (score >= 70) return 'B-';
  if (score >= 67) return 'C+';
  if (score >= 63) return 'C';
  if (score >= 60) return 'C-';
  return 'D';
}

function PlayerSlot({
  label,
  player,
  onSelect,
  onClear,
  accentClass,
}: {
  label: string;
  player: Player | null;
  onSelect: (p: Player) => void;
  onClear: () => void;
  sport: string;
  accentClass: string;
}) {
  return (
    <div className={`card-base border-l-4 flex flex-col min-w-0 ${accentClass}`}>
      <div className="px-3 pt-3 pb-2">
        <h3 className="text-xs font-display font-bold uppercase tracking-widest text-slate-500 mb-2">{label}</h3>
        <PlayerSearch onSelect={onSelect} placeholder="Search player..." />
      </div>
      {player && (
        <div className="px-3 pb-3">
          <div className="card-base p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-sm truncate">{player.name}</p>
              <p className="text-xs text-slate-400">{player.position} · {player.team}</p>
              {player.injuryStatus && (
                <span className="inline-block mt-1 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400">
                  {player.injuryStatus}
                </span>
              )}
            </div>
            <button
              onClick={onClear}
              className="text-slate-600 hover:text-slate-300 transition-colors flex-shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function StartSit() {
  const { config } = useLeague();
  const [playerA, setPlayerA] = useState<Player | null>(null);
  const [playerB, setPlayerB] = useState<Player | null>(null);
  const [result, setResult] = useState<StartSitResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCompare() {
    if (!playerA || !playerB) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await compareStartSit({
        playerA: { ...playerA, id: playerA.id },
        playerB: { ...playerB, id: playerB.id },
        sport: config.sport,
        scoringFormat: config.scoringFormat,
        week: config.currentWeek,
      });
      setResult(data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      if (msg !== 'upgrade_required') setError(msg ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const confidenceColor =
    result?.confidence === 'Clear Start' ? 'text-emerald-400' :
    result?.confidence === 'Start' ? 'text-blue-400' : 'text-amber-400';

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="hidden md:flex flex-col px-6 py-5 border-b border-white/5 flex-shrink-0">
        <h1 className="text-xl font-display font-black bg-gradient-to-r from-white via-blue-100 to-indigo-300 bg-clip-text text-transparent">
          Start/Sit Optimizer
        </h1>
        <p className="text-xs text-slate-500 mt-1">Compare two players at the same position — get an AI-powered start recommendation</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6 flex flex-col md:flex-row gap-4 md:gap-6 h-full min-h-0">
          {/* Left: Player selection */}
          <div className="w-full md:w-80 flex-shrink-0 flex flex-col gap-2 md:gap-4">
            <PlayerSlot
              label="Player A"
              player={playerA}
              onSelect={setPlayerA}
              onClear={() => { setPlayerA(null); setResult(null); }}
              sport={config.sport}
              accentClass="border-l-indigo-500/40"
            />
            <div className="flex items-center justify-center gap-3">
              <div className="flex-1 h-px bg-white/5" />
              <span className="text-slate-600 text-xs font-display font-bold uppercase tracking-widest">vs</span>
              <div className="flex-1 h-px bg-white/5" />
            </div>
            <PlayerSlot
              label="Player B"
              player={playerB}
              onSelect={setPlayerB}
              onClear={() => { setPlayerB(null); setResult(null); }}
              sport={config.sport}
              accentClass="border-l-violet-500/40"
            />

            <button
              onClick={handleCompare}
              disabled={!playerA || !playerB || loading}
              className="w-full py-3.5 rounded-2xl font-display font-bold text-sm bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> Analyzing...</>
              ) : 'Compare Players'}
            </button>

            {error && (
              <div className="text-rose-300 text-sm bg-rose-500/10 rounded-xl p-3 border border-rose-500/20">{error}</div>
            )}
          </div>

          {/* Right: Results */}
          <div className="flex-1 min-w-0">
            {!result && !loading && (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <RefreshCw size={40} className="mx-auto mb-3 text-slate-700" />
                  <p className="text-slate-500 text-sm">Select two players to compare</p>
                </div>
              </div>
            )}

            {result && (
              <div className="flex flex-col gap-4">
                {/* Recommendation */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card-base p-5 border-l-4 border-l-emerald-500/60 animate-verdict-pop"
                >
                  <p className="text-xs font-display font-bold text-slate-500 uppercase tracking-widest mb-2">Recommendation</p>
                  <div className="flex items-baseline gap-3">
                    <span className="text-2xl font-display font-black text-white">Start {result.recommended}</span>
                    <span className={`text-sm font-bold ${confidenceColor}`}>{result.confidence}</span>
                  </div>
                </motion.div>

                {/* Stat comparison */}
                <div className="card-base p-5">
                  <p className="text-xs font-display font-bold text-slate-500 uppercase tracking-widest mb-3">Comparison</p>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-center">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">{playerA?.name.split(' ').slice(-1)[0] ?? 'Player A'}</p>
                      <GradeChip grade={scoreToGrade(result.scoreA)} />
                      <p className="text-xs text-slate-400 mt-2">{result.avgA} avg</p>
                      <p className="text-[10px] text-slate-600 mt-1">
                        {result.recentA.length > 0 ? result.recentA.join(', ') : 'No data'}
                      </p>
                    </div>
                    <div className="flex items-center justify-center">
                      <span className="text-slate-600 font-display font-bold">vs</span>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">{playerB?.name.split(' ').slice(-1)[0] ?? 'Player B'}</p>
                      <GradeChip grade={scoreToGrade(result.scoreB)} />
                      <p className="text-xs text-slate-400 mt-2">{result.avgB} avg</p>
                      <p className="text-[10px] text-slate-600 mt-1">
                        {result.recentB.length > 0 ? result.recentB.join(', ') : 'No data'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* AI Analysis */}
                <div className="card-base p-5 border-l-4 border-l-indigo-500/60">
                  <p className="text-xs font-display font-bold text-indigo-400 uppercase tracking-widest mb-3">AI Analysis</p>
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
