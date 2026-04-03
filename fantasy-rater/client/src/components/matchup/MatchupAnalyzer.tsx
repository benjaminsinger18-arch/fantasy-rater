import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Loader2, X, Plus } from 'lucide-react';
import { analyzeMatchup, importSleeperRoster } from '../../lib/api.ts';
import { PlayerSearch } from '../shared/PlayerSearch.tsx';
import { GradeChip } from '../shared/GradeChip.tsx';
import { StreamingAnalysis } from '../shared/StreamingAnalysis.tsx';
import { useLeague } from '../../lib/LeagueContext.tsx';
import type { Player } from '../../types/index.ts';

interface HeadToHead {
  position: string;
  mine: { player: string; score: number };
  opponent: { player: string; score: number };
}

interface MatchupResult {
  myScore: number;
  myGrade: string;
  oppScore: number;
  oppGrade: string;
  winProb: number;
  headToHead: HeadToHead[];
  analysisHash: string;
}

function RosterPanel({
  label,
  players,
  onAdd,
  onRemove,
  onImport,
  importing,
  accentColor,
}: {
  label: string;
  players: Player[];
  onAdd: (p: Player) => void;
  onRemove: (i: number) => void;
  onImport?: () => void;
  importing?: boolean;
  accentColor: string;
}) {
  return (
    <div className="flex-1 min-w-0 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-mono font-bold uppercase tracking-widest" style={{ color: accentColor }}>{label}</p>
        {onImport && (
          <button
            onClick={onImport}
            disabled={importing}
            className="text-[9px] font-mono text-[#555555] hover:text-[#F2EFE8] border border-[#484850] px-2 py-0.5 hover:border-[#E8321A]/40 transition-colors disabled:opacity-40 flex items-center gap-1"
          >
            {importing ? <Loader2 size={9} className="animate-spin" /> : <Plus size={9} />}
            Import
          </button>
        )}
      </div>
      <PlayerSearch onSelect={onAdd} placeholder={`Add ${label.toLowerCase()} player...`} />
      <div className="min-h-[80px] max-h-52 overflow-y-auto border border-[#2A2A2A]">
        {players.length === 0 ? (
          <p className="text-[10px] font-mono text-[#444444] text-center py-4">No players added</p>
        ) : (
          players.map((p, i) => (
            <div key={`${p.name}-${i}`} className="flex items-center gap-2 px-2 py-1.5 border-b border-[#222222] last:border-0 group hover:bg-[#2C2C31]">
              <div className="w-8 text-[9px] font-mono text-[#555555] flex-shrink-0">{p.position}</div>
              <div className="flex-1 min-w-0 text-[11px] font-display font-black text-[#F2EFE8] truncate">{p.name}</div>
              <button onClick={() => onRemove(i)} className="text-[#333333] hover:text-[#E8321A] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <X size={10} />
              </button>
            </div>
          ))
        )}
      </div>
      <p className="text-[9px] font-mono text-[#444444]">{players.length} players</p>
    </div>
  );
}

function H2HRow({ row }: { row: HeadToHead }) {
  const myWins = row.mine.score > row.opponent.score;
  const tied = row.mine.score === row.opponent.score;
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-[#2A2A2A] last:border-0 text-xs font-mono">
      <div className={`flex-1 truncate text-right text-[11px] ${myWins ? 'text-[#4DC878] font-bold' : 'text-[#666666]'}`}>
        {row.mine.player.split(' ').pop()}
      </div>
      <div className="w-8 text-center text-[9px] text-[#555555] font-bold flex-shrink-0">{row.position}</div>
      <div className={`flex-1 truncate text-[11px] ${!myWins && !tied ? 'text-[#E8321A] font-bold' : 'text-[#666666]'}`}>
        {row.opponent.player.split(' ').pop()}
      </div>
    </div>
  );
}

