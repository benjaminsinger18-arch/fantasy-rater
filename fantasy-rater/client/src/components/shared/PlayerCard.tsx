import { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useInView } from 'framer-motion';
import { X } from 'lucide-react';
import type { Player } from '../../types/index.ts';
import { TierInfoModal } from './TierInfoModal.tsx';

type Tier = 'f' | 'e' | 'd' | 'c' | 'b' | 'a' | 's';

function cardTier(rank: number): Tier {
  if (rank >= 90) return 's';
  if (rank >= 75) return 'a';
  if (rank >= 55) return 'b';
  if (rank >= 35) return 'c';
  if (rank >= 20) return 'd';
  if (rank >= 8)  return 'e';
  return 'f';
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
  e: {
    bgClass: 'bg-[#2C2C31]',
    border: 'border-[#484850]',
    accentClass: 'tier-bronze',
    statBg: 'bg-[#363640]',
    text: 'text-[#F2EFE8]',
    subtext: 'text-[#7A6048]',
    scoreColor: 'text-[#C4A882]',
    divider: 'border-[#484850]',
    glowClass: '',
    avatarGradient: 'from-[#5C3D2A] to-[#1A1010]',
  },
  f: {
    bgClass: 'bg-[#2C2C31]',
    border: 'border-[#484850]',
    accentClass: 'tier-iron',
    statBg: 'bg-[#363640]',
    text: 'text-[#F2EFE8]',
    subtext: 'text-[#555555]',
    scoreColor: 'text-[#666666]',
    divider: 'border-[#484850]',
    glowClass: '',
    avatarGradient: 'from-[#333333] to-[#1A1A1A]',
  },
  d: {
    bgClass: 'bg-[#2C2C31]',
    border: 'border-[#484850]',
    accentClass: 'tier-silver',
    statBg: 'bg-[#363640]',
    text: 'text-[#F2EFE8]',
    subtext: 'text-[#7A8090]',
    scoreColor: 'text-[#9BA4B5]',
    divider: 'border-[#484850]',
    glowClass: '',
    avatarGradient: 'from-[#3A4050] to-[#1A1A20]',
  },
  c: {
    bgClass: 'bg-[#2C2C31]',
    border: 'border-[#484850]',
    accentClass: 'tier-emerald',
    statBg: 'bg-[#363640]',
    text: 'text-[#F2EFE8]',
    subtext: 'text-[#2A7040]',
    scoreColor: 'text-[#4DC878]',
    divider: 'border-[#484850]',
    glowClass: '',
    avatarGradient: 'from-[#1A5E30] to-[#0A1E10]',
  },
  b: {
    bgClass: 'bg-[#2C2C31]',
    border: 'border-[#484850]',
    accentClass: 'tier-sapphire',
    statBg: 'bg-[#363640]',
    text: 'text-[#F2EFE8]',
    subtext: 'text-[#2A5080]',
    scoreColor: 'text-[#5090D8]',
    divider: 'border-[#484850]',
    glowClass: '',
    avatarGradient: 'from-[#1A3A68] to-[#0A1020]',
  },
  a: {
    bgClass: 'bg-[#2C2C31]',
    border: 'border-[#484850]',
    accentClass: 'tier-gold',
    statBg: 'bg-[#363640]',
    text: 'text-[#F2EFE8]',
    subtext: 'text-[#8A6020]',
    scoreColor: 'text-[#C8882A]',
    divider: 'border-[#484850]',
    glowClass: '',
    avatarGradient: 'from-[#6A4A10] to-[#1E1408]',
  },
  s: {
    bgClass: 'bg-[#2C2C31]',
    border: 'border-[#E8321A]/40',
    accentClass: 'tier-divine',
    statBg: 'bg-[#363640]',
    text: 'text-[#F2EFE8]',
    subtext: 'text-[#E8321A]/70',
    scoreColor: 'text-[#E8321A]',
    divider: 'border-[#E8321A]/20',
    glowClass: '',
    avatarGradient: 'from-[#6A1A10] to-[#180808]',
  },
};

