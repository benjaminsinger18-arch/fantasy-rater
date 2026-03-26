import { useState } from 'react';
import { PlayerSearch } from '../shared/PlayerSearch.tsx';
import { PlayerCard } from '../shared/PlayerCard.tsx';
import { GradeChip } from '../shared/GradeChip.tsx';
import { StreamingAnalysis } from '../shared/StreamingAnalysis.tsx';
import { rateTeam, importSleeperRoster, importFplRoster, importEspnRoster } from '../../lib/api.ts';
import { useLeague } from '../../lib/LeagueContext.tsx';
import type { Player, TeamScore } from '../../types/index.ts';

export function TeamRater() {
  const { config } = useLeague();
  const [roster, setRoster] = useState<Player[]>([]);
  const [score, setScore] = useState<TeamScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [importId, setImportId] = useState('');

  async function handleRate() {
    if (!roster.length) { setError('Add at least one player.'); return; }
    setError('');
    setLoading(true);
    setScore(null);
    try {
      const result = await rateTeam({
        roster,
        sport: config.sport,
        scoringFormat: config.scoringFormat,
        week: config.currentWeek,
      });
      setScore(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (!importId) { setError('Enter a league/manager ID first.'); return; }
    setError('');
    setImporting(true);
    try {
      const data = config.sport === 'fpl'
        ? await importFplRoster(importId)
        : config.sport === 'mlb' || config.platform === 'espn'
          ? await importEspnRoster(importId, config.myRosterId, config.sport, config.espnS2, config.swid, config.currentWeek)
          : await importSleeperRoster(importId);
      setRoster(data.roster);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="flex h-full" style={{ background: 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)' }}>
      {/* Left: Roster Panel */}
      <div className="w-1/2 flex flex-col p-5 border-r border-slate-700/50 min-w-0">
        <div className="flex-shrink-0 mb-4">
          <h1 className="text-xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Team Rater
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">Get an AI grade for your entire roster</p>
        </div>

        {/* Import */}
        <div className="bg-gradient-to-b from-slate-900 to-blue-950/10 rounded-xl p-3 border border-blue-500/20 flex-shrink-0 mb-3">
          <p className="text-xs text-blue-400 font-semibold mb-2">
            {config.sport === 'fpl' ? 'Import FPL Team' : 'Import Sleeper Roster'}
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={importId}
              onChange={e => setImportId(e.target.value)}
              placeholder={config.sport === 'fpl' ? 'FPL Manager ID' : 'Sleeper League ID'}
              className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
            />
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-all"
            >
              {importing ? '...' : 'Import'}
            </button>
          </div>
        </div>

        {/* Player search */}
        <div className="flex-shrink-0 mb-3">
          <PlayerSearch onSelect={p => setRoster(prev => [...prev, p])} placeholder='Add player or "TEAM"...' />
        </div>

        {/* Roster grid */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {roster.length === 0 ? (
            <p className="text-slate-600 text-sm text-center py-8">Import a roster or add players manually</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 pb-2">
              {roster.map((p, i) => (
                <PlayerCard
                  key={`${p.id ?? p.name}-${i}`}
                  player={p}
                  sport={config.sport}
                  onRemove={() => setRoster(prev => prev.filter((_, idx) => idx !== i))}
                />
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-rose-400 text-sm flex-shrink-0 mt-2">{error}</p>}

        <button
          onClick={handleRate}
          disabled={loading || !roster.length}
          className="w-full py-3 mt-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-violet-500/25 flex-shrink-0"
        >
          {loading ? 'Grading...' : `Rate My Team (${roster.length} players)`}
        </button>
      </div>

      {/* Right: Grade Panel */}
      <div className="w-1/2 flex flex-col p-5 gap-4 min-w-0">
        <div className="flex-shrink-0">
          <h2 className="text-xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Grade
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">Your team rating appears here</p>
        </div>

        {!score && !loading && (
          <div className="flex-1 flex items-center justify-center min-h-[200px]">
            <div className="text-center text-slate-600">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-sm">Build your roster on the left<br />and click Rate My Team</p>
            </div>
          </div>
        )}

        {score && (
          <>
            <div className="bg-slate-900/80 rounded-xl p-5 border border-violet-500/30 flex-shrink-0">
              <div className="flex items-center gap-5 mb-4">
                <GradeChip grade={score.grade} size="lg" />
                <div>
                  <div className="text-white font-black text-2xl">{score.score} <span className="text-slate-500 text-base font-normal">/ 100</span></div>
                  <div className="text-slate-400 text-sm">{roster.length} players evaluated</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(score.positionBreakdown).map(([pos, { score: s, grade }]) => (
                  <div key={pos} className="flex items-center justify-between bg-slate-800/60 rounded-lg px-3 py-2 border border-slate-700/40">
                    <span className="text-slate-300 text-sm font-semibold">{pos}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 text-xs">{s}</span>
                      <GradeChip grade={grade} />
                    </div>
                  </div>
                ))}
              </div>
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
