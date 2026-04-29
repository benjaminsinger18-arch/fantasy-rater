import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Loader2, ClipboardList, X } from 'lucide-react';
import { optimizeLineup, importSleeperRoster, importFplRoster, importEspnRoster, getLineupUsage } from '../../lib/api.ts';
import { PlayerSearch } from '../shared/PlayerSearch.tsx';
import { StreamingAnalysis } from '../shared/StreamingAnalysis.tsx';
import { useLeague } from '../../lib/LeagueContext.tsx';
import type { Player } from '../../types/index.ts';

interface LineupSlot {
  position: string;
  player: Player;
  score: number;
  confidence: 'high' | 'medium' | 'low';
}

interface LineupResult {
  starters: LineupSlot[];
  bench: Player[];
  analysisHash: string;
}

const CONFIDENCE_COLOR: Record<string, string> = {
  high: '#4DC878',
  medium: '#C8882A',
  low: '#9BA4B5',
};

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.18 } },
};

function StarterRow({ slot, index }: { slot: LineupSlot; index: number }) {
  const dot = CONFIDENCE_COLOR[slot.confidence];
  return (
    <motion.div
      variants={itemVariants}
      className="flex items-center gap-2 px-2 py-2 border-b border-[#2A2A2A] last:border-0"
    >
      <div className="w-5 text-[9px] font-mono text-[#444444] flex-shrink-0 text-right">{index + 1}</div>
      <div className="w-14 text-center text-[9px] font-mono font-bold text-[#E8321A] bg-[#E8321A]/10 px-1 py-0.5 flex-shrink-0">
        {slot.position}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-display font-black text-[#F2EFE8] truncate">{slot.player.name}</div>
        <div className="text-[9px] font-mono text-[#555555]">{slot.player.team}</div>
      </div>
      <div className="text-[10px] font-mono text-[#555555] flex-shrink-0">{Math.round(slot.score)}</div>
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dot }} title={slot.confidence} />
    </motion.div>
  );
}

function BenchRow({ player }: { player: Player }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 border-b border-[#2A2A2A] last:border-0 opacity-40">
      <div className="w-14 text-center text-[9px] font-mono text-[#555555] flex-shrink-0">{player.position}</div>
      <div className="flex-1 min-w-0 text-xs font-mono text-[#666666] truncate">{player.name}</div>
      <div className="text-[9px] font-mono text-[#444444] flex-shrink-0">{player.team}</div>
    </div>
  );
}

