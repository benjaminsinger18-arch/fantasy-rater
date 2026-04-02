import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Loader2, X, Plus } from 'lucide-react';
import { PlayerSearch } from '../shared/PlayerSearch.tsx';
import { StreamingAnalysis } from '../shared/StreamingAnalysis.tsx';
import { GradeChip } from '../shared/GradeChip.tsx';
import { compareStartSit } from '../../lib/api.ts';
import { useLeague } from '../../lib/LeagueContext.tsx';
import type { Player } from '../../types/index.ts';

interface RankedPlayer {
  name: string;
  score: number;
  recent: number[];
  avg: number;
}

interface StartSitResult {
  recommended: string;
  confidence: string;
  rankedPlayers: RankedPlayer[];
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
  index,
  player,
  onSelect,
  onClear,
}: {
  index: number;
  player: Player | null;
  onSelect: (p: Player) => void;
  onClear: () => void;
}) {
  const accentColors = ['border-l-[#E8321A]', 'border-l-[#4DC878]', 'border-l-[#E8C432]', 'border-l-[#6B8CFF]'];
  return (
    <div className={`card-base border-l-4 flex flex-col min-w-0 ${accentColors[index] ?? 'border-l-[#484850]'}`}>
      <div className="px-3 pt-3 pb-2">
        <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#555555] mb-2">
          Player {index + 1}
        </h3>
        <PlayerSearch onSelect={onSelect} placeholder="Search player..." />
      </div>
      {player && (
        <div className="px-3 pb-3">
          <div className="flex items-center gap-3 p-2 bg-[#222226] border border-[#2A2A2A]">
            <div className="flex-1 min-w-0">
              <p className="font-display font-black text-[#F2EFE8] text-sm truncate">{player.name}</p>
              <p className="text-xs font-mono text-[#555555]">{player.position} · {player.team}</p>
              {player.injuryStatus && (
                <span className="inline-block mt-1 text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 bg-rose-500/20 text-rose-400">
                  {player.injuryStatus}
                </span>
              )}
            </div>
            <button
              onClick={onClear}
              className="text-[#484850] hover:text-[#F2EFE8] transition-colors flex-shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function StartSit() {
  const { config } = useLeague();
  const [players, setPlayers] = useState<(Player | null)[]>([null, null]);
  const [result, setResult] = useState<StartSitResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const filledPlayers = players.filter((p): p is Player => p !== null);
  const canCompare = filledPlayers.length >= 2;

  function setPlayerAt(index: number, player: Player) {
    setPlayers(prev => {
      const next = [...prev];
      next[index] = player;
      return next;
    });
    setResult(null);
  }

  function clearPlayerAt(index: number) {
    setPlayers(prev => {
      const next = [...prev];
      next[index] = null;
      // Remove trailing nulls beyond minimum 2 slots
      while (next.length > 2 && next[next.length - 1] === null) next.pop();
      return next;
    });
    setResult(null);
  }

  function addSlot() {
    if (players.length < 4) setPlayers(prev => [...prev, null]);
  }

  async function handleCompare() {
    if (!canCompare) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await compareStartSit({
        players: filledPlayers,
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
    result?.confidence === 'Clear Start' ? 'text-[#4DC878]' :
    result?.confidence === 'Start' ? 'text-[#6B8CFF]' : 'text-[#E8C432]';

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="hidden md:flex flex-col px-5 py-4 border-b border-[#2A2A2A] flex-shrink-0">
        <h1 className="text-2xl font-display font-black text-[#F2EFE8] tracking-wider">Start/Sit Optimizer</h1>
        <p className="text-[10px] font-mono text-[#555555] mt-0.5 tracking-wider">Compare up to 4 players — get an AI-powered start recommendation</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-5 flex flex-col md:flex-row gap-4 md:gap-5 h-full min-h-0">
          {/* Left: Player selection */}
          <div className="w-full md:w-80 flex-shrink-0 flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {players.map((player, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                >
                  <PlayerSlot
                    index={i}
                    player={player}
                    onSelect={p => setPlayerAt(i, p)}
                    onClear={() => clearPlayerAt(i)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            {players.length < 4 && (
              <button
                onClick={addSlot}
                className="w-full py-2 border border-dashed border-[#484850] text-[#555555] hover:text-[#F2EFE8] hover:border-[#E8321A]/40 transition-colors text-xs font-mono flex items-center justify-center gap-1.5"
              >
                <Plus size={12} />
                Add Player ({players.length}/4)
              </button>
            )}

            <button
              onClick={handleCompare}
              disabled={!canCompare || loading}
              className="w-full py-3.5 bg-[#E8321A] hover:bg-[#C82818] disabled:opacity-40 disabled:cursor-not-allowed text-white font-display font-black tracking-widest uppercase text-sm transition-colors flex items-center justify-center gap-2 mt-1"
            >
              {loading ? (
                <><Loader2 size={14} className="animate-spin" /> Analyzing...</>
              ) : 'Compare Players'}
            </button>

            {error && (
              <p className="text-rose-400 text-xs font-mono">{error}</p>
            )}
          </div>

          {/* Right: Results */}
          <div className="flex-1 min-w-0">
            {!result && !loading && (
              <div className="h-full flex items-center justify-center min-h-[200px]">
                <div className="text-center">
                  <RefreshCw size={32} className="mx-auto mb-3 text-[#2A2A2A]" />
                  <p className="text-xs font-mono text-[#444444]">Add 2–4 players and tap<br />Compare Players</p>
                </div>
              </div>
            )}

            {result && (
              <div className="flex flex-col gap-3">
                {/* Recommendation */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card-base p-4 border-l-4 border-l-[#4DC878]"
                >
                  <p className="text-[10px] font-mono text-[#555555] uppercase tracking-widest mb-2">Recommendation</p>
                  <div className="flex items-baseline gap-3">
                    <span className="text-xl font-display font-black text-[#F2EFE8]">Start {result.recommended}</span>
                    <span className={`text-xs font-mono font-bold ${confidenceColor}`}>{result.confidence}</span>
                  </div>
                </motion.div>

                {/* Ranked comparison */}
                <div className="card-base p-4">
                  <p className="text-[10px] font-mono text-[#555555] uppercase tracking-widest mb-3">Rankings</p>
                  <div className="flex flex-col gap-2">
                    {result.rankedPlayers.map((rp, i) => (
                      <motion.div
                        key={rp.name}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`flex items-center gap-3 p-2 ${i === 0 ? 'bg-[#4DC878]/5 border border-[#4DC878]/20' : 'bg-[#222226] border border-[#2A2A2A]'}`}
                      >
                        <div className={`w-5 h-5 flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0 ${i === 0 ? 'text-[#4DC878]' : 'text-[#555555]'}`}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-display font-black truncate ${i === 0 ? 'text-[#F2EFE8]' : 'text-[#8A8A8A]'}`}>{rp.name}</p>
                          <p className="text-[10px] font-mono text-[#444444]">
                            {rp.avg} avg · {rp.recent.length > 0 ? rp.recent.join(', ') : 'no data'}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <GradeChip grade={scoreToGrade(rp.score)} />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* AI Analysis */}
                <div className="card-base p-4 border-l-4 border-l-[#E8321A]">
                  <p className="text-[10px] font-mono text-[#E8321A] uppercase tracking-widest mb-3">AI Analysis</p>
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
