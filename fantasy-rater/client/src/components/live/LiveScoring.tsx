import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, RefreshCw, AlertCircle, Settings } from 'lucide-react';
import { getLiveMatchup } from '../../lib/api.ts';
import { useLeague } from '../../lib/LeagueContext.tsx';
import { useNavigate } from 'react-router-dom';

interface LivePlayer {
  id: string;
  name: string;
  position: string;
  team: string;
  points: number;
  isStarter: boolean;
}

interface MatchupSide {
  rosterId: number;
  matchupId: number;
  totalPoints: number;
  players: LivePlayer[];
}

interface Matchup {
  mine: MatchupSide;
  opponent: MatchupSide | null;
}

const POS_COLORS: Record<string, string> = {
  QB: '#E8321A', RB: '#4DC878', WR: '#5090D8',
  TE: '#C8882A', K: '#9BA4B5', DEF: '#7B5EA7', '?': '#555555',
};

function PlayerRow({ player, dimmed }: { player: LivePlayer; dimmed?: boolean }) {
  const posColor = POS_COLORS[player.position] ?? '#555555';
  const hasPoints = player.points > 0;
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: dimmed ? 0.4 : 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-2 px-2 py-1.5 border-b border-[#2A2A2A] last:border-0"
    >
      <div
        className="w-8 text-center text-[9px] font-mono font-bold flex-shrink-0 px-1 py-0.5"
        style={{ color: posColor, backgroundColor: `${posColor}18` }}
      >
        {player.position}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-display font-black text-[#F2EFE8] truncate">{player.name}</div>
        <div className="text-[9px] font-mono text-[#555555]">{player.team}</div>
      </div>
      <div className={`text-sm font-display font-black flex-shrink-0 tabular-nums ${hasPoints ? 'text-[#F2EFE8]' : 'text-[#444444]'}`}>
        {player.points.toFixed(2)}
      </div>
    </motion.div>
  );
}

function ScoreDisplay({ side, label, winning }: { side: MatchupSide; label: string; winning: boolean }) {
  const color = winning ? '#4DC878' : '#E8321A';
  return (
    <div className="flex-1 text-center px-2">
      <div className="text-[10px] font-mono text-[#555555] uppercase tracking-widest mb-1">{label}</div>
      <motion.div
        key={side.totalPoints}
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 20 }}
        className="text-5xl font-display font-black tabular-nums"
        style={{ color }}
      >
        {side.totalPoints.toFixed(2)}
      </motion.div>
      <div className="text-[10px] font-mono text-[#555555] mt-1">
        {side.players.filter(p => p.isStarter).length} starters
      </div>
    </div>
  );
}

// Checks if we're in an NFL game window (Thu/Mon nights, Sun all day ET)
function isNflGameWindow(): boolean {
  const now = new Date();
  const etHour = (now.getUTCHours() - 5 + 24) % 24; // rough ET offset
  const day = now.getUTCDay(); // 0=Sun,1=Mon,...,4=Thu
  if (day === 0) return etHour >= 12 && etHour <= 23; // Sunday noon–midnight
  if (day === 1) return etHour >= 19 && etHour <= 23; // Monday night
  if (day === 4) return etHour >= 19 && etHour <= 23; // Thursday night
  return false;
}

