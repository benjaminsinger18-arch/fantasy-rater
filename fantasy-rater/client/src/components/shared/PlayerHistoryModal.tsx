import { useEffect, useState } from 'react';
import { fetchPlayerHistory } from '../../lib/api.ts';
import type { Player } from '../../types/index.ts';

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

function getHeadshotUrl(player: Player): string | null {
  if (player.photoCode) {
    return `https://resources.premierleague.com/premierleague/photos/players/110x140/p${player.photoCode}.png`;
  }
  if (player.id) {
    return `https://sleepercdn.com/content/nfl/players/thumb/${player.id}.jpg`;
  }
  return null;
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
  const [imgError, setImgError] = useState(false);
  const photoUrl = getHeadshotUrl(player);
  const initials = player.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  useEffect(() => {
    if (!player.id) { setLoading(false); setError('No player ID available.'); return; }
    fetchPlayerHistory(player.id, sport)
      .then(setHistory)
      .catch(() => setError('Could not load history.'))
      .finally(() => setLoading(false));
  }, [player.id, sport]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md mx-4 overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl overflow-hidden ring-2 ring-white/20 flex-shrink-0">
            {photoUrl && !imgError ? (
              <img src={photoUrl} alt={player.name} onError={() => setImgError(true)} className="w-full h-full object-cover object-top" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-700 to-violet-800 text-white text-lg font-black">
                {initials}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-black text-lg truncate">{player.name}</div>
            <div className="text-indigo-200 text-sm">{player.position} · {player.team}</div>
          </div>
          <div className="text-white/80 text-2xl font-black">{Math.round(player.rank ?? 0)}</div>
          <button onClick={onClose} className="text-white/60 hover:text-white text-xl leading-none ml-2">✕</button>
        </div>

        {/* Title bar */}
        <div className="px-5 py-3 border-b border-slate-700/50">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Last 5 {sport === 'fpl' ? 'Gameweeks' : 'Weeks'}</h3>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading && (
            <div className="flex items-center justify-center py-8 text-slate-400 gap-2 text-sm">
              <span className="animate-spin">⟳</span> Loading history...
            </div>
          )}
          {error && <p className="text-rose-400 text-sm text-center py-4">{error}</p>}
          {!loading && !error && history.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-4">No history available.</p>
          )}
          {!loading && history.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase">
                  <th className="text-left pb-2 font-semibold">{sport === 'fpl' ? 'GW' : 'Wk'}</th>
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
                  <tr key={w.round} className={`${i % 2 === 0 ? 'bg-slate-800/40' : ''} rounded`}>
                    <td className="py-1.5 px-2 text-slate-400 font-medium rounded-l">{w.round}</td>
                    <td className="py-1.5 px-2 text-right font-black text-white">{w.points.toFixed(1)}</td>
                    {isFPL(w) ? (
                      <>
                        <td className="py-1.5 px-2 text-right text-slate-300">{w.minutes}</td>
                        <td className="py-1.5 px-2 text-right text-slate-300">{w.goals}</td>
                        <td className="py-1.5 px-2 text-right text-slate-300">{w.assists}</td>
                        <td className="py-1.5 px-2 text-right text-slate-300">{w.cleanSheets}</td>
                        <td className="py-1.5 px-2 text-right text-slate-300 rounded-r">{w.bonus}</td>
                      </>
                    ) : (
                      <>
                        <td className="py-1.5 px-2 text-right text-slate-300">{w.passYd > 0 ? `${w.passYd}y` : '—'}</td>
                        <td className="py-1.5 px-2 text-right text-slate-300">{w.rushYd > 0 ? `${w.rushYd}y` : '—'}</td>
                        <td className="py-1.5 px-2 text-right text-slate-300">{w.rec > 0 ? `${w.rec}/${w.recYd}y` : '—'}</td>
                        <td className="py-1.5 px-2 text-right text-slate-300 rounded-r">{w.passTd + w.rushTd + w.recTd}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
