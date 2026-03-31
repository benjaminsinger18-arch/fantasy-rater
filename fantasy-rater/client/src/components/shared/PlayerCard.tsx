import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { Player } from '../../types/index.ts';

type Tier = 'iron' | 'bronze' | 'silver' | 'emerald' | 'sapphire' | 'amethyst' | 'gold' | 'divine';

function cardTier(rank: number): Tier {
  if (rank >= 95) return 'divine';
  if (rank >= 85) return 'gold';
  if (rank >= 75) return 'amethyst';
  if (rank >= 60) return 'sapphire';
  if (rank >= 45) return 'emerald';
  if (rank >= 30) return 'silver';
  if (rank >= 15) return 'bronze';
  return 'iron';
}

interface TierStyle {
  bgClass: string;
  border: string;
  statBg: string;
  text: string;
  subtext: string;
  divider: string;
  glowClass: string;
  avatarGradient: string;
  isDivine?: boolean;
}

const TIER_STYLES: Record<Tier, TierStyle> = {
  iron: {
    bgClass: 'bg-gradient-to-b from-gray-500 to-gray-900',
    border: 'border-gray-500/40',
    statBg: 'bg-gray-800/70',
    text: 'text-gray-300',
    subtext: 'text-gray-500',
    divider: 'border-gray-600/30',
    glowClass: 'glow-iron',
    avatarGradient: 'from-gray-600 to-gray-800',
  },
  bronze: {
    bgClass: 'bg-gradient-to-b from-amber-700 to-amber-950',
    border: 'border-amber-600/50',
    statBg: 'bg-amber-950/60',
    text: 'text-amber-100',
    subtext: 'text-amber-400',
    divider: 'border-amber-700/30',
    glowClass: 'glow-bronze',
    avatarGradient: 'from-amber-600 to-amber-900',
  },
  silver: {
    bgClass: 'bg-gradient-to-b from-slate-300 to-slate-600',
    border: 'border-slate-300/60',
    statBg: 'bg-slate-700/60',
    text: 'text-slate-900',
    subtext: 'text-slate-700',
    divider: 'border-slate-400/40',
    glowClass: 'glow-silver',
    avatarGradient: 'from-slate-400 to-slate-600',
  },
  emerald: {
    bgClass: 'bg-gradient-to-b from-emerald-400 to-emerald-900',
    border: 'border-emerald-400/50',
    statBg: 'bg-emerald-950/60',
    text: 'text-emerald-50',
    subtext: 'text-emerald-300',
    divider: 'border-emerald-400/30',
    glowClass: 'glow-emerald',
    avatarGradient: 'from-emerald-500 to-emerald-800',
  },
  sapphire: {
    bgClass: 'bg-gradient-to-b from-blue-400 to-blue-900',
    border: 'border-blue-400/60',
    statBg: 'bg-blue-950/60',
    text: 'text-blue-50',
    subtext: 'text-blue-300',
    divider: 'border-blue-400/30',
    glowClass: 'glow-sapphire',
    avatarGradient: 'from-blue-500 to-blue-800',
  },
  amethyst: {
    bgClass: 'bg-gradient-to-b from-purple-400 to-purple-950',
    border: 'border-purple-400/60',
    statBg: 'bg-purple-950/60',
    text: 'text-purple-50',
    subtext: 'text-purple-300',
    divider: 'border-purple-400/30',
    glowClass: 'glow-amethyst',
    avatarGradient: 'from-purple-500 to-purple-900',
  },
  gold: {
    bgClass: 'bg-gradient-to-b from-yellow-300 to-yellow-700',
    border: 'border-yellow-300/70',
    statBg: 'bg-yellow-900/50',
    text: 'text-yellow-950',
    subtext: 'text-yellow-800',
    divider: 'border-yellow-400/40',
    glowClass: 'glow-gold',
    avatarGradient: 'from-yellow-400 to-yellow-700',
  },
  divine: {
    bgClass: 'rainbow-card',
    border: 'border-white/50',
    statBg: 'bg-black/25',
    text: 'text-white',
    subtext: 'text-white/80',
    divider: 'border-white/30',
    glowClass: 'glow-divine',
    avatarGradient: 'from-purple-600 to-pink-600',
    isDivine: true,
  },
};

