import { useState, useEffect, useRef } from 'react';
import { searchPlayers } from '../../lib/api.ts';
import { InjuryBadge } from './InjuryBadge.tsx';
import { useLeague } from '../../lib/LeagueContext.tsx';
import type { Player } from '../../types/index.ts';

interface Props {
  onSelect: (player: Player) => void;
  placeholder?: string;
}

function getHeadshotUrl(player: Player, sport: string): string | null {
  if (player.photoCode) {
    return `https://resources.premierleague.com/premierleague/photos/players/110x140/p${player.photoCode}.png`;
  }
  if (player.espnId) {
    return `https://a.espncdn.com/i/headshots/${sport}/players/full/${player.espnId}.png`;
  }
  if (player.id) {
    return `https://sleepercdn.com/content/${sport}/players/thumb/${player.id}.jpg`;
  }
  return null;
}

function PlayerAvatar({ player, sport }: { player: Player; sport: string }) {
  const [imgError, setImgError] = useState(false);
  const url = getHeadshotUrl(player, sport);
  const initials = player.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  if (url && !imgError) {
    return (
      <img
        src={url}
        alt={player.name}
        onError={() => setImgError(true)}
        className="w-full h-full object-cover object-top"
      />
    );
  }
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-600 to-violet-700 text-white text-xs font-black">
      {initials}
    </div>
  );
}

export function PlayerSearch({ onSelect, placeholder = 'Search players or "TEAM"...' }: Props) {
  const { config } = useLeague();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isTeamSearch = query.startsWith('"');
    if (!query.trim() || (!isTeamSearch && query.length < 2)) {
      setResults([]);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchPlayers(query, config.sport, undefined, config.leagueId, config.espnS2, config.swid, config.currentWeek);
        setResults(data.slice(0, 10));
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query, config]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function select(player: Player) {
    onSelect(player);
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
      />
      {loading && (
        <span className="absolute right-3 top-2.5 text-slate-400 animate-spin text-xs">⟳</span>
      )}
      {open && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl shadow-black/50 max-h-72 overflow-y-auto">
          {query.startsWith('"') && (
            <li className="px-3 py-1.5 text-xs text-slate-500 border-b border-slate-700">
              Showing all players for team — click to add individually
            </li>
          )}
          {results.map((p, i) => (
            <li
              key={`${p.id ?? p.name}-${i}`}
              onClick={() => select(p)}
              className="flex items-center gap-3 px-3 py-2 hover:bg-slate-700/70 cursor-pointer transition-colors"
            >
              <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 ring-1 ring-white/10">
                <PlayerAvatar player={p} sport={config.sport} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-white text-sm font-semibold block truncate">{p.name}</span>
                <span className="text-slate-400 text-xs">{p.position} · {p.team}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {p.injuryStatus && <InjuryBadge status={p.injuryStatus} />}
                {p.avgPoints && <span className="text-xs text-slate-400">{p.avgPoints.toFixed(1)}pts</span>}
                {p.epNext !== undefined && <span className="text-xs text-slate-400">EP:{p.epNext}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
