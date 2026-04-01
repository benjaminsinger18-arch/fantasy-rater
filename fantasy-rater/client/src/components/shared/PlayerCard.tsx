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
  accentClass: string;
  statBg: string;
  text: string;
  subtext: string;
  scoreColor: string;
  divider: string;
  glowClass: string;
  avatarGradient: string;
}

const TIER_STYLES: Record<Tier, TierStyle> = {
  iron: {
    bgClass: 'bg-[#111111]',
    border: 'border-[#2A2A2A]',
    accentClass: 'tier-iron',
    statBg: 'bg-[#1A1A1A]',
    text: 'text-[#F2EFE8]',
    subtext: 'text-[#555555]',
    scoreColor: 'text-[#8A8A8A]',
    divider: 'border-[#2A2A2A]',
    glowClass: '',
    avatarGradient: 'from-[#333333] to-[#1A1A1A]',
  },
  bronze: {
    bgClass: 'bg-[#111111]',
    border: 'border-[#2A2A2A]',
    accentClass: 'tier-bronze',
    statBg: 'bg-[#1A1A1A]',
    text: 'text-[#F2EFE8]',
    subtext: 'text-[#7A6048]',
    scoreColor: 'text-[#C4A882]',
    divider: 'border-[#2A2A2A]',
    glowClass: '',
    avatarGradient: 'from-[#5C3D2A] to-[#1A1010]',
  },
  silver: {
    bgClass: 'bg-[#111111]',
    border: 'border-[#2A2A2A]',
    accentClass: 'tier-silver',
    statBg: 'bg-[#1A1A1A]',
    text: 'text-[#F2EFE8]',
    subtext: 'text-[#7A8090]',
    scoreColor: 'text-[#C8D0E0]',
    divider: 'border-[#2A2A2A]',
    glowClass: '',
    avatarGradient: 'from-[#5A6070] to-[#2A2A30]',
  },
  emerald: {
    bgClass: 'bg-[#111111]',
    border: 'border-[#2A2A2A]',
    accentClass: 'tier-emerald',
    statBg: 'bg-[#1A1A1A]',
    text: 'text-[#F2EFE8]',
    subtext: 'text-[#2A7040]',
    scoreColor: 'text-[#4DC878]',
    divider: 'border-[#2A2A2A]',
    glowClass: '',
    avatarGradient: 'from-[#1A5E30] to-[#0A1E10]',
  },
  sapphire: {
    bgClass: 'bg-[#111111]',
    border: 'border-[#2A2A2A]',
    accentClass: 'tier-sapphire',
    statBg: 'bg-[#1A1A1A]',
    text: 'text-[#F2EFE8]',
    subtext: 'text-[#2A5080]',
    scoreColor: 'text-[#5090D8]',
    divider: 'border-[#2A2A2A]',
    glowClass: '',
    avatarGradient: 'from-[#1A3A68] to-[#0A1020]',
  },
  amethyst: {
    bgClass: 'bg-[#111111]',
    border: 'border-[#2A2A2A]',
    accentClass: 'tier-amethyst',
    statBg: 'bg-[#1A1A1A]',
    text: 'text-[#F2EFE8]',
    subtext: 'text-[#6A4A88]',
    scoreColor: 'text-[#A88FD8]',
    divider: 'border-[#2A2A2A]',
    glowClass: '',
    avatarGradient: 'from-[#4A2E68] to-[#181020]',
  },
  gold: {
    bgClass: 'bg-[#111111]',
    border: 'border-[#2A2A2A]',
    accentClass: 'tier-gold',
    statBg: 'bg-[#1A1A1A]',
    text: 'text-[#F2EFE8]',
    subtext: 'text-[#8A6020]',
    scoreColor: 'text-[#C8882A]',
    divider: 'border-[#2A2A2A]',
    glowClass: '',
    avatarGradient: 'from-[#6A4A10] to-[#1E1408]',
  },
  divine: {
    bgClass: 'bg-[#111111]',
    border: 'border-[#E8321A]/40',
    accentClass: 'tier-divine',
    statBg: 'bg-[#1A1A1A]',
    text: 'text-[#F2EFE8]',
    subtext: 'text-[#E8321A]/70',
    scoreColor: 'text-[#E8321A]',
    divider: 'border-[#E8321A]/20',
    glowClass: '',
    avatarGradient: 'from-[#6A1A10] to-[#180808]',
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
      whileHover={onClick ? { scale: 1.01, y: -2 } : {}}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={`relative border border-l-4 overflow-hidden w-full ${s.bgClass} ${s.border} ${s.accentClass} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="relative z-10">
        {onRemove && (
          <button
            onClick={onRemove}
            className="absolute top-1.5 right-1.5 z-20 w-5 h-5 bg-[#1A1A1A] hover:bg-[#E8321A]/20 text-[#555555] hover:text-[#E8321A] flex items-center justify-center transition-colors"
          >
            <X size={10} />
          </button>
        )}

        {/* Top section */}
        <div className="px-3 pt-3 pb-2 flex flex-col items-center">
          {/* Score + tier row */}
          <div className="w-full flex items-start justify-between mb-1">
            <div>
              <div className={`text-4xl font-display font-black leading-none animate-count-up tracking-tight ${s.scoreColor}`}>{Math.round(rank)}</div>
              <div className={`text-[10px] font-mono uppercase tracking-wider ${s.subtext}`}>{player.position}</div>
            </div>
            <div className="text-right">
              <div className={`text-[10px] font-mono font-bold uppercase tracking-widest ${s.scoreColor}`}>{TIER_LABELS[tier]}</div>
              <div className={`text-[9px] font-mono ${s.subtext}`}>{player.team}</div>
            </div>
          </div>

          {/* Headshot */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 overflow-hidden flex items-center justify-center mb-2 flex-shrink-0 border border-[#2A2A2A]">
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
                <span className={`text-xl font-display font-black tracking-widest ${s.scoreColor}`}>{player.position}</span>
              </div>
            )}
          </div>

          {/* Name */}
          <div className={`text-xs font-display font-black tracking-widest text-center truncate w-full ${s.text}`}>
            {displayName}
          </div>
        </div>

        {/* Divider */}
        <div className={`border-t ${s.divider} mx-2`} />

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-px p-2">
          {stats.map(st => (
            <div key={st.label} className={`${s.statBg} px-1 py-1 text-center`}>
              <div className={`text-xs font-mono font-bold leading-tight ${s.text}`}>{st.value}</div>
              <div className={`text-[9px] font-mono uppercase leading-tight tracking-wider ${s.subtext}`}>{st.label}</div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
