import { useState } from 'react';
import { TrendingUp, TrendingDown, Telescope, Loader2 } from 'lucide-react';
import { useLeague } from '../../lib/LeagueContext.tsx';
import { predictLeague } from '../../lib/api.ts';
import { StreamingAnalysis } from '../shared/StreamingAnalysis.tsx';
import { GradeChip } from '../shared/GradeChip.tsx';
import type { LeaguePrediction, LeagueTeam } from '../../types/index.ts';

function RankBadge({ rank, total }: { rank: number; total: number }) {
  const isTop = rank <= Math.ceil(total * 0.25);
  const isBottom = rank > Math.floor(total * 0.75);
  return (
    <span className={`font-display font-bold text-lg ${isTop ? 'text-emerald-400' : isBottom ? 'text-red-400' : 'text-slate-200'}`}>
      #{rank}
    </span>
  );
}

function RankArrow({ current, projected }: { current: number; projected: number }) {
  const diff = current - projected; // positive = moving up
  if (diff === 0) return <span className="text-slate-500 text-xs">—</span>;
  if (diff > 0) return <span className="text-emerald-400 text-xs font-bold flex items-center gap-0.5"><TrendingUp size={12} />{diff}</span>;
  return <span className="text-red-400 text-xs font-bold flex items-center gap-0.5"><TrendingDown size={12} />{Math.abs(diff)}</span>;
}

