import { useState } from 'react';
import { PlayerSearch } from '../shared/PlayerSearch.tsx';
import { PlayerCard } from '../shared/PlayerCard.tsx';
import { StreamingAnalysis } from '../shared/StreamingAnalysis.tsx';
import { rateTrade } from '../../lib/api.ts';
import { useLeague } from '../../lib/LeagueContext.tsx';
import type { Player, TradeScore } from '../../types/index.ts';

function TradeSide({
  label,
  players,
  sport,
  onAdd,
  onRemove,
  colorClass,
  headerColor,
}: {
  label: string;
  players: Player[];
  sport: string;
  onAdd: (p: Player) => void;
  onRemove: (i: number) => void;
  colorClass: string;
  headerColor: string;
}) {
  return (
    <div className={`flex-1 rounded-xl border flex flex-col min-w-0 ${colorClass}`}>
      <div className="px-4 pt-4 pb-2 flex-shrink-0">
        <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${headerColor}`}>{label}</h3>
        <PlayerSearch onSelect={onAdd} placeholder='Search player or "TEAM"...' />
      </div>
      <div className="px-3 pb-3 min-h-[220px]">
        {players.length === 0 ? (
          <p className="text-slate-600 text-xs text-center pt-6">Add players above</p>
        ) : (
          <div className={players.length === 1 ? '' : 'grid grid-cols-2 gap-2'}>
            {players.map((p, i) => (
              <PlayerCard
                key={`${p.id}-${i}`}
                player={p}
                sport={sport}
                onRemove={() => onRemove(i)}
              />
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
      <div className="relative h-3 bg-slate-700 rounded-full overflow-hidden">
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

export function TradeRater() {
  const { config } = useLeague();
  const [sideA, setSideA] = useState<Player[]>([]);
  const [sideB, setSideB] = useState<Player[]>([]);
  const [score, setScore] = useState<TradeScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRate() {
    if (!sideA.length || !sideB.length) { setError('Add at least one player to each side.'); return; }
    setError('');
    setLoading(true);
    setScore(null);
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

  const VERDICT_STYLES: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    'Great Deal':    { bg: 'bg-emerald-500/20', border: 'border-emerald-500/50', text: 'text-emerald-300', icon: '🔥' },
    'Good Deal':     { bg: 'bg-teal-500/20',    border: 'border-teal-500/50',    text: 'text-teal-300',    icon: '✅' },
    'Toss Up':       { bg: 'bg-amber-500/20',   border: 'border-amber-500/50',   text: 'text-amber-300',   icon: '⚖️' },
    'Bad Deal':      { bg: 'bg-orange-500/20',  border: 'border-orange-500/50',  text: 'text-orange-300',  icon: '⚠️' },
    'Horrible Deal': { bg: 'bg-rose-500/20',    border: 'border-rose-500/50',    text: 'text-rose-300',    icon: '🚨' },
  };
  const vs = score ? (VERDICT_STYLES[score.verdict] ?? VERDICT_STYLES['Toss Up']) : null;

  return (
    <div className="flex min-h-full" style={{ background: 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)' }}>
      {/* Left: Trade Builder */}
      <div className="w-1/2 flex flex-col p-5 border-r border-slate-700/50 gap-4 min-w-0">
        <div className="flex-shrink-0">
          <h1 className="text-xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Trade Rater
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">AI-powered analysis with live player data</p>
        </div>

        <div className="flex gap-3 flex-shrink-0" style={{ minHeight: '320px' }}>
          <TradeSide
            label="You Give"
            players={sideA}
            sport={config.sport}
            onAdd={p => setSideA(prev => [...prev, p])}
            onRemove={i => setSideA(prev => prev.filter((_, idx) => idx !== i))}
            colorClass="bg-gradient-to-b from-slate-900 to-rose-950/20 border-rose-500/30"
            headerColor="text-rose-400"
          />
          <div className="flex items-center flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 flex items-center justify-center text-slate-400 font-bold text-sm">
              ⇄
            </div>
          </div>
          <TradeSide
            label="You Receive"
            players={sideB}
            sport={config.sport}
            onAdd={p => setSideB(prev => [...prev, p])}
            onRemove={i => setSideB(prev => prev.filter((_, idx) => idx !== i))}
            colorClass="bg-gradient-to-b from-slate-900 to-emerald-950/20 border-emerald-500/30"
            headerColor="text-emerald-400"
          />
        </div>

        {error && <p className="text-rose-400 text-sm flex-shrink-0">{error}</p>}

        <button
          onClick={handleRate}
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-violet-500/25 flex-shrink-0"
        >
          {loading ? 'Analyzing...' : 'Rate This Trade'}
        </button>
      </div>

      {/* Right: Analysis Panel */}
      <div className="w-1/2 flex flex-col p-5 gap-4 min-w-0">
        <div className="flex-shrink-0">
          <h2 className="text-xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Analysis
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">Results appear here after rating</p>
        </div>

        {!score && !loading && (
          <div className="flex-1 flex items-center justify-center min-h-[200px]">
            <div className="text-center text-slate-600">
              <div className="text-4xl mb-3">⇄</div>
              <p className="text-sm">Add players to both sides<br />and click Rate This Trade</p>
            </div>
          </div>
        )}

        {score && (
          <>
            <div className={`bg-slate-900/80 rounded-xl p-5 border space-y-4 flex-shrink-0 ${vs?.border ?? 'border-slate-700/50'}`}>
              <div className="flex justify-between items-end">
                <div className="text-center">
                  <div className="text-3xl font-black text-rose-400">{score.sideAScore}</div>
                  <div className="text-xs text-slate-500 mt-1">You Give</div>
                </div>
                <div className="flex-1 px-6">
                  <FairnessBar ratio={score.ratio} />
                </div>
                <div className="text-center">
                  <div className="text-3xl font-black text-emerald-400">{score.sideBScore}</div>
                  <div className="text-xs text-slate-500 mt-1">You Receive</div>
                </div>
              </div>
              {vs && (
                <div className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 border ${vs.bg} ${vs.border}`}>
                  <span className="text-lg">{vs.icon}</span>
                  <span className={`text-base font-black tracking-wide ${vs.text}`}>{score.verdict}</span>
                </div>
              )}
            </div>

            <div className="bg-gradient-to-b from-slate-900 to-indigo-950/10 rounded-xl p-5 border border-indigo-500/30 min-w-0 flex-shrink-0">
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3">AI Analysis</h3>
              <StreamingAnalysis hash={score.analysisHash} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