const TIER_LABELS: Record<Tier, string> = {
  iron: 'IRN',
  bronze: 'BRZ',
  silver: 'SLV',
  emerald: 'EMR',
  sapphire: 'SAP',
  amethyst: 'AME',
  gold: 'GLD',
  divine: 'GOD',
};

function getHeadshotUrls(player: Player, sport: string): string[] {
  if (sport === 'ipl') return player.photo ? [player.photo] : [];
  if (player.photoCode) {
    return [
      `https://resources.premierleague.com/premierleague/photos/players/110x140/p${player.photoCode}.jpg`,
      `https://resources.premierleague.com/premierleague/photos/players/110x140/p${player.photoCode}.png`,
      `https://resources.premierleague.com/premierleague/photos/players/250x250/p${player.photoCode}.png`,
    ];
  }
  if (player.position === 'DEF' && player.team && sport !== 'fpl') {
    return [`https://a.espncdn.com/i/teamlogos/nfl/500/${player.team.toLowerCase()}.png`];
  }
  const urls: string[] = [];
  if (player.espnId) {
    urls.push(`https://a.espncdn.com/i/headshots/${sport}/players/full/${player.espnId}.png`);
  }
  if (player.rotowireId) {
    urls.push(`https://www.rotowire.com/images/photos/${player.rotowireId}.jpg`);
  }
  if (player.id) {
    urls.push(`https://sleepercdn.com/content/${sport}/players/thumb/${player.id}.jpg`);
    urls.push(`https://sleepercdn.com/content/${sport}/players/${player.id}.jpg`);
  }
  if (player.team && player.team !== 'FA' && (sport === 'nfl' || sport === 'mlb')) {
    urls.push(`https://a.espncdn.com/i/teamlogos/${sport}/500/${player.team.toLowerCase()}.png`);
  }
  if (sport === 'nfl' || sport === 'mlb') {
    urls.push(`https://a.espncdn.com/i/teamlogos/leagues/500/${sport}.png`);
  }
  return urls;
}

function buildStats(player: Player, sport: string): Array<{ label: string; value: string }> {
  if (sport === 'ipl') {
    return [
      { label: 'ROLE', value: player.position ?? '—' },
      { label: 'VAL', value: player.rank ? String(Math.round(player.rank)) : '—' },
      { label: 'NAT', value: player.nationality ? player.nationality.slice(0, 3).toUpperCase() : '—' },
    ];
  }
  if (sport === 'mlb') {
    return [
      { label: 'OWN', value: player.percentOwned !== undefined ? `${player.percentOwned.toFixed(0)}%` : '—' },
      { label: 'VAL', value: player.rank ? String(Math.round(player.rank)) : '—' },
      { label: 'INJ', value: player.injuryStatus ?? 'OK' },
    ];
  }
  if (sport === 'fpl') {
    return [
      { label: 'PTS', value: player.total_points?.toString() ?? '—' },
      { label: 'FORM', value: player.form ? String(player.form) : '—' },
      { label: 'EP', value: player.epNext ? Number(player.epNext).toFixed(1) : '—' },
      { label: '£', value: player.now_cost ? `${player.now_cost}m` : '—' },
      { label: 'SEL', value: player.selected_by_percent ? `${parseFloat(player.selected_by_percent).toFixed(0)}%` : '—' },
      { label: 'INJ', value: player.injuryStatus ?? 'OK' },
    ];
  }
  return [
    { label: 'RK', value: player.searchRank ? `#${player.searchRank}` : '—' },
    { label: 'AGE', value: player.age?.toString() ?? '—' },
    { label: 'EXP', value: player.yearsExp !== undefined ? `${player.yearsExp}y` : '—' },
    { label: 'PPG', value: player.avgPoints ? player.avgPoints.toFixed(1) : '—' },
    { label: 'VAL', value: player.rank ? String(Math.round(player.rank)) : '—' },
    { label: 'INJ', value: player.injuryStatus ?? 'OK' },
  ];
}

