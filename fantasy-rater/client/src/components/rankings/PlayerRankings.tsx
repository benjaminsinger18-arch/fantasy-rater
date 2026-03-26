import { useState, useEffect, useRef } from 'react';
import { fetchRankings, analyzePlayer } from '../../lib/api.ts';
import { PlayerCard } from '../shared/PlayerCard.tsx';
import { PlayerHistoryModal } from '../shared/PlayerHistoryModal.tsx';
import { StreamingAnalysis } from '../shared/StreamingAnalysis.tsx';
import { useLeague } from '../../lib/LeagueContext.tsx';
import type { Player } from '../../types/index.ts';

const NFL_POSITIONS = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
const MLB_POSITIONS = ['ALL', 'OF', 'SP', '1B', 'SS', '2B', '3B', 'C', 'RP'];
const FPL_POSITIONS = ['ALL', 'GK', 'DEF', 'MID', 'FWD'];

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-slate-700/40 bg-slate-800/50 animate-pulse" style={{ height: '220px' }} />
  );
}

export function PlayerRankings() {
  const { config } = useLeague();
  const [position, setPosition] = useState('ALL');
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Player | null>(null);
  const [hoveredPlayer, setHoveredPlayer] = useState<Player | null>(null);
  const [analysisHash, setAnalysisHash] = useState('');
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const positions = config.sport === 'fpl' ? FPL_POSITIONS : config.sport === 'mlb' ? MLB_POSITIONS : NFL_POSITIONS;

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
  }, [config.sport, position]);

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
    <div className="flex h-full" style={{ background: 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)' }}>
      {/* Left: player grid */}
      <div className="flex flex-col flex-1 min-w-0 overflow-y-auto">
        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-5 pb-4 border-b border-slate-700/50">
          <h1 className="text-xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent mb-1">
            Player Rankings
          </h1>
          <p className="text-slate-500 text-xs mb-4">Top players ranked by fantasy value — hover for AI analysis, click to see 5-week history</p>

          {/* Position filter tabs */}
          <div className="flex gap-1.5 flex-wrap">
            {positions.map(pos => (
              <button
                key={pos}
                onClick={() => setPosition(pos)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  position === pos
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="px-6 py-4 pb-8">
          {error && <p className="text-rose-400 text-sm text-center py-8">{error}</p>}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {loading
              ? Array.from({ length: 18 }).map((_, i) => <SkeletonCard key={i} />)
              : players.map((p, i) => (
                  <div
                    key={`${p.id}-${i}`}
                    className="relative"
                    onMouseEnter={() => handleHover(p)}
                  >
                    <div className="absolute -top-1.5 -left-1.5 z-10 w-6 h-6 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-[10px] font-black text-slate-400">
                      {i + 1}
                    </div>
                    <PlayerCard
                      player={p}
                      sport={config.sport}
                      onClick={() => setSelected(p)}
                    />
                  </div>
                ))
            }
          </div>
        </div>
      </div>

      {/* Right: AI analysis panel */}
      <div className="w-72 flex-shrink-0 border-l border-slate-700/50 flex flex-col overflow-y-auto" style={{ background: '#080f1e' }}>
        {hoveredPlayer ? (
          <div className="p-4 flex flex-col gap-4">
            {/* Player header */}
            <div className="flex items-center gap-3 pb-3 border-b border-slate-700/50">
              <div className="flex-1 min-w-0">
                <div className="text-white font-black text-sm truncate">{hoveredPlayer.name}</div>
                <div className="text-slate-400 text-xs">{hoveredPlayer.position} · {hoveredPlayer.team}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-white font-black text-lg leading-none">{Math.round(hoveredPlayer.rank ?? 0)}</div>
                <div className="text-slate-500 text-[10px]">VALUE</div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {hoveredPlayer.avgPoints !== undefined && (
                <div className="bg-slate-800/60 rounded-lg p-2">
                  <div className="text-white font-bold">{hoveredPlayer.avgPoints.toFixed(1)}</div>
                  <div className="text-slate-500">pts/wk</div>
                </div>
              )}
              {hoveredPlayer.searchRank && (
                <div className="bg-slate-800/60 rounded-lg p-2">
                  <div className="text-white font-bold">#{hoveredPlayer.searchRank}</div>
                  <div className="text-slate-500">overall rank</div>
                </div>
              )}
              {hoveredPlayer.age !== undefined && (
                <div className="bg-slate-800/60 rounded-lg p-2">
                  <div className="text-white font-bold">{hoveredPlayer.age}</div>
                  <div className="text-slate-500">age</div>
                </div>
              )}
              {hoveredPlayer.yearsExp !== undefined && (
                <div className="bg-slate-800/60 rounded-lg p-2">
                  <div className="text-white font-bold">{hoveredPlayer.yearsExp}y</div>
                  <div className="text-slate-500">experience</div>
                </div>
              )}
              {hoveredPlayer.injuryStatus && (
                <div className="bg-rose-900/40 rounded-lg p-2 col-span-2">
                  <div className="text-rose-300 font-bold uppercase text-[11px]">{hoveredPlayer.injuryStatus}</div>
                  <div className="text-slate-500">injury status</div>
                </div>
              )}
            </div>

            {/* AI analysis */}
            <div>
              <div className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-2">AI Analysis</div>
              {analysisHash ? (
                <StreamingAnalysis hash={analysisHash} />
              ) : (
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <span className="animate-spin inline-block">⟳</span> Analyzing...
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-slate-800/60 flex items-center justify-center text-2xl">📊</div>
            <div className="text-slate-400 text-sm font-medium">Player Analysis</div>
            <div className="text-slate-600 text-xs leading-relaxed">Hover over any player card to get instant AI-powered stats analysis</div>
          </div>
        )}
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
