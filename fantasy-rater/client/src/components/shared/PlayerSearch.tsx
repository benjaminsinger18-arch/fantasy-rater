import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
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
    <div className="w-full h-full flex items-center justify-center bg-[#222222] text-[#8A8A8A] text-xs font-mono font-bold">
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
        className="input-base"
      />
      {loading && (
        <Loader2 size={13} className="absolute right-3 top-2.5 animate-spin text-[#E8321A]" />
      )}
      {open && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-[#0A0A0A] border border-[#2A2A2A] shadow-2xl shadow-black/80 max-h-72 overflow-y-auto">
          {query.startsWith('"') && (
            <li className="px-3 py-1.5 text-[10px] font-mono text-[#444444] border-b border-[#2A2A2A]">
              Showing all players for team — tap to add individually
            </li>
          )}
          {results.map((p, i) => (
            <li
              key={`${p.id ?? p.name}-${i}`}
              onClick={() => select(p)}
              className="flex items-center gap-3 px-3 py-2 hover:bg-[#111111] cursor-pointer transition-colors border-b border-[#1E1E1E] last:border-b-0"
            >
              <div className="w-8 h-8 overflow-hidden flex-shrink-0 border border-[#2A2A2A]">
                <PlayerAvatar player={p} sport={config.sport} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[#F2EFE8] text-xs font-display font-black tracking-wide block truncate">{p.name}</span>
                <span className="text-[#555555] font-mono text-[10px]">{p.position} · {p.team}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {p.injuryStatus && <InjuryBadge status={p.injuryStatus} />}
                {p.avgPoints && <span className="text-[10px] font-mono text-[#8A8A8A]">{p.avgPoints.toFixed(1)}pts</span>}
                {p.epNext !== undefined && <span className="text-[10px] font-mono text-[#8A8A8A]">EP:{p.epNext}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