interface Props {
  player: Player;
  sport: string;
  onRemove?: () => void;
  onClick?: () => void;
}

export function PlayerCard({ player, sport, onRemove, onClick }: Props) {
  const rank = player.rank ?? 25;
  const tier = cardTier(rank);
  const s = TIER_STYLES[tier];
  const headshotUrls = getHeadshotUrls(player, sport);
  const stats = buildStats(player, sport);
  const [urlIndex, setUrlIndex] = useState(0);
  // serverUrl: undefined = not yet fetched, null = fetched + no result, string = URL found
  const [serverUrl, setServerUrl] = useState<string | null | undefined>(undefined);
  const allCdnFailed = urlIndex >= headshotUrls.length;

  useEffect(() => {
    if (!allCdnFailed || serverUrl !== undefined) return;
    const params = new URLSearchParams({ name: player.name, sport });
    if (player.team) params.set('team', player.team);
    if (player.teamCode) params.set('teamCode', String(player.teamCode));
    const apiBase = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');
    fetch(`${apiBase}/players/photo?${params}`)
      .then(r => r.ok ? r.json() : { url: null })
      .then(d => setServerUrl(d.url || null))
      .catch(() => setServerUrl(null));
  }, [allCdnFailed, player.name, player.team, serverUrl, sport]);

  const displayName = (player.web_name ?? player.name.split(' ').slice(-1)[0]).toUpperCase();

  return (
    <motion.div
      whileHover={onClick ? { scale: 1.03, y: -3 } : {}}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`relative rounded-2xl border overflow-hidden shadow-xl w-full ${s.border} ${s.glowClass} ${s.isDivine ? '' : s.bgClass} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {s.isDivine && (
        <>
          <div className="absolute inset-0 rainbow-card rounded-2xl" />
          <div className="shine-overlay rounded-2xl" />
        </>
      )}

      <div className="relative z-10">
        {onRemove && (
          <button
            onClick={onRemove}
            className="absolute top-1.5 right-1.5 z-20 w-5 h-5 rounded-full bg-black/40 hover:bg-red-500/80 text-white flex items-center justify-center transition-colors"
          >
            <X size={10} />
          </button>
        )}

        {/* Top section */}
        <div className="px-3 pt-3 pb-2 flex flex-col items-center">
          {/* Score + tier row */}
          <div className="w-full flex items-start justify-between mb-1">
            <div>
              <div className={`text-3xl font-display font-black leading-none animate-count-up ${s.text}`}>{Math.round(rank)}</div>
              <div className={`text-[10px] font-bold uppercase ${s.subtext}`}>{player.position}</div>
            </div>
            <div className="text-right">
              <div className={`text-[10px] font-bold uppercase ${s.text} opacity-70`}>{TIER_LABELS[tier]}</div>
              <div className={`text-[9px] ${s.subtext}`}>{player.team}</div>
            </div>
          </div>

          {/* Headshot */}
          <div className="w-20 h-20 rounded-lg overflow-hidden flex items-center justify-center mb-2 flex-shrink-0 ring-2 ring-white/20">
            {urlIndex < headshotUrls.length ? (
              <img
                src={headshotUrls[urlIndex]}
                alt={player.name}
                onError={() => setUrlIndex(i => i + 1)}
                className="w-full h-full object-cover object-top"
              />
            ) : serverUrl ? (
              <img
                src={serverUrl}
                alt={player.name}
                onError={() => setServerUrl(null)}
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${s.avatarGradient}`}>
                <span className="text-white/80 text-2xl font-black tracking-widest">{player.position}</span>
              </div>
            )}
          </div>

          {/* Name */}
          <div className={`text-xs font-black tracking-wide text-center truncate w-full ${s.text}`}>
            {displayName}
          </div>
        </div>

        {/* Divider */}
        <div className={`border-t ${s.divider} mx-2`} />

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-px p-2">
          {stats.map(st => (
            <div key={st.label} className={`${s.statBg} rounded px-1 py-1 text-center`}>
              <div className={`text-xs font-bold leading-tight ${s.text}`}>{st.value}</div>
              <div className={`text-[9px] uppercase leading-tight ${s.subtext}`}>{st.label}</div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