export function MatchupAnalyzer() {
  const { config } = useLeague();
  const [myRoster, setMyRoster] = useState<Player[]>([]);
  const [oppRoster, setOppRoster] = useState<Player[]>([]);
  const [result, setResult] = useState<MatchupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');

  async function handleImportMine() {
    if (!config.leagueId) { setError('Set a League ID in League Setup first.'); return; }
    setImporting(true); setError('');
    try {
      const data = await importSleeperRoster(config.leagueId, config.myRosterId ? Number(config.myRosterId) : undefined);
      setMyRoster(data.roster);
    } catch { setError('Import failed'); }
    finally { setImporting(false); }
  }

  async function handleAnalyze() {
    if (myRoster.length < 2 || oppRoster.length < 2) {
      setError('Add at least 2 players to each side.');
      return;
    }
    setError(''); setLoading(true); setResult(null);
    try {
      const data = await analyzeMatchup({
        myRoster,
        opponentRoster: oppRoster,
        sport: config.sport,
        scoringFormat: config.scoringFormat,
        week: config.currentWeek,
      });
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const winning = result ? result.winProb >= 50 : false;

  return (
    <div className="flex flex-col md:flex-row h-full">
      {/* Left: Roster inputs */}
      <div className="w-full md:w-1/2 flex flex-col p-4 md:p-5 border-b md:border-b-0 md:border-r border-[#2A2A2A] gap-4 min-w-0">
        <div className="hidden md:block flex-shrink-0">
          <h1 className="text-2xl font-display font-black text-[#F2EFE8] tracking-wider">Matchup Analyzer</h1>
          <p className="text-[10px] font-mono text-[#555555] mt-0.5 tracking-wider">Head-to-head breakdown + win probability</p>
        </div>

        <div className="flex gap-3">
          <RosterPanel
            label="My Roster"
            players={myRoster}
            onAdd={p => setMyRoster(prev => [...prev, p])}
            onRemove={i => setMyRoster(prev => prev.filter((_, idx) => idx !== i))}
            onImport={handleImportMine}
            importing={importing}
            accentColor="#4DC878"
          />
          <div className="flex items-center justify-center flex-shrink-0 mt-6">
            <div className="w-6 h-6 border border-[#484850] flex items-center justify-center text-[#484850]">
              <Swords size={12} />
            </div>
          </div>
          <RosterPanel
            label="Opponent"
            players={oppRoster}
            onAdd={p => setOppRoster(prev => [...prev, p])}
            onRemove={i => setOppRoster(prev => prev.filter((_, idx) => idx !== i))}
            accentColor="#E8321A"
          />
        </div>

        {error && <p className="text-rose-400 text-xs font-mono">{error}</p>}

        <button
          onClick={handleAnalyze}
          disabled={loading || myRoster.length < 2 || oppRoster.length < 2}
          className="w-full py-3.5 bg-[#E8321A] hover:bg-[#C82818] disabled:opacity-40 disabled:cursor-not-allowed text-white font-display font-black tracking-widest uppercase text-sm transition-colors flex items-center justify-center gap-2"
        >
          {loading
            ? <><Loader2 size={14} className="animate-spin" /> Analyzing...</>
            : <><Swords size={14} /> Analyze Matchup</>
          }
        </button>
      </div>

      {/* Right: Results */}
      <div className="w-full md:w-1/2 flex flex-col p-4 md:p-5 gap-4 min-w-0 overflow-y-auto">
        <div className="hidden md:block flex-shrink-0">
          <h2 className="text-2xl font-display font-black text-[#F2EFE8] tracking-wider">Matchup Report</h2>
          <p className="text-[10px] font-mono text-[#555555] mt-0.5">Results appear here after analyzing</p>
        </div>

        <AnimatePresence mode="wait">
          {!result && !loading && (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex items-center justify-center min-h-[200px]">
              <div className="text-center">
                <Swords size={28} className="mx-auto mb-3 text-[#2A2A2A]" />
                <p className="text-xs font-mono text-[#444444]">Add both rosters and tap<br />Analyze Matchup</p>
              </div>
            </motion.div>
          )}

          {result && (
            <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
              {/* Win probability */}
              <div
                className="card-base p-4 border-l-4"
                style={{ borderLeftColor: winning ? '#4DC878' : '#E8321A' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <GradeChip grade={result.myGrade} size="lg" />
                    <div>
                      <div className="text-[#F2EFE8] font-display font-black text-2xl">{result.myScore}</div>
                      <div className="text-[10px] font-mono text-[#555555]">My team</div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={`text-xl font-display font-black ${winning ? 'text-[#4DC878]' : 'text-[#E8321A]'}`}>
                      {result.winProb}%
                    </div>
                    <div className="text-[9px] font-mono text-[#555555]">WIN PROB</div>
                  </div>
                  <div className="flex items-center gap-3 flex-row-reverse">
                    <GradeChip grade={result.oppGrade} size="lg" />
                    <div className="text-right">
                      <div className="text-[#F2EFE8] font-display font-black text-2xl">{result.oppScore}</div>
                      <div className="text-[10px] font-mono text-[#555555]">Opponent</div>
                    </div>
                  </div>
                </div>
                {/* Win probability bar */}
                <div className="h-1.5 bg-[#1A1A1A] overflow-hidden">
                  <motion.div
                    className="h-full"
                    style={{ backgroundColor: winning ? '#4DC878' : '#E8321A' }}
                    initial={{ width: '50%' }}
                    animate={{ width: `${result.winProb}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
              </div>

              {/* Position H2H breakdown */}
              <div className="card-base border-l-4 border-l-[#484850] overflow-hidden">
                <div className="px-3 py-2 border-b border-[#2A2A2A] flex justify-between">
                  <p className="text-[10px] font-mono font-bold text-[#555555] uppercase tracking-widest">Position Breakdown</p>
                  <div className="flex gap-4 text-[9px] font-mono text-[#444444]">
                    <span className="text-[#4DC878]">Me</span>
                    <span className="text-[#E8321A]">Opp</span>
                  </div>
                </div>
                <div className="px-3">
                  {result.headToHead.map(row => <H2HRow key={row.position} row={row} />)}
                </div>
              </div>

              {/* AI Game Plan */}
              <div className="card-base p-4 border-l-4 border-l-[#E8321A]">
                <h3 className="text-[10px] font-mono font-bold text-[#E8321A] uppercase tracking-widest mb-3">AI Game Plan</h3>
                <StreamingAnalysis hash={result.analysisHash} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
