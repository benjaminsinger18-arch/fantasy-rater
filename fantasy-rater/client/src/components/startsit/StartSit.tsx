import { useState } from 'react';
import { PlayerSearch } from '../shared/PlayerSearch.tsx';
import { StreamingAnalysis } from '../shared/StreamingAnalysis.tsx';
import { GradeChip } from '../shared/GradeChip.tsx';
import { compareStartSit } from '../../lib/api.ts';
import { useLeague } from '../../lib/LeagueContext.tsx';
import type { Player } from '../../types/index.ts';

interface StartSitResult {
  recommended: string;
  confidence: string;
  scoreA: number;
  scoreB: number;
  recentA: number[];
  recentB: number[];
  avgA: number;
  avgB: number;
  analysisHash: string;
}

function scoreToGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 80) return 'A-';
  if (score >= 77) return 'B+';
  if (score >= 73) return 'B';
  if (score >= 70) return 'B-';
  if (score >= 67) return 'C+';
  if (score >= 63) return 'C';
  if (score >= 60) return 'C-';
  return 'D';
}

function PlayerSlot({
  label,
  player,
  onSelect,
  onClear,
  sport,
  accentClass,
}: {
  label: string;
  player: Player | null;
  onSelect: (p: Player) => void;
  onClear: () => void;
  sport: string;
  accentClass: string;
}) {
  return (
    <div className={`flex-1 rounded-xl border bg-slate-900/40 flex flex-col min-w-0 ${accentClass}`}>
      <div className="px-4 pt-4 pb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">{label}</h3>
        <PlayerSearch onSelect={onSelect} placeholder="Search player..." />
      </div>
      {player && (
        <div className="px-4 pb-4">
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/40 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-sm truncate">{player.name}</p>
              <p className="text-xs text-slate-400">{player.position} · {player.team}</p>
              {player.injuryStatus && (
                <span className="inline-block mt-1 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400">
                  {player.injuryStatus}
                </span>
              )}
            </div>
            <button
              onClick={onClear}
              className="text-slate-600 hover:text-slate-300 text-lg transition-colors flex-shrink-0"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function StartSit() {
  const { config } = useLeague();
  const [playerA, setPlayerA] = useState<Player | null>(null);
  const [playerB, setPlayerB] = useState<Player | null>(null);
  const [result, setResult] = useState<StartSitResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCompare() {
    if (!playerA || !playerB) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await compareStartSit({
        playerA: { ...playerA, id: playerA.id },
        playerB: { ...playerB, id: playerB.id },
        sport: config.sport,
        scoringFormat: config.scoringFormat,
        week: config.currentWeek,
      });
      setResult(data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      if (msg !== 'upgrade_required') setError(msg ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const confidenceColor =
    result?.confidence === 'Clear Start' ? 'text-emerald-400' :
    result?.confidence === 'Start' ? 'text-blue-400' : 'text-amber-400';

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-700/50 flex-shrink-0">
        <h1 className="text-xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          Start/Sit Optimizer
        </h1>
        <p className="text-xs text-slate-500 mt-1">Compare two players at the same position — get an AI-powered start recommendation</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 flex gap-6 h-full min-h-0">
          {/* Left: Player selection */}
          <div className="w-80 flex-shrink-0 flex flex-col gap-4">
            <PlayerSlot
              label="Player A"
              player={playerA}
              onSelect={setPlayerA}
              onClear={() => { setPlayerA(null); setResult(null); }}
              sport={config.sport}
              accentClass="border-indigo-500/20"
            />
            <div className="flex items-center justify-center gap-3">
              <div className="flex-1 h-px bg-slate-700/50" />
              <span className="text-slate-600 text-xs font-bold uppercase tracking-wider">vs</span>
              <div className="flex-1 h-px bg-slate-700/50" />
            </div>
            <PlayerSlot
              label="Player B"
              player={playerB}
              onSelect={setPlayerB}
              onClear={() => { setPlayerB(null); setResult(null); }}
              sport={config.sport}
              accentClass="border-violet-500/20"
            />

            <button
              onClick={handleCompare}
              disabled={!playerA || !playerB || loading}
              className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-violet-500/20"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⟳</span> Analyzing...
                </span>
              ) : 'Compare Players'}
            </button>

            {error && (
              <div className="text-red-400 text-sm bg-red-500/10 rounded-lg p-3">{error}</div>
            )}
          </div>

          {/* Right: Results */}
          <div className="flex-1 min-w-0">
            {!result && !loading && (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-3">🔄</div>
                  <p className="text-slate-500 text-sm">Select two players to compare</p>
                </div>
              </div>
            )}

            {result && (
              <div className="flex flex-col gap-4">
                {/* Recommendation */}
                <div className="bg-slate-800/60 rounded-xl border border-slate-700/40 p-5">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold">Recommendation</p>
                  <div className="flex items-baseline gap-3">
                    <span className="text-2xl font-black text-white">Start {result.recommended}</span>
                    <span className={`text-sm font-bold ${confidenceColor}`}>{result.confidence}</span>
                  </div>
                </div>

                {/* Stat comparison */}
                <div className="bg-slate-800/60 rounded-xl border border-slate-700/40 p-5">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 font-semibold">Comparison</p>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-center">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">{playerA?.name.split(' ')[1] ?? 'Player A'}</p>
                      <GradeChip grade={scoreToGrade(result.scoreA)} />
                      <p className="text-xs text-slate-400 mt-2">{result.avgA} avg</p>
                      <p className="text-[10px] text-slate-600 mt-1">
                        {result.recentA.length > 0 ? result.recentA.join(', ') : 'No data'}
                      </p>
                    </div>
                    <div className="flex items-center justify-center">
                      <span className="text-slate-600 font-bold">vs</span>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">{playerB?.name.split(' ')[1] ?? 'Player B'}</p>
                      <GradeChip grade={scoreToGrade(result.scoreB)} />
                      <p className="text-xs text-slate-400 mt-2">{result.avgB} avg</p>
                      <p className="text-[10px] text-slate-600 mt-1">
                        {result.recentB.length > 0 ? result.recentB.join(', ') : 'No data'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* AI Analysis */}
                <div className="bg-slate-800/60 rounded-xl border border-slate-700/40 p-5">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 font-semibold">AI Analysis</p>
                  <StreamingAnalysis hash={result.analysisHash} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