const TIER_LABELS: Record<Tier, string> = {
  f: 'F',
  e: 'E',
  d: 'D',
  c: 'C',
  b: 'B',
  a: 'A',
  s: 'S',
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

const DIGIT_HEIGHT = 36; // px — matches text-4xl line-height

function SlotDigit({ target, delay }: { target: number; delay: number }) {
  return (
    <div style={{ height: DIGIT_HEIGHT, overflow: 'hidden', display: 'inline-flex', alignItems: 'flex-start' }}>
      <motion.div
        style={{ display: 'flex', flexDirection: 'column' }}
        initial={{ y: 0 }}
        animate={{ y: -target * DIGIT_HEIGHT }}
        transition={{ delay, duration: 0.55, type: 'spring', stiffness: 180, damping: 18 }}
      >
        {Array.from({ length: 10 }, (_, n) => (
          <span
            key={n}
            style={{ height: DIGIT_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            className="text-4xl font-display font-black tracking-tight"
          >
            {n}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

function SlotMachineScore({ value, colorClass, glow }: { value: number; colorClass: string; glow?: boolean }) {
  const digits = String(Math.round(value)).split('').map(Number);
  return (
    <div className={`flex leading-none ${colorClass} ${glow ? 'animate-score-glow' : ''}`}>
      {digits.map((d, i) => (
        <SlotDigit key={i} target={d} delay={i * 0.08} />
      ))}
    </div>
  );
}

export function PlayerCard({ player, sport, onRemove, onClick }: Props) {
  const rank = player.rank ?? 25;
  const tier = cardTier(rank);
  const s = TIER_STYLES[tier];
  const headshotUrls = getHeadshotUrls(player, sport);
  const stats = buildStats(player, sport);
  const [urlIndex, setUrlIndex] = useState(0);
  const [serverUrl, setServerUrl] = useState<string | null | undefined>(undefined);
  const [infoOpen, setInfoOpen] = useState(false);
  const allCdnFailed = urlIndex >= headshotUrls.length;

  // 3D tilt on hover
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springConfig = { damping: 20, stiffness: 140 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], ['7deg', '-7deg']), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], ['-7deg', '7deg']), springConfig);

  function handleTiltMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!onClick || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  }
  function handleTiltLeave() { mouseX.set(0); mouseY.set(0); }

  useEffect(() => {
    if (!allCdnFailed || serverUrl !== undefined) return;
    const params = new URLSearchParams({ name: player.name, sport });
    if (player.team) params.set('team', player.team);
    if (player.teamCode) params.set('teamCode', String(player.teamCode));
    if (player.position) params.set('position', player.position);
    const apiBase = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');
    fetch(`${apiBase}/players/photo?${params}`)
      .then(r => r.ok ? r.json() : { url: null })
      .then(d => setServerUrl(d.url || null))
      .catch(() => setServerUrl(null));
  }, [allCdnFailed, player.name, player.team, player.position, serverUrl, sport]);

  const displayName = (player.web_name ?? player.name.split(' ').slice(-1)[0]).toUpperCase();

  return (
    <motion.div
      ref={cardRef}
      whileHover={onClick ? { scale: 1.02, y: -3 } : {}}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      style={onClick ? { rotateX, rotateY, transformStyle: 'preserve-3d', perspective: '800px' } : {}}
      onMouseMove={handleTiltMove}
      onMouseLeave={handleTiltLeave}
      className={`relative border border-l-4 overflow-hidden w-full ${s.bgClass} ${s.border} ${s.accentClass} ${onClick ? 'cursor-pointer' : ''} ${tier === 's' ? 'animate-border-pulse' : ''}`}
      onClick={onClick}
    >
      <TierInfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />

      {/* Orbital glow for S/A tier */}
      {(tier === 's' || tier === 'a') && (
        <motion.div
          className="absolute inset-0 z-0 pointer-events-none overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <motion.div
            className={`absolute w-24 h-24 rounded-full blur-3xl ${tier === 's' ? 'bg-[#E8321A]/18' : 'bg-[#C8882A]/14'}`}
            animate={{
              top: ['8%', '8%', '60%', '60%', '8%'],
              left: ['8%', '65%', '65%', '8%', '8%'],
            }}
            transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
          />
        </motion.div>
      )}

      {/* Scan line sweep on entrance */}
      <motion.div
        className="absolute inset-0 z-20 pointer-events-none overflow-hidden"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ delay: 0.65, duration: 0.1 }}
      >
        <motion.div
          className="absolute inset-x-0 h-full"
          style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.04) 46%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.04) 54%, transparent 100%)' }}
          initial={{ y: '-100%' }}
          animate={{ y: '100%' }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        />
      </motion.div>

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
              <SlotMachineScore value={rank} colorClass={s.scoreColor} glow={tier === 's'} />
              <div className={`text-[10px] font-mono uppercase tracking-wider ${s.subtext}`}>{player.position}</div>
            </div>
            <div className="text-right flex flex-col items-end gap-0.5">
              <div className="flex items-center gap-1">
                <button
                  onClick={e => { e.stopPropagation(); e.preventDefault(); setInfoOpen(true); }}
                  onMouseDown={e => e.stopPropagation()}
                  className={`text-[9px] font-mono opacity-30 hover:opacity-80 transition-opacity leading-none ${s.scoreColor}`}
                >
                  [i]
                </button>
                <div className={`text-[10px] font-mono font-bold uppercase tracking-widest ${s.scoreColor}`}>{TIER_LABELS[tier]}</div>
              </div>
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
          {stats.map((st, i) => (
            <motion.div
              key={st.label}
              initial={{ opacity: 0, y: 6, scale: 0.88 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.15 + i * 0.05, type: 'spring', stiffness: 500, damping: 24 }}
              className={`${s.statBg} px-1 py-1 text-center`}
            >
              <div className={`text-xs font-mono font-bold leading-tight ${s.text}`}>{st.value}</div>
              <div className={`text-[9px] font-mono uppercase leading-tight tracking-wider ${s.subtext}`}>{st.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