export function LiveScoring() {
  const { config } = useLeague();
  const navigate = useNavigate();
  const [matchup, setMatchup] = useState<Matchup | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isFpl = config.sport === 'fpl';
  const hasSetup = Boolean(
    config.leagueId && (isFpl || (config.myRosterId && config.sport === 'nfl'))
  );

  const fetchMatchup = useCallback(async () => {
    if (!config.leagueId || (!isFpl && !config.myRosterId)) return;
    setError('');
    try {
      const data = await getLiveMatchup(
        config.leagueId,
        config.currentWeek,
        isFpl ? undefined : Number(config.myRosterId),
        config.sport,
      );
      setMatchup(data);
      setLastUpdated(new Date());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load matchup');
    }
  }, [config.leagueId, config.myRosterId, config.currentWeek, config.sport, isFpl]);

  // Initial fetch
  useEffect(() => {
    if (!hasSetup) return;
    setLoading(true);
    fetchMatchup().finally(() => setLoading(false));
  }, [hasSetup, fetchMatchup]);

  // Auto-refresh every 90s during game windows, 5min otherwise
  useEffect(() => {
    if (!hasSetup) return;
    const ms = isNflGameWindow() ? 90_000 : 300_000;
    intervalRef.current = setInterval(fetchMatchup, ms);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [hasSetup, fetchMatchup]);

  if (!hasSetup) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <div className="w-12 h-12 border-2 border-[#484850] flex items-center justify-center">
          <Activity size={24} className="text-[#484850]" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-display font-black text-[#F2EFE8] tracking-wider mb-2">Live Score</h2>
          <p className="text-xs font-mono text-[#555555] mb-1">
            {config.sport !== 'nfl' && config.sport !== 'fpl'
              ? 'Live scoring is available for NFL (Sleeper) and FPL leagues.'
              : config.sport === 'fpl'
                ? 'Set your FPL Manager ID as the League ID in League Setup.'
                : 'Set up your Sleeper league to see your live matchup score.'}
          </p>
          {config.sport === 'nfl' && (
            <p className="text-[10px] font-mono text-[#444444]">Requires League ID + Roster ID from League Setup.</p>
          )}
        </div>
        {(config.sport === 'nfl' || config.sport === 'fpl') && (
          <button
            onClick={() => navigate('/league')}
            className="flex items-center gap-2 px-4 py-2 border border-[#484850] text-xs font-mono text-[#8A8A8A] hover:text-[#F2EFE8] hover:border-[#E8321A]/50 transition-colors"
          >
            <Settings size={12} /> Go to League Setup
          </button>
        )}
      </div>
    );
  }

  const myScore = matchup?.mine.totalPoints ?? 0;
  const oppScore = matchup?.opponent?.totalPoints ?? 0;
  const winning = myScore >= oppScore;
  const diff = Math.abs(myScore - oppScore).toFixed(2);

  const myStarters = matchup?.mine.players.filter(p => p.isStarter) ?? [];
  const myBench = matchup?.mine.players.filter(p => !p.isStarter) ?? [];
  const oppStarters = matchup?.opponent?.players.filter(p => p.isStarter) ?? [];

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex-shrink-0 px-4 md:px-5 pt-4 md:pt-5 pb-3 border-b border-[#2A2A2A]">
        <div className="flex items-center justify-between mb-0.5">
          <h1 className="text-2xl font-display font-black text-[#F2EFE8] tracking-wider">Live Score</h1>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-[10px] font-mono text-[#444444]">
                {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              onClick={() => { setLoading(true); fetchMatchup().finally(() => setLoading(false)); }}
              disabled={loading}
              className="w-7 h-7 border border-[#484850] flex items-center justify-center text-[#555555] hover:text-[#F2EFE8] hover:border-[#E8321A]/40 transition-colors"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
        <p className="text-[10px] font-mono text-[#555555]">
          Week {config.currentWeek} · {isNflGameWindow() ? 'Auto-refreshing every 90s' : 'Auto-refreshing every 5m'}
        </p>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 mx-4 mt-3 px-3 py-2 border border-rose-500/20 bg-rose-900/10 text-rose-400 text-xs font-mono"
          >
            <AlertCircle size={12} /> {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Score board */}
      <AnimatePresence mode="wait">
        {loading && !matchup ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center py-12"
          >
            <RefreshCw size={20} className="animate-spin text-[#E8321A]" />
          </motion.div>
        ) : matchup ? (
          <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Score panel */}
            <div className="mx-4 mt-4 card-base p-4 border-l-4 flex-shrink-0" style={{ borderLeftColor: winning ? '#4DC878' : '#E8321A' }}>
              <div className="flex items-center">
                {matchup.mine && (
                  <ScoreDisplay side={matchup.mine} label="You" winning={winning} />
                )}

                <div className="flex-shrink-0 text-center px-3">
                  <div className={`text-[10px] font-mono font-bold uppercase tracking-widest mb-1 ${winning ? 'text-[#4DC878]' : 'text-[#E8321A]'}`}>
                    {winning ? 'WINNING' : 'LOSING'}
                  </div>
                  <div className="text-[10px] font-mono text-[#555555]">by {diff}</div>
                  {/* Win probability bar */}
                  <div className="w-16 h-1 bg-[#1A1A1A] mt-2 overflow-hidden">
                    <motion.div
                      className="h-full"
                      style={{ backgroundColor: winning ? '#4DC878' : '#E8321A' }}
                      initial={{ width: '50%' }}
                      animate={{
                        width: `${Math.min(95, Math.max(5, 50 + (myScore - oppScore) * 2))}%`,
                      }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                  </div>
                </div>

                {matchup.opponent ? (
                  <ScoreDisplay side={matchup.opponent} label="Opponent" winning={!winning} />
                ) : (
                  <div className="flex-1 text-center px-2">
                    <div className="text-[10px] font-mono text-[#555555] uppercase tracking-widest mb-1">Opponent</div>
                    <div className="text-2xl font-display font-black text-[#333333]">BYE</div>
                  </div>
                )}
              </div>
            </div>

            {/* Players grid */}
            <div className="flex flex-col md:flex-row gap-4 px-4 pb-6 mt-4">
              {/* My lineup */}
              <div className="flex-1 min-w-0">
                <div className="card-base border-l-4 border-l-[#4DC878] overflow-hidden">
                  <div className="px-3 py-2 border-b border-[#2A2A2A]">
                    <p className="text-[10px] font-mono font-bold text-[#4DC878] uppercase tracking-widest">My Starters</p>
                  </div>
                  <div>
                    {myStarters.map(p => <PlayerRow key={p.id} player={p} />)}
                  </div>
                </div>

                {myBench.length > 0 && (
                  <div className="card-base border-l-4 border-l-[#484850] overflow-hidden mt-2">
                    <div className="px-3 py-2 border-b border-[#2A2A2A]">
                      <p className="text-[10px] font-mono font-bold text-[#555555] uppercase tracking-widest">Bench</p>
                    </div>
                    <div>
                      {myBench.map(p => <PlayerRow key={p.id} player={p} dimmed />)}
                    </div>
                  </div>
                )}
              </div>

              {/* Opponent lineup */}
              {matchup.opponent && oppStarters.length > 0 && (
                <div className="flex-1 min-w-0">
                  <div className="card-base border-l-4 border-l-[#E8321A] overflow-hidden">
                    <div className="px-3 py-2 border-b border-[#2A2A2A]">
                      <p className="text-[10px] font-mono font-bold text-[#E8321A] uppercase tracking-widest">Opp Starters</p>
                    </div>
                    <div>
                      {oppStarters.map(p => <PlayerRow key={p.id} player={p} />)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
