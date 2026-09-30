import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeftRight, X, Share2, Copy, Check, Loader2, Flame, CheckCircle, Scale, AlertTriangle, Siren, History } from 'lucide-react';
import html2canvas from 'html2canvas';
import { PlayerSearch } from '../shared/PlayerSearch.tsx';
import { StreamingAnalysis } from '../shared/StreamingAnalysis.tsx';
import { IridescentBorder } from '../shared/IridescentBorder.tsx';
import { TradeShareCard } from './TradeShareCard.tsx';
import { rateTrade } from '../../lib/api.ts';
import { TradeHistory } from './TradeHistory.tsx';
import { useLeague } from '../../lib/LeagueContext.tsx';
import type { Player, TradeScore } from '../../types/index.ts';

async function fetchAsDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function loadPlayerImage(player: Player, sport: string): Promise<string | null> {
  const urls: string[] = [];
  if (player.espnId) urls.push(`https://a.espncdn.com/i/headshots/${sport}/players/full/${player.espnId}.png`);
  if (player.id) {
    urls.push(`https://sleepercdn.com/content/${sport}/players/thumb/${player.id}.jpg`);
    urls.push(`https://sleepercdn.com/content/${sport}/players/${player.id}.jpg`);
  }
  for (const url of urls) {
    const dataUri = await fetchAsDataUri(url);
    if (dataUri) return dataUri;
  }
  return null;
}

function CompactPlayerRow({ player, onRemove }: { player: Player; onRemove: () => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12, height: 0 }}
      animate={{ opacity: 1, x: 0, height: 'auto' }}
      exit={{ opacity: 0, x: 12, height: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="flex items-center gap-2 border border-white/[0.08] hover:border-white/[0.14] px-2.5 py-2 mb-1 transition-colors overflow-hidden backdrop-blur"
      style={{ background: 'rgba(255,255,255,0.04)' }}
    >
      <div className="w-6 h-6 flex items-center justify-center flex-shrink-0 text-[10px] font-mono font-bold text-soft border border-white/[0.08]" style={{ background: 'rgba(255,255,255,0.06)' }}>
        {player.position}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-display font-black text-warm truncate leading-tight tracking-wide">
          {player.name.split(' ').slice(-1)[0].toUpperCase()}
        </p>
        <p className="text-[10px] font-mono text-fade leading-tight">
          {player.position}{player.team ? ` · ${player.team}` : ''}
        </p>
      </div>
      <motion.button
        onClick={onRemove}
        className="text-ghost hover:text-signal flex-shrink-0 transition-colors"
        whileTap={{ scale: 0.8, rotate: 90 }}
        transition={{ duration: 0.15 }}
      >
        <X size={12} />
      </motion.button>
    </motion.div>
  );
}

