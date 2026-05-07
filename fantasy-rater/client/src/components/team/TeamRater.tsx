import { useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Loader2 } from 'lucide-react';
import { PlayerSearch } from '../shared/PlayerSearch.tsx';
import { PlayerCard } from '../shared/PlayerCard.tsx';
import { GradeChip } from '../shared/GradeChip.tsx';
import { StreamingAnalysis } from '../shared/StreamingAnalysis.tsx';
import { IridescentBorder } from '../shared/IridescentBorder.tsx';
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
      <div className="w-full md:w-1/2 flex flex-col p-4 md:p-5 border-b md:border-b-0 md:border-r border-[#2A2A2A] min-w-0">
        <div className="hidden md:block flex-shrink-0 mb-4">
          <h1 className="text-2xl font-display font-black text-[#F2EFE8] tracking-wider">Team Rater</h1>
          <p className="text-[10px] font-mono text-[#555555] mt-0.5 tracking-wider">Get an AI grade for your entire roster</p>
        </div>

        {/* Import */}
        <div className="card-base p-3 border-l-4 border-l-white/20 flex-shrink-0 mb-3">
          <p className="text-[10px] font-mono font-bold text-[#555555] uppercase tracking-widest mb-2">
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
              className="px-3 py-1.5 bg-[#E8321A] hover:bg-[#C82818] disabled:opacity-50 text-white text-xs font-mono font-bold transition-colors flex items-center gap-1"
            >
              {importing ? <Loader2 size={12} className="animate-spin" /> : 'Import'}
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
              <ClipboardList size={32} className="mx-auto mb-3 text-[#2A2A2A]" />
              <p className="text-xs font-mono text-[#444444]">Import a roster or add players manually</p>
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

        {error && <p className="text-rose-400 text-xs font-mono flex-shrink-0 mt-2">{error}</p>}

        <button
          onClick={handleRate}
          disabled={loading || !roster.length}
          className="w-full py-3.5 mt-3 btn-signal font-display font-black tracking-widest uppercase text-sm flex-shrink-0 flex items-center justify-center gap-2 rounded"
        >
          {loading ? <><Loader2 size={14} className="animate-spin" /> Grading...</> : `Rate My Team (${roster.length} players)`}
        </button>
      </div>

      {/* Right: Grade Panel */}
      <div className="w-full md:w-1/2 flex flex-col p-4 md:p-5 gap-4 min-w-0">
        <div className="hidden md:block flex-shrink-0">
          <h2 className="text-2xl font-display font-black text-[#F2EFE8] tracking-wider">Grade</h2>
          <p className="text-[10px] font-mono text-[#555555] mt-0.5">Your team rating appears here</p>
        </div>

        {!score && !loading && (
          <div className="flex-1 flex items-center justify-center min-h-[200px]">
            <div className="text-center">
              <ClipboardList size={32} className="mx-auto mb-3 text-[#2A2A2A]" />
              <p className="text-xs font-mono text-[#444444]">Build your roster above<br />and tap Rate My Team</p>
            </div>
          </div>
        )}

        {score && (
          <>
            <IridescentBorder block innerStyle={{ background: 'rgba(10,12,16,0.95)', borderRadius: '3px' }} className="flex-shrink-0">
              <div className="card-elevated p-4">
                <div className="flex items-center gap-4 mb-4">
                  <GradeChip grade={score.grade} size="lg" />
                  <div>
                    <div className="text-[#F2EFE8] font-display font-black text-2xl animate-count-up">
                      {score.score} <span className="text-[#555555] text-base font-normal">/ 100</span>
                    </div>
                    <div className="text-[#555555] text-xs font-mono">{roster.length} players evaluated</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-px">
                  {Object.entries(score.positionBreakdown).map(([pos, { score: s, grade }]) => (
                    <div key={pos} className="flex items-center justify-between card-base px-2 py-2">
                      <span className="text-[#8A8A8A] text-xs font-mono">{pos}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#555555] text-[10px] font-mono">{s}</span>
                        <GradeChip grade={grade} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </IridescentBorder>

            <div className="card-base p-4 border-l-4 border-l-[#E8321A] min-w-0 flex-shrink-0">
              <h3 className="text-[10px] font-mono font-bold text-[#E8321A] uppercase tracking-widest mb-3">AI Analysis</h3>
              <StreamingAnalysis hash={score.analysisHash} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
