import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeftRight, X, Share2, Copy, Check, Loader2, Flame, CheckCircle, Scale, AlertTriangle, Siren } from 'lucide-react';
import html2canvas from 'html2canvas';
import { PlayerSearch } from '../shared/PlayerSearch.tsx';
import { StreamingAnalysis } from '../shared/StreamingAnalysis.tsx';
import { TradeShareCard } from './TradeShareCard.tsx';
import { rateTrade } from '../../lib/api.ts';
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
    <div className="flex items-center gap-2 bg-slate-900/60 rounded-xl border border-white/5 hover:border-indigo-500/20 px-2.5 py-2 mb-1.5 transition-colors">
      <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0 text-[10px] font-black text-indigo-300">
        {player.position}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-white truncate leading-tight">
          {player.name.split(' ').slice(-1)[0].toUpperCase()}
        </p>
        <p className="text-[10px] text-slate-400 leading-tight">
          {player.position}{player.team ? ` · ${player.team}` : ''}
        </p>
      </div>
      <button onClick={onRemove} className="text-slate-600 hover:text-rose-400 flex-shrink-0 transition-colors">
        <X size={12} />
      </button>
    </div>
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
        <h3 className={`text-xs font-display font-bold uppercase tracking-wider mb-1.5 ${headerColor}`}>{label}</h3>
        <PlayerSearch onSelect={onAdd} placeholder='Search player or "TEAM"...' />
      </div>
      <div className="px-2.5 pb-2.5 min-h-[60px]">
        {players.length === 0 ? (
          <p className="text-slate-600 text-[10px] text-center pt-3">Add players above</p>
        ) : (
          <div className="mt-1.5">
            {players.map((p, i) => (
              <CompactPlayerRow key={`${p.id}-${i}`} player={p} onRemove={() => onRemove(i)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FairnessBar({ ratio }: { ratio: number }) {
  const deviation = ratio - 1;
  const pct = Math.min(Math.max(50 - deviation * 50, 5), 95);
  let color = 'bg-emerald-500';
  if (Math.abs(deviation) > 0.25) color = 'bg-rose-500';
  else if (Math.abs(deviation) > 0.10) color = 'bg-amber-400';

  return (
    <div>
      <div className="flex justify-between text-xs text-slate-500 mb-1.5">
        <span>You give more</span>
        <span>Fair</span>
        <span>You get more</span>
      </div>
      <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden">
        <div className="absolute left-1/2 w-px h-full bg-slate-500 z-10" />
        <div
          className={`absolute top-0 h-full rounded-full transition-all duration-500 ${color}`}
          style={{
            left: pct < 50 ? `${pct}%` : '50%',
            width: `${Math.abs(pct - 50)}%`,
          }}
        />
      </div>
    </div>
  );
}

const VERDICT_STYLES: Record<string, { bg: string; border: string; text: string; Icon: React.ElementType }> = {
  'Great Deal':    { bg: 'bg-emerald-500/20', border: 'border-emerald-500/50', text: 'text-emerald-300', Icon: Flame },
  'Good Deal':     { bg: 'bg-teal-500/20',    border: 'border-teal-500/50',    text: 'text-teal-300',    Icon: CheckCircle },
  'Toss Up':       { bg: 'bg-amber-500/20',   border: 'border-amber-500/50',   text: 'text-amber-300',   Icon: Scale },
  'Bad Deal':      { bg: 'bg-orange-500/20',  border: 'border-orange-500/50',  text: 'text-orange-300',  Icon: AlertTriangle },
  'Horrible Deal': { bg: 'bg-rose-500/20',    border: 'border-rose-500/50',    text: 'text-rose-300',    Icon: Siren },
};

export function TradeRater() {
  const { config } = useLeague();
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
      <div className="w-full md:w-1/2 flex flex-col p-4 md:p-5 border-b md:border-b-0 md:border-r border-white/5 gap-4 min-w-0">
        <div className="hidden md:block flex-shrink-0">
          <h1 className="text-xl font-display font-black bg-gradient-to-r from-white via-blue-100 to-indigo-300 bg-clip-text text-transparent">
            Trade Rater
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">AI-powered analysis with live player data</p>
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <TradeSide
            label="You Give"
            players={sideA}
            sport={config.sport}
            onAdd={p => setSideA(prev => [...prev, p])}
            onRemove={i => setSideA(prev => prev.filter((_, idx) => idx !== i))}
            colorClass="border-l-rose-500/70"
            headerColor="text-rose-400"
          />
          <div className="flex items-center flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-slate-900/60 border border-white/10 flex items-center justify-center text-slate-400">
              <ArrowLeftRight size={16} />
            </div>
          </div>
          <TradeSide
            label="You Receive"
            players={sideB}
            sport={config.sport}
            onAdd={p => setSideB(prev => [...prev, p])}
            onRemove={i => setSideB(prev => prev.filter((_, idx) => idx !== i))}
            colorClass="border-l-emerald-500/70"
            headerColor="text-emerald-400"
          />
        </div>

        {error && <p className="text-rose-400 text-sm flex-shrink-0">{error}</p>}

        <button
          onClick={handleRate}
          disabled={loading}
          className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-display font-bold rounded-2xl transition-all shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 flex-shrink-0 text-sm tracking-wide flex items-center justify-center gap-2"
        >
          {loading ? <><Loader2 size={16} className="animate-spin" /> Analyzing...</> : 'Rate This Trade'}
        </button>
      </div>

      {/* Right: Analysis Panel */}
      <div className="w-full md:w-1/2 flex flex-col p-4 md:p-5 gap-4 min-w-0">
        <div className="hidden md:block flex-shrink-0">
          <h2 className="text-xl font-display font-black bg-gradient-to-r from-white via-blue-100 to-indigo-300 bg-clip-text text-transparent">
            Analysis
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">Results appear here after rating</p>
        </div>

        {!score && !loading && (
          <div className="flex-1 flex items-center justify-center min-h-[200px]">
            <div className="text-center text-slate-600">
              <ArrowLeftRight size={40} className="mx-auto mb-3 text-slate-700" />
              <p className="text-sm text-slate-600">Add players to both sides<br />and tap Rate This Trade</p>
            </div>
          </div>
        )}

        {score && vs && (
          <>
            <div className={`card-base p-5 space-y-4 flex-shrink-0 border-l-4 ${vs.border.replace('border-', 'border-l-')}`}>
              <div className="flex justify-between items-end">
                <div className="text-center">
                  <div className="text-3xl font-display font-black text-rose-400 animate-count-up">{score.sideAScore}</div>
                  <div className="text-xs text-slate-500 mt-1">You Give</div>
                </div>
                <div className="flex-1 px-6">
                  <FairnessBar ratio={score.ratio} />
                </div>
                <div className="text-center">
                  <div className="text-3xl font-display font-black text-emerald-400 animate-count-up">{score.sideBScore}</div>
                  <div className="text-xs text-slate-500 mt-1">You Receive</div>
                </div>
              </div>
              <div className="flex gap-2">
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 18, delay: 0.1 }}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-2xl px-4 py-3 border ${vs.bg} ${vs.border}`}
                >
                  <vs.Icon size={18} className={vs.text} />
                  <span className={`text-base font-display font-black tracking-wide ${vs.text}`}>{score.verdict}</span>
                </motion.div>
                <button
                  onClick={handleShare}
                  disabled={sharing}
                  title="Download share card"
                  className="px-3 py-2.5 rounded-xl border border-white/10 bg-slate-900/60 hover:bg-white/5 text-slate-300 hover:text-white transition-all disabled:opacity-50"
                >
                  {sharing ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
                </button>
                <button
                  onClick={handleCopyText}
                  title="Copy share text"
                  className="px-3 py-2.5 rounded-xl border border-white/10 bg-slate-900/60 hover:bg-white/5 text-slate-300 hover:text-white transition-all"
                >
                  {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            <div className="card-base p-5 border-l-4 border-l-indigo-500/60 min-w-0 flex-shrink-0">
              <h3 className="text-xs font-display font-bold text-indigo-400 uppercase tracking-widest mb-3">AI Analysis</h3>
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