export function LineupOptimizer() {
  const { config } = useLeague();
  const [players, setPlayers] = useState<Player[]>([]);
  const [result, setResult] = useState<LineupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [usageInfo, setUsageInfo] = useState<{ used: number; limit: number | null; remaining: number | null } | null>(null);

  useEffect(() => {
    getLineupUsage().then(setUsageInfo).catch(() => {});
  }, []);

  async function handleImport() {
    if (!config.leagueId) { setError('Set a League ID in League Setup first.'); return; }
    setError(''); setImporting(true);
    try {
      const data = config.sport === 'fpl'
        ? await importFplRoster(config.leagueId)
        : config.sport === 'mlb' || config.platform === 'espn'
          ? await importEspnRoster(config.leagueId, config.myRosterId, config.sport, config.espnS2, config.swid, config.currentWeek)
          : await importSleeperRoster(config.leagueId, config.myRosterId ? Number(config.myRosterId) : undefined);
      setPlayers(data.roster);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  async function handleOptimize() {
    if (players.length < 5) { setError('Add at least 5 players to optimize.'); return; }
    setError(''); setLoading(true); setResult(null);
    try {
      const data = await optimizeLineup({
        players,
        sport: config.sport,
        scoringFormat: config.scoringFormat,
        week: config.currentWeek,
      });
      setResult(data);
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status !== 402) {
        setError(e instanceof Error ? e.message : 'Something went wrong');
      }
      getLineupUsage().then(setUsageInfo).catch(() => {});
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col md:flex-row h-full">
      {/* Left: Roster builder */}
      <div className="w-full md:w-1/2 flex flex-col p-4 md:p-5 border-b md:border-b-0 md:border-r border-[#2A2A2A] min-w-0">
        <div className="hidden md:block flex-shrink-0 mb-4">
          <h1 className="text-2xl font-display font-black text-[#F2EFE8] tracking-wider">Lineup Optimizer</h1>
          <p className="text-[10px] font-mono text-[#555555] mt-0.5 tracking-wider">AI-optimized starting lineup from your full roster</p>
          {usageInfo && usageInfo.limit !== null && (
            <p className="text-[9px] font-mono text-[#555555] mt-1">
              {usageInfo.limit} optimizations/day ·{' '}
              <span className={usageInfo.remaining === 0 ? 'text-[#E8321A]' : 'text-[#4DC878]'}>
                {usageInfo.remaining} remaining
              </span>
            </p>
          )}
        </div>

        {/* Import button */}
        <button
          onClick={handleImport}
          disabled={importing || !config.leagueId}
          className="w-full py-2.5 border border-[#484850] bg-[#2C2C31] text-xs font-mono font-bold text-[#8A8A8A] hover:text-[#F2EFE8] hover:border-[#E8321A]/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mb-3 flex-shrink-0"
        >
          {importing ? <Loader2 size={12} className="animate-spin" /> : null}
          {config.sport === 'fpl' ? 'Import FPL Team' : config.sport === 'mlb' ? 'Import ESPN Roster' : 'Import Sleeper Roster'}
        </button>

        {/* Manual player search */}
        <div className="flex-shrink-0 mb-3">
          <PlayerSearch
            onSelect={p => setPlayers(prev => [...prev, p])}
            placeholder='Add player manually...'
          />
        </div>

        {/* Player list */}
        <div className="flex-1 min-h-0 overflow-y-auto mb-3">
          {players.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardList size={28} className="mx-auto mb-2 text-[#2A2A2A]" />
              <p className="text-xs font-mono text-[#444444]">Import your roster or add players manually</p>
            </div>
          ) : (
            <div className="space-y-0">
              {players.map((p, i) => (
                <motion.div
                  key={`${p.name}-${i}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-2 px-2 py-1.5 border-b border-[#2A2A2A] hover:bg-[#2C2C31] group"
                >
                  <div className="w-10 text-[9px] font-mono text-[#555555]">{p.position}</div>
                  <div className="flex-1 min-w-0 text-xs font-mono text-[#F2EFE8] truncate">{p.name}</div>
                  <div className="text-[9px] font-mono text-[#444444] mr-1">{p.team}</div>
                  <button
                    onClick={() => setPlayers(prev => prev.filter((_, idx) => idx !== i))}
                    className="text-[#444444] hover:text-[#E8321A] opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={10} />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="text-[10px] font-mono text-[#444444] flex-shrink-0 mb-2">
          {players.length} players loaded
        </div>

        {error && <p className="text-rose-400 text-xs font-mono flex-shrink-0 mb-2">{error}</p>}

        <button
          onClick={handleOptimize}
          disabled={loading || players.length < 5}
          className="w-full py-3.5 bg-[#E8321A] hover:bg-[#C82818] disabled:opacity-40 disabled:cursor-not-allowed text-white font-display font-black tracking-widest uppercase text-sm transition-colors flex-shrink-0 flex items-center justify-center gap-2"
        >
          {loading
            ? <><Loader2 size={14} className="animate-spin" /> Optimizing...</>
            : <><Zap size={14} /> Optimize Lineup</>
          }
        </button>
      </div>

      {/* Right: Results */}
      <div className="w-full md:w-1/2 flex flex-col p-4 md:p-5 min-w-0 overflow-y-auto">
        <div className="hidden md:block flex-shrink-0 mb-4">
          <h2 className="text-2xl font-display font-black text-[#F2EFE8] tracking-wider">Optimal Lineup</h2>
          <p className="text-[10px] font-mono text-[#555555] mt-0.5">Results appear here after optimizing</p>
        </div>

        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex items-center justify-center min-h-[200px]"
            >
              <div className="text-center">
                <Zap size={28} className="mx-auto mb-3 text-[#E8321A] animate-pulse" />
                <p className="text-xs font-mono text-[#555555]">Building optimal lineup...</p>
              </div>
            </motion.div>
          )}

          {!loading && !result && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex items-center justify-center min-h-[200px]"
            >
              <div className="text-center">
                <Zap size={28} className="mx-auto mb-3 text-[#2A2A2A]" />
                <p className="text-xs font-mono text-[#444444]">Import your roster and tap<br />Optimize Lineup</p>
              </div>
            </motion.div>
          )}

          {!loading && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-3"
            >
              {/* Confidence legend */}
              <div className="flex items-center gap-3 text-[9px] font-mono text-[#555555]">
                {(['high', 'medium', 'low'] as const).map(c => (
                  <span key={c} className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: CONFIDENCE_COLOR[c] }} />
                    {c}
                  </span>
                ))}
              </div>

              {/* Starters */}
              <div className="card-base border-l-4 border-l-[#4DC878] overflow-hidden">
                <div className="px-3 py-2 border-b border-[#2A2A2A]">
                  <p className="text-[10px] font-mono font-bold text-[#4DC878] uppercase tracking-widest">
                    Starters · {result.starters.length} slots
                  </p>
                </div>
                <motion.div variants={containerVariants} initial="hidden" animate="show">
                  {result.starters.map((slot, i) => (
                    <StarterRow key={`${slot.position}-${slot.player.name}`} slot={slot} index={i} />
                  ))}
                </motion.div>
              </div>

              {/* Bench */}
              {result.bench.length > 0 && (
                <div className="card-base border-l-4 border-l-[#484850] overflow-hidden">
                  <div className="px-3 py-2 border-b border-[#2A2A2A]">
                    <p className="text-[10px] font-mono font-bold text-[#555555] uppercase tracking-widest">
                      Bench · {result.bench.length} players
                    </p>
                  </div>
                  {result.bench.map(p => (
                    <BenchRow key={p.name} player={p} />
                  ))}
                </div>
              )}

              {/* AI Analysis */}
              <div className="card-base p-4 border-l-4 border-l-[#E8321A]">
                <h3 className="text-[10px] font-mono font-bold text-[#E8321A] uppercase tracking-widest mb-3">AI Analysis</h3>
                <StreamingAnalysis hash={result.analysisHash} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
