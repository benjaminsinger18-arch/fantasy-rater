import { useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Loader2 } from 'lucide-react';
import { PlayerSearch } from '../shared/PlayerSearch.tsx';
import { PlayerCard } from '../shared/PlayerCard.tsx';
import { GradeChip } from '../shared/GradeChip.tsx';
import { StreamingAnalysis } from '../shared/StreamingAnalysis.tsx';
import { rateTeam, importSleeperRoster, importFplRoster, importEspnRoster } from '../../lib/api.ts';
import { useLeague } from '../../lib/LeagueContext.tsx';
import type { Player, TeamScore } from '../../types/index.ts';

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

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
    <div className="flex flex-col md:flex-row h-full">
      {/* Left: Roster Panel */}
      <div className="w-full md:w-1/2 flex flex-col p-4 md:p-5 border-b md:border-b-0 md:border-r border-white/5 min-w-0">
        <div className="flex-shrink-0 mb-4">
          <h1 className="text-xl font-display font-black bg-gradient-to-r from-white via-blue-100 to-indigo-300 bg-clip-text text-transparent">
            Team Rater
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">Get an AI grade for your entire roster</p>
        </div>

        {/* Import */}
        <div className="card-base p-4 border-l-4 border-l-blue-500/60 flex-shrink-0 mb-3">
          <p className="text-xs font-display font-bold text-blue-400 uppercase tracking-widest mb-2">
            {config.sport === 'fpl' ? 'Import FPL Team' : config.sport === 'mlb' ? 'Import ESPN Roster' : 'Import Sleeper Roster'}
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={importId}
              onChange={e => setImportId(e.target.value)}
              placeholder={config.sport === 'fpl' ? 'FPL Manager ID' : config.sport === 'mlb' ? 'ESPN League ID' : 'Sleeper League ID'}
              className="input-base flex-1"
            />
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-sm shadow-blue-500/20"
            >
              {importing ? <Loader2 size={14} className="animate-spin" /> : 'Import'}
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
            <div className="text-center py-8">
              <ClipboardList size={40} className="mx-auto mb-3 text-slate-700" />
              <p className="text-slate-600 text-sm">Import a roster or add players manually</p>
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 gap-2 pb-2"
            >
              {roster.map((p, i) => (
                <motion.div key={`${p.id ?? p.name}-${i}`} variants={itemVariants}>
                  <PlayerCard
                    player={p}
                    sport={config.sport}
                    onRemove={() => setRoster(prev => prev.filter((_, idx) => idx !== i))}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        {error && <p className="text-rose-400 text-sm flex-shrink-0 mt-2">{error}</p>}

        <button
          onClick={handleRate}
          disabled={loading || !roster.length}
          className="w-full py-3.5 mt-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-display font-bold rounded-2xl transition-all shadow-lg shadow-amber-500/25 flex-shrink-0 flex items-center justify-center gap-2"
        >
          {loading ? <><Loader2 size={16} className="animate-spin" /> Grading...</> : `Rate My Team (${roster.length} players)`}
        </button>
      </div>

      {/* Right: Grade Panel */}
      <div className="w-full md:w-1/2 flex flex-col p-4 md:p-5 gap-4 min-w-0">
        <div className="flex-shrink-0">
          <h2 className="text-xl font-display font-black bg-gradient-to-r from-white via-blue-100 to-indigo-300 bg-clip-text text-transparent">
            Grade
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">Your team rating appears here</p>
        </div>

        {!score && !loading && (
          <div className="flex-1 flex items-center justify-center min-h-[200px]">
            <div className="text-center">
              <ClipboardList size={40} className="mx-auto mb-3 text-slate-700" />
              <p className="text-slate-600 text-sm">Build your roster above<br />and tap Rate My Team</p>
            </div>
          </div>
        )}

        {score && (
          <>
            <div className="card-base p-5 border-l-4 border-l-violet-500/60 flex-shrink-0">
              <div className="flex items-center gap-5 mb-4">
                <GradeChip grade={score.grade} size="lg" />
                <div>
                  <div className="text-white font-display font-black text-2xl animate-count-up">
                    {score.score} <span className="text-slate-500 text-base font-normal">/ 100</span>
                  </div>
                  <div className="text-slate-400 text-sm">{roster.length} players evaluated</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(score.positionBreakdown).map(([pos, { score: s, grade }]) => (
                  <div key={pos} className="flex items-center justify-between card-base px-3 py-2.5 hover:border-indigo-500/15 transition-colors">
                    <span className="text-slate-300 text-sm font-semibold">{pos}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 text-xs">{s}</span>
                      <GradeChip grade={grade} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-base p-5 border-l-4 border-l-indigo-500/60 min-w-0 flex-shrink-0">
              <h3 className="text-xs font-display font-bold text-indigo-400 uppercase tracking-widest mb-3">AI Analysis</h3>
              <StreamingAnalysis hash={score.analysisHash} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