function TradeSide({
  label,
  players,
  onAdd,
  onRemove,
  colorClass,
  headerColor,
}: {
  label: string;
  players: Player[];
  sport?: string;
  onAdd: (p: Player) => void;
  onRemove: (i: number) => void;
  colorClass: string;
  headerColor: string;
}) {
  return (
    <div className={`flex-1 card-base border-l-4 flex flex-col min-w-0 ${colorClass}`}>
      <div className="px-3 pt-3 pb-1.5 flex-shrink-0">
        <h3 className={`text-[10px] font-mono font-bold uppercase tracking-widest mb-1.5 ${headerColor}`}>{label}</h3>
        <PlayerSearch onSelect={onAdd} placeholder='Search player or "TEAM"...' />
      </div>
      <div className="px-2.5 pb-2.5 min-h-[60px]">
        <AnimatePresence initial={false}>
          {players.length === 0 ? (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-ghost font-mono text-[10px] text-center pt-3"
            >
              Add players above
            </motion.p>
          ) : (
            <div className="mt-1.5">
              {players.map((p, i) => (
                <AnimatePresence key={`${p.id}-${i}`} mode="popLayout">
                  <CompactPlayerRow player={p} onRemove={() => onRemove(i)} />
                </AnimatePresence>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function FairnessBar({ ratio }: { ratio: number }) {
  const deviation = ratio - 1;
  const pct = Math.min(Math.max(50 - deviation * 50, 5), 95);
  let color = 'bg-emerald';
  if (Math.abs(deviation) > 0.25) color = 'bg-signal';
  else if (Math.abs(deviation) > 0.10) color = 'bg-gold';

  return (
    <div>
      <div className="flex justify-between text-[10px] font-mono text-ghost mb-1.5">
        <span>Give more</span>
        <span>Fair</span>
        <span>Get more</span>
      </div>
      <div className="relative h-2 bg-surface-deep border border-surface-divider overflow-hidden">
        <div className="absolute left-1/2 w-px h-full bg-[#3A3A3A] z-10" />
        <motion.div
          className={`absolute top-0 h-full ${color}`}
          initial={{ left: '50%', width: '0%' }}
          animate={{
            left: pct < 50 ? `${pct}%` : '50%',
            width: `${Math.abs(pct - 50)}%`,
          }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
        />
      </div>
    </div>
  );
}

function CountUpScore({ target, className }: { target: number; className: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const end = Math.round(target);
    const duration = 900;
    const startTime = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * end));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target]);
  return <div className={className}>{display}</div>;
}

const VERDICT_STYLES: Record<string, { bg: string; border: string; text: string; hex: string; Icon: React.ElementType }> = {
  'Great Deal':    { bg: 'bg-signal/10', border: 'border-signal/50', text: 'text-signal',  hex: '#E8321A', Icon: Flame },
  'Good Deal':     { bg: 'bg-emerald/10', border: 'border-emerald/40', text: 'text-emerald',  hex: '#4DC878', Icon: CheckCircle },
  'Toss Up':       { bg: 'bg-gold/10', border: 'border-gold/40', text: 'text-gold',  hex: '#C8882A', Icon: Scale },
  'Bad Deal':      { bg: 'bg-soft/10', border: 'border-soft/30', text: 'text-soft',  hex: '#8A8A8A', Icon: AlertTriangle },
  'Horrible Deal': { bg: 'bg-fade/10', border: 'border-fade/30', text: 'text-fade',  hex: '#555555', Icon: Siren },
};

export function TradeRater() {
  const { config } = useLeague();
  const [tab, setTab] = useState<'rate' | 'history'>('rate');
  const [sideA, setSideA] = useState<Player[]>([]);
  const [sideB, setSideB] = useState<Player[]>([]);
  const [score, setScore] = useState<TradeScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imageUrls, setImageUrls] = useState<{ sideA: (string | null)[]; sideB: (string | null)[] } | null>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);

  async function handleShare() {
    if (!shareCardRef.current || !score) return;
    setSharing(true);
    try {
      const [sideAImgs, sideBImgs] = await Promise.all([
        Promise.all(sideA.map(p => loadPlayerImage(p, config.sport))),
        Promise.all(sideB.map(p => loadPlayerImage(p, config.sport))),
      ]);
      setImageUrls({ sideA: sideAImgs, sideB: sideBImgs });
      await new Promise(r => setTimeout(r, 150));

      const canvas = await html2canvas(shareCardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement('a');
      link.download = `trade-${score.verdict.toLowerCase().replace(' ', '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      handleCopyText();
    } finally {
      setSharing(false);
    }
  }

  function handleCopyText() {
    if (!score) return;
    const give = sideA.map(p => p.name).join(', ');
    const receive = sideB.map(p => p.name).join(', ');
    const text = `${score.verdict.toUpperCase()} on FantasyRater!\nI receive: ${receive}\nI give: ${give}\nRate your trades free at fantasyrater.app`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleRate() {
    if (!sideA.length || !sideB.length) { setError('Add at least one player to each side.'); return; }
    setError('');
    setLoading(true);
    setScore(null);
    setImageUrls(null);
    try {
      const result = await rateTrade({
        sideA, sideB,
        sport: config.sport,
        scoringFormat: config.scoringFormat,
        week: config.currentWeek,
        leagueSize: config.leagueSize,
        weeksRemaining: config.weeksRemaining,
      });
      setScore(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const vs = score ? (VERDICT_STYLES[score.verdict] ?? VERDICT_STYLES['Toss Up']) : null;

  return (
    <div className="flex flex-col md:flex-row min-h-full">
      {/* Left: Trade Builder */}
      <div className="w-full md:w-1/2 flex flex-col p-4 md:p-5 border-b md:border-b-0 md:border-r border-surface-divider gap-4 min-w-0">
        <div className="hidden md:block flex-shrink-0">
          <h1 className="text-2xl font-display font-black text-warm tracking-wider">
            Trade Rater
          </h1>
          <p className="text-fade text-xs font-mono mt-0.5">AI-powered analysis with live player data</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-surface-divider flex-shrink-0 -mt-2">
          {([['rate', 'Rate Trade'], ['history', 'History']] as const).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-widest border-b-2 transition-colors ${
                tab === t
                  ? 'border-signal text-warm'
                  : 'border-transparent text-fade hover:text-soft'
              }`}
            >
              {t === 'history' && <History size={10} />}
              {label}
            </button>
          ))}
        </div>

        {tab === 'history' && (
          <div className="flex-1 overflow-y-auto">
            <TradeHistory />
          </div>
        )}

        {tab === 'rate' && (
          <>
            <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
              <TradeSide
                label="You Give"
                players={sideA}
                sport={config.sport}
                onAdd={p => setSideA(prev => [...prev, p])}
                onRemove={i => setSideA(prev => prev.filter((_, idx) => idx !== i))}
                colorClass="border-l-signal"
                headerColor="text-signal"
              />
              <div className="flex items-center justify-center flex-shrink-0">
                <div className="w-7 h-7 bg-surface-deep border border-surface-divider flex items-center justify-center text-fade">
                  <ArrowLeftRight size={14} />
                </div>
              </div>
              <TradeSide
                label="You Receive"
                players={sideB}
                sport={config.sport}
                onAdd={p => setSideB(prev => [...prev, p])}
                onRemove={i => setSideB(prev => prev.filter((_, idx) => idx !== i))}
                colorClass="border-l-emerald"
                headerColor="text-emerald"
              />
            </div>

            {error && <p className="text-rose-400 text-sm flex-shrink-0">{error}</p>}

            <button
              onClick={handleRate}
              disabled={loading}
              className="w-full py-3.5 btn-signal font-display font-black tracking-widest uppercase text-sm flex-shrink-0 flex items-center justify-center gap-2 rounded"
            >
              {loading ? <><Loader2 size={14} className="animate-spin" /> Analyzing...</> : 'Rate This Trade'}
            </button>
          </>
        )}
      </div>

      {/* Right: Analysis Panel */}
      <div className="w-full md:w-1/2 flex flex-col p-4 md:p-5 gap-4 min-w-0">
        <div className="hidden md:block flex-shrink-0">
          <h2 className="text-2xl font-display font-black text-warm tracking-wider">
            Analysis
          </h2>
          <p className="text-fade text-xs font-mono mt-0.5">Results appear here after rating</p>
        </div>

        {!score && !loading && (
          <div className="flex-1 flex items-center justify-center min-h-[200px]">
            <div className="text-center">
              <ArrowLeftRight size={32} className="mx-auto mb-3 text-surface-divider" />
              <p className="text-xs font-mono text-ghost">Add players to both sides<br />and tap Rate This Trade</p>
            </div>
          </div>
        )}

        {score && vs && (
          <>
            {score.verdict === 'Great Deal' ? (
              <IridescentBorder block innerStyle={{ background: 'rgba(14, 8, 10, 0.92)', borderRadius: '3px' }} className="flex-shrink-0">
                <div className="p-5 space-y-4">
                  <div className="flex justify-between items-end">
                    <div className="text-center">
                      <CountUpScore target={score.sideAScore} className="text-4xl font-display font-black text-signal tracking-tight" />
                      <div className="text-xs font-mono text-fade mt-1">You Give</div>
                    </div>
                    <div className="flex-1 px-6">
                      <FairnessBar ratio={score.ratio} />
                    </div>
                    <div className="text-center">
                      <CountUpScore target={score.sideBScore} className="text-4xl font-display font-black text-emerald tracking-tight" />
                      <div className="text-xs font-mono text-fade mt-1">You Receive</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.82 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 520, damping: 22, delay: 0.5 }}
                      className={`relative flex-1 flex items-center justify-center gap-2 px-4 py-3 border overflow-hidden ${vs.bg} ${vs.border}`}
                    >
                      {/* shimmer sweep */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12"
                        initial={{ x: '-120%' }}
                        animate={{ x: '220%' }}
                        transition={{ duration: 0.55, delay: 0.75, ease: 'easeOut' }}
                      />
                      <vs.Icon size={16} className={vs.text} />
                      <span className={`text-sm font-display font-black tracking-widest uppercase ${vs.text}`}>{score.verdict}</span>
                    </motion.div>
                    <button
                      onClick={handleShare}
                      disabled={sharing}
                      title="Download share card"
                      className="px-3 py-2.5 border border-surface-divider bg-surface-deep hover:bg-[#222222] text-soft hover:text-warm transition-all disabled:opacity-50"
                    >
                      {sharing ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
                    </button>
                    <button
                      onClick={handleCopyText}
                      title="Copy share text"
                      className="px-3 py-2.5 border border-surface-divider bg-surface-deep hover:bg-[#222222] text-soft hover:text-warm transition-all"
                    >
                      {copied ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </IridescentBorder>
            ) : (
              <div className="card-base p-5 space-y-4 flex-shrink-0 border-l-4" style={{ borderLeftColor: vs.hex }}>
                <div className="flex justify-between items-end">
                  <div className="text-center">
                    <CountUpScore target={score.sideAScore} className="text-4xl font-display font-black text-signal tracking-tight" />
                    <div className="text-xs font-mono text-fade mt-1">You Give</div>
                  </div>
                  <div className="flex-1 px-6">
                    <FairnessBar ratio={score.ratio} />
                  </div>
                  <div className="text-center">
                    <CountUpScore target={score.sideBScore} className="text-4xl font-display font-black text-emerald tracking-tight" />
                    <div className="text-xs font-mono text-fade mt-1">You Receive</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.82 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 520, damping: 22, delay: 0.5 }}
                    className={`relative flex-1 flex items-center justify-center gap-2 px-4 py-3 border overflow-hidden ${vs.bg} ${vs.border}`}
                  >
                    {/* shimmer sweep */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12"
                      initial={{ x: '-120%' }}
                      animate={{ x: '220%' }}
                      transition={{ duration: 0.55, delay: 0.75, ease: 'easeOut' }}
                    />
                    <vs.Icon size={16} className={vs.text} />
                    <span className={`text-sm font-display font-black tracking-widest uppercase ${vs.text}`}>{score.verdict}</span>
                  </motion.div>
                  <button
                    onClick={handleShare}
                    disabled={sharing}
                    title="Download share card"
                    className="px-3 py-2.5 border border-surface-divider bg-surface-deep hover:bg-[#222222] text-soft hover:text-warm transition-all disabled:opacity-50"
                  >
                    {sharing ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
                  </button>
                  <button
                    onClick={handleCopyText}
                    title="Copy share text"
                    className="px-3 py-2.5 border border-surface-divider bg-surface-deep hover:bg-[#222222] text-soft hover:text-warm transition-all"
                  >
                    {copied ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            )}

            <div className="card-base p-5 border-l-4 border-l-signal min-w-0 flex-shrink-0">
              <h3 className="text-[10px] font-mono font-bold text-signal uppercase tracking-widest mb-3">AI Analysis</h3>
              <StreamingAnalysis hash={score.analysisHash} />
            </div>
          </>
        )}
      </div>

      {/* Hidden share card — captured by html2canvas */}
      {score && (
        <div style={{ position: 'fixed', left: -9999, top: -9999, pointerEvents: 'none' }}>
          <TradeShareCard
            ref={shareCardRef}
            score={score}
            sideA={sideA}
            sideB={sideB}
            sport={config.sport}
            scoringFormat={config.scoringFormat}
            imageUrls={imageUrls ?? undefined}
          />
        </div>
      )}
    </div>
  );
}
