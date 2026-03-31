import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Loader2 } from 'lucide-react';
import { fetchRankings, analyzePlayer } from '../../lib/api.ts';
import { PlayerCard } from '../shared/PlayerCard.tsx';
import { PlayerHistoryModal } from '../shared/PlayerHistoryModal.tsx';
import { StreamingAnalysis } from '../shared/StreamingAnalysis.tsx';
import { useLeague } from '../../lib/LeagueContext.tsx';
import type { Player } from '../../types/index.ts';

const NFL_POSITIONS = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
const MLB_POSITIONS = ['ALL', 'OF', 'SP', '1B', 'SS', '2B', '3B', 'C', 'RP'];
const FPL_POSITIONS = ['ALL', 'GK', 'DEF', 'MID', 'FWD'];
const IPL_POSITIONS = ['ALL', 'BAT', 'BOWL', 'AR', 'WK'];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};
const itemVariants = {
  hidden: { opacity: 0, scale: 0.92 },
  show:   { opacity: 1, scale: 1, transition: { duration: 0.2 } },
};

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/50 animate-pulse" style={{ height: '220px' }} />
  );
}

export function PlayerRankings() {
  const { config } = useLeague();
  const [position, setPosition] = useState('ALL');
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const [selected, setSelected] = useState<Player | null>(null);
  const [hoveredPlayer, setHoveredPlayer] = useState<Player | null>(null);
  const [analysisHash, setAnalysisHash] = useState('');
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const positions = config.sport === 'fpl' ? FPL_POSITIONS : config.sport === 'mlb' ? MLB_POSITIONS : config.sport === 'ipl' ? IPL_POSITIONS : NFL_POSITIONS;

  useEffect(() => {
    setPosition('ALL');
  }, [config.sport]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setPlayers([]);
    fetchRankings(config.sport, position === 'ALL' ? undefined : position, config.currentWeek, config.leagueId, config.espnS2, config.swid)
      .then(data => { if (!cancelled) setPlayers(data); })
      .catch(() => { if (!cancelled) setError('Failed to load rankings.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [config.sport, position, retryKey]);

  function handleHover(player: Player) {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setHoveredPlayer(player);
    setAnalysisHash('');
    hoverTimerRef.current = setTimeout(async () => {
      try {
        const { analysisHash: hash } = await analyzePlayer(player, config.sport, config.scoringFormat);
        setAnalysisHash(hash);
      } catch {
        // ignore
      }
    }, 400);
  }

  return (
    <div className="flex h-full">
      {/* Left: player grid */}
      <div className="flex flex-col flex-1 min-w-0 overflow-y-auto">
        {/* Header */}
        <div className="flex-shrink-0 px-4 md:px-6 pt-4 md:pt-5 pb-3 md:pb-4 border-b border-white/5">
          <h1 className="text-xl font-display font-black bg-gradient-to-r from-white via-blue-100 to-indigo-300 bg-clip-text text-transparent mb-1">
            Player Rankings
          </h1>
          <p className="text-slate-500 text-xs mb-4">Top players ranked by fantasy value — tap any card to see 5-week history</p>

          {/* Position filter tabs */}
          <div className="flex gap-1.5 flex-wrap">
            {positions.map(pos => (
              <button
                key={pos}
                onClick={() => setPosition(pos)}
                className={`px-3 py-1 rounded-lg text-xs font-display font-bold transition-all ${
                  position === pos
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/30'
                    : 'bg-slate-900/60 border border-white/5 text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="px-3 md:px-6 py-3 md:py-4 pb-6 md:pb-8">
          {error && (
            <div className="text-center py-8">
              <p className="text-rose-400 text-sm mb-3">{error}</p>
              <button
                onClick={() => { setError(''); setRetryKey(k => k + 1); }}
                className="px-4 py-2 bg-slate-900/60 hover:bg-white/5 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition-all border border-white/10"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && players.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-8">No players found for this position.</p>
          )}

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3"
          >
            {loading
              ? Array.from({ length: 18 }).map((_, i) => <SkeletonCard key={i} />)
              : players.map((p, i) => (
                  <motion.div
                    key={`${p.id}-${i}`}
                    variants={itemVariants}
                    className="relative"
                    onMouseEnter={() => handleHover(p)}
                  >
                    <div className="absolute -top-1.5 -left-1.5 z-10 w-6 h-6 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-[10px] font-display font-black text-slate-400">
                      {i + 1}
                    </div>
                    <PlayerCard
                      player={p}
                      sport={config.sport}
                      onClick={() => setSelected(p)}
                    />
                  </motion.div>
                ))
            }
          </motion.div>
        </div>
      </div>

      {/* Right: AI analysis panel — desktop only */}
      <div className="hidden md:flex w-72 flex-shrink-0 border-l border-white/5 flex-col overflow-y-auto bg-slate-950/60 backdrop-blur-sm">
        <AnimatePresence mode="wait">
          {hoveredPlayer ? (
            <motion.div
              key={hoveredPlayer.id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
              className="p-4 flex flex-col gap-4"
            >
              {/* Player header */}
              <div className="card-base p-3 border-l-4 border-l-indigo-500/50">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-display font-black text-sm truncate">{hoveredPlayer.name}</div>
                    <div className="text-slate-400 text-xs">{hoveredPlayer.position} · {hoveredPlayer.team}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-white font-display font-black text-lg leading-none animate-count-up">{Math.round(hoveredPlayer.rank ?? 0)}</div>
                    <div className="text-slate-500 text-[10px] uppercase tracking-widest">VALUE</div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {hoveredPlayer.avgPoints !== undefined && (
                  <div className="card-base p-2">
                    <div className="text-white font-display font-bold">{hoveredPlayer.avgPoints.toFixed(1)}</div>
                    <div className="text-slate-500">pts/wk</div>
                  </div>
                )}
                {hoveredPlayer.searchRank && (
                  <div className="card-base p-2">
                    <div className="text-white font-display font-bold">#{hoveredPlayer.searchRank}</div>
                    <div className="text-slate-500">overall rank</div>
                  </div>
                )}
                {hoveredPlayer.age !== undefined && (
                  <div className="card-base p-2">
                    <div className="text-white font-display font-bold">{hoveredPlayer.age}</div>
                    <div className="text-slate-500">age</div>
                  </div>
                )}
                {hoveredPlayer.yearsExp !== undefined && (
                  <div className="card-base p-2">
                    <div className="text-white font-display font-bold">{hoveredPlayer.yearsExp}y</div>
                    <div className="text-slate-500">experience</div>
                  </div>
                )}
                {hoveredPlayer.injuryStatus && (
                  <div className="bg-rose-900/40 rounded-xl p-2 col-span-2 border border-rose-500/20">
                    <div className="text-rose-300 font-bold uppercase text-[11px]">{hoveredPlayer.injuryStatus}</div>
                    <div className="text-slate-500">injury status</div>
                  </div>
                )}
              </div>

              {/* AI analysis */}
              <div>
                <div className="text-[10px] font-display font-bold text-indigo-400 uppercase tracking-widest mb-2">AI Analysis</div>
                {analysisHash ? (
                  <StreamingAnalysis hash={analysisHash} />
                ) : (
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <Loader2 size={12} className="animate-spin text-indigo-400" /> Analyzing...
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full p-6 text-center gap-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-900/60 border border-white/5 flex items-center justify-center">
                <BarChart3 size={24} className="text-slate-600" />
              </div>
              <div className="text-slate-400 text-sm font-medium">Player Analysis</div>
              <div className="text-slate-600 text-xs leading-relaxed">Hover over any player card for instant AI-powered stats analysis</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* History Modal */}
      {selected && (
        <PlayerHistoryModal
          player={selected}
          sport={config.sport}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