export function LeaguePredictor() {
  const { config, setConfig } = useLeague();
  const [prediction, setPrediction] = useState<LeaguePrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canLoad = !!config.leagueId;

  async function loadLeague() {
    if (!canLoad) return;
    setLoading(true);
    setError('');
    setPrediction(null);
    try {
      const data = await predictLeague({
        leagueId: config.sport === 'fpl' ? (config.leagueId) : config.leagueId,
        sport: config.sport,
        scoringFormat: config.scoringFormat,
        currentWeek: config.currentWeek,
        myRosterId: config.myRosterId,
        espnS2: config.espnS2,
        swid: config.swid,
      });
      setPrediction(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load league';
      setError((err as any)?.response?.data?.error ?? msg);
    } finally {
      setLoading(false);
    }
  }

  function selectMyTeam(rosterId: string) {
    setConfig({ myRosterId: rosterId });
    if (prediction) {
      setLoading(true);
      setError('');
      predictLeague({
        leagueId: config.leagueId,
        sport: config.sport,
        scoringFormat: config.scoringFormat,
        currentWeek: config.currentWeek,
        myRosterId: rosterId,
        espnS2: config.espnS2,
        swid: config.swid,
      }).then(data => {
        setPrediction(data);
      }).catch(err => {
        setError((err as any)?.response?.data?.error ?? 'Failed to reload');
      }).finally(() => setLoading(false));
    }
  }

  const myTeam = prediction?.myTeam;
  const teams = prediction?.teams ?? [];

  return (
    <div className="flex flex-col md:flex-row min-h-full">
      {/* Left panel */}
      <div className="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-white/5">
        <div className="px-6 py-4 border-b border-white/5">
          <h1 className="text-xl font-display font-black bg-gradient-to-r from-white via-blue-100 to-indigo-300 bg-clip-text text-transparent">League Predictor</h1>
          <p className="text-sm text-slate-400 mt-0.5">Projected final standings based on roster strength + current record</p>
        </div>

        <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3 flex-wrap">
          {!canLoad && (
            <p className="text-sm text-amber-400">Set your League ID in League Setup first.</p>
          )}
          <button
            onClick={loadLeague}
            disabled={!canLoad || loading}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-display font-bold text-sm disabled:opacity-40 transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
          >
            {loading ? <><Loader2 size={14} className="animate-spin" /> Loading...</> : prediction ? 'Reload' : 'Load League'}
          </button>

          {teams.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-400">My team:</label>
              <select
                value={config.myRosterId ?? ''}
                onChange={e => selectMyTeam(e.target.value)}
                className="bg-slate-900/60 border border-white/[0.08] text-slate-200 text-sm rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500/60"
              >
                <option value="">— select —</option>
                {teams.map(t => (
                  <option key={String(t.rosterId)} value={String(t.rosterId)}>
                    {t.teamName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        {/* Standings table */}
        <div className="px-6 py-4">
          {teams.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="font-display text-xs text-slate-500 uppercase tracking-widest border-b border-white/5">
                  <th className="text-left pb-2 font-bold">Proj</th>
                  <th className="text-left pb-2 font-bold pl-2">Team</th>
                  <th className="text-center pb-2 font-bold">Record</th>
                  <th className="text-center pb-2 font-bold">Roster</th>
                  <th className="text-center pb-2 font-bold">Move</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {teams.map((team: LeagueTeam) => {
                  const isMe = config.myRosterId && String(team.rosterId) === config.myRosterId;
                  return (
                    <tr
                      key={String(team.rosterId)}
                      className={`transition-colors ${isMe ? 'bg-indigo-500/10 border-l-2 border-indigo-500' : 'hover:bg-white/[0.03]'}`}
                    >
                      <td className="py-2.5 pr-2">
                        <RankBadge rank={team.projectedRank} total={teams.length} />
                      </td>
                      <td className="py-2.5 pl-2">
                        <span className={`font-medium ${isMe ? 'text-indigo-300' : 'text-slate-200'}`}>
                          {team.teamName}
                          {isMe && <span className="ml-1.5 text-xs text-indigo-400">(you)</span>}
                        </span>
                      </td>
                      <td className="py-2.5 text-center text-slate-300">{team.currentRecord}</td>
                      <td className="py-2.5 text-center">
                        <GradeChip grade={team.rosterGrade} />
                      </td>
                      <td className="py-2.5 text-center">
                        <RankArrow current={team.currentRank} projected={team.projectedRank} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {!loading && !prediction && canLoad && (
            <div className="flex flex-col items-center justify-center h-48 text-slate-600 text-center gap-3">
              <Telescope size={40} className="text-slate-700" />
              <p className="text-sm">Tap Load League to see projected standings</p>
            </div>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full md:w-80 flex-shrink-0 flex flex-col">
        <div className="px-5 py-4 border-b border-white/5">
          <h2 className="text-base font-display font-bold text-white">Your Prediction</h2>
          <p className="text-xs text-slate-500 mt-0.5">Select your team to see a projection</p>
        </div>

        <div className="px-5 py-4 space-y-5">
          {myTeam ? (
            <>
              {/* Projected finish */}
              <div className="card-base p-4 border-l-4 border-l-indigo-500/60 text-center">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-display font-bold">Projected Finish</p>
                <div className="text-5xl font-display font-black text-white mb-1 animate-count-up">
                  #{myTeam.projectedRank}
                </div>
                <div className="text-xs text-slate-400">
                  Range: #{myTeam.projectedRange[0]}–#{myTeam.projectedRange[1]} of {teams.length}
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="card-base p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">Current Standing</p>
                  <p className="text-lg font-display font-bold text-slate-200">#{myTeam.currentRank}</p>
                  <p className="text-xs text-slate-400">{myTeam.currentRecord}</p>
                </div>
                <div className="card-base p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">Roster Grade</p>
                  <p className="text-lg font-display font-bold text-slate-200">{myTeam.rosterGrade}</p>
                  <p className="text-xs text-slate-400">{myTeam.rosterScore}/100</p>
                </div>
              </div>

              {/* Position breakdown vs league avg */}
              {Object.keys(myTeam.positionBreakdown).length > 0 && (
                <div className="card-base p-4 border-l-4 border-l-violet-500/40">
                  <p className="text-xs font-display font-bold text-slate-400 uppercase tracking-widest mb-3">Position Breakdown</p>
                  <div className="space-y-2">
                    {Object.entries(myTeam.positionBreakdown).map(([pos, { grade, score }]) => (
                      <div key={pos} className="flex items-center justify-between">
                        <span className="text-sm text-slate-400 w-10">{pos}</span>
                        <div className="flex-1 mx-3 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                            style={{ width: `${Math.min(100, score)}%` }}
                          />
                        </div>
                        <GradeChip grade={grade} />
                      </div>
                    ))}
                  </div>
                  {prediction && (
                    <p className="text-xs text-slate-600 mt-3">League avg: {prediction.leagueAvgRosterScore}/100</p>
                  )}
                </div>
              )}

              {/* AI analysis */}
              {prediction?.analysisHash && (
                <div className="card-base p-4 border-l-4 border-l-indigo-500/60">
                  <p className="text-xs font-display font-bold text-indigo-400 uppercase tracking-widest mb-3">AI Analysis</p>
                  <StreamingAnalysis hash={prediction.analysisHash} />
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-slate-600 text-center gap-3">
              <Telescope size={32} className="text-slate-700" />
              <p className="text-sm">
                {teams.length > 0
                  ? 'Select your team from the dropdown to see your prediction'
                  : 'Load your league to get started'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
