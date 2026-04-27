import { useEffect, useState } from 'react';
import { fetchPlayerHistory } from '../../lib/api.ts';
import type { Player } from '../../types/index.ts';
import { Loader2, X } from 'lucide-react';

interface FPLWeek {
  round: number;
  points: number;
  minutes: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  bonus: number;
  yellowCards: number;
}

interface NFLWeek {
  round: number;
  points: number;
  passYd: number;
  passTd: number;
  rushYd: number;
  rushTd: number;
  rec: number;
  recYd: number;
  recTd: number;
}

type HistoryWeek = FPLWeek | NFLWeek;

function isFPL(w: HistoryWeek): w is FPLWeek {
  return 'minutes' in w;
}

interface Props {
  player: Player;
  sport: string;
  onClose: () => void;
}

export function PlayerHistoryModal({ player, sport, onClose }: Props) {
  const [history, setHistory] = useState<HistoryWeek[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!player.id) { setLoading(false); setError('No player ID available.'); return; }
    let cancelled = false;
    fetchPlayerHistory(player.id, sport)
      .then(data => { if (!cancelled) setHistory(data); })
      .catch(() => { if (!cancelled) setError('Could not load history.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [player.id, sport]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <div
        className="bg-[#1E1E22] border border-[#333338] w-full max-w-md mx-4 overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#333338] flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-[#F2EFE8] font-display font-black text-base uppercase tracking-wide truncate">
              {player.name}
            </div>
            <div className="text-[#666666] text-[11px] font-mono">
              {player.position} · {player.team || 'Free Agent'}
            </div>
          </div>
          <div className="text-[#E8321A] text-xl font-display font-black tabular-nums flex-shrink-0">
            {Math.round(player.rank ?? 0)}
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 border border-[#484850] flex items-center justify-center text-[#555555] hover:text-[#F2EFE8] hover:border-[#888888] transition-colors flex-shrink-0"
          >
            <X size={12} />
          </button>
        </div>

        {/* Subheading */}
        <div className="px-4 py-2 border-b border-[#2A2A2A]">
          <p className="text-[10px] font-mono text-[#555555] uppercase tracking-widest">
            Last 5 {sport === 'fpl' ? 'Gameweeks' : 'Weeks'}
          </p>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading && (
            <div className="flex items-center justify-center py-8 gap-2">
              <Loader2 size={14} className="animate-spin text-[#E8321A]" />
              <span className="text-[#555555] text-xs font-mono">Loading...</span>
            </div>
          )}
          {error && <p className="text-rose-400 text-xs font-mono text-center py-4">{error}</p>}
          {!loading && !error && history.length === 0 && (
            <p className="text-[#444444] text-xs font-mono text-center py-4">No history available.</p>
          )}
          {!loading && history.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[280px]">
                <thead>
                  <tr className="text-[#555555] font-mono uppercase tracking-widest text-[10px]">
                    <th className="text-left pb-2 font-semibold">{sport === 'fpl' ? 'GW' : 'WK'}</th>
                    <th className="text-right pb-2 font-semibold">PTS</th>
                    {history[0] && isFPL(history[0]) ? (
                      <>
                        <th className="text-right pb-2 font-semibold">MIN</th>
                        <th className="text-right pb-2 font-semibold">G</th>
                        <th className="text-right pb-2 font-semibold">A</th>
                        <th className="text-right pb-2 font-semibold">CS</th>
                        <th className="text-right pb-2 font-semibold">BNS</th>
                      </>
                    ) : (
                      <>
                        <th className="text-right pb-2 font-semibold">PSS</th>
                        <th className="text-right pb-2 font-semibold">RSH</th>
                        <th className="text-right pb-2 font-semibold">REC</th>
                        <th className="text-right pb-2 font-semibold">TD</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {history.map((w, i) => (
                    <tr
                      key={w.round}
                      className={i % 2 === 0 ? 'bg-[#252528]' : ''}
                    >
                      <td className="py-1.5 px-1 text-[#666666] font-mono">{w.round}</td>
                      <td className="py-1.5 px-1 text-right font-display font-black text-[#F2EFE8]">{w.points.toFixed(1)}</td>
                      {isFPL(w) ? (
                        <>
                          <td className="py-1.5 px-1 text-right text-[#AAAAAA] font-mono">{w.minutes}</td>
                          <td className="py-1.5 px-1 text-right text-[#AAAAAA] font-mono">{w.goals}</td>
                          <td className="py-1.5 px-1 text-right text-[#AAAAAA] font-mono">{w.assists}</td>
                          <td className="py-1.5 px-1 text-right text-[#AAAAAA] font-mono">{w.cleanSheets}</td>
                          <td className="py-1.5 px-1 text-right text-[#AAAAAA] font-mono">{w.bonus}</td>
                        </>
                      ) : (
                        <>
                          <td className="py-1.5 px-1 text-right text-[#AAAAAA] font-mono">{(w as NFLWeek).passYd > 0 ? `${(w as NFLWeek).passYd}y` : '—'}</td>
                          <td className="py-1.5 px-1 text-right text-[#AAAAAA] font-mono">{(w as NFLWeek).rushYd > 0 ? `${(w as NFLWeek).rushYd}y` : '—'}</td>
                          <td className="py-1.5 px-1 text-right text-[#AAAAAA] font-mono">{(w as NFLWeek).rec > 0 ? `${(w as NFLWeek).rec}/${(w as NFLWeek).recYd}y` : '—'}</td>
                          <td className="py-1.5 px-1 text-right text-[#AAAAAA] font-mono">{(w as NFLWeek).passTd + (w as NFLWeek).rushTd + (w as NFLWeek).recTd}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
