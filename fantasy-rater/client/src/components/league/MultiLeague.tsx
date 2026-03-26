import { useState, useEffect } from 'react';
import { GradeChip } from '../shared/GradeChip.tsx';
import { getSavedLeagues, saveLeague, deleteLeague, updateLeague } from '../../lib/api.ts';

interface SavedLeague {
  id: number;
  sport: string;
  platform: string;
  league_id: string;
  roster_id?: string;
  team_name?: string;
  scoring_format: string;
  league_size: number;
  is_primary: number;
}

const SPORT_EMOJI: Record<string, string> = { nfl: '🏈', fpl: '⚽', mlb: '⚾' };
const PLATFORM_LABEL: Record<string, string> = { sleeper: 'Sleeper', espn: 'ESPN', fpl: 'FPL', yahoo: 'Yahoo' };

function AddLeagueForm({ onAdd, onCancel }: { onAdd: (l: SavedLeague) => void; onCancel: () => void }) {
  const [sport, setSport] = useState('nfl');
  const [platform, setPlatform] = useState('sleeper');

  // MLB only works with ESPN
  function handleSportChange(s: string) {
    setSport(s);
    if (s === 'mlb') setPlatform('espn');
    if (s === 'fpl') setPlatform('fpl');
    if (s === 'nfl') setPlatform('sleeper');
  }
  const [leagueId, setLeagueId] = useState('');
  const [rosterId, setRosterId] = useState('');
  const [teamName, setTeamName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!leagueId) return;
    setSaving(true);
    setError('');
    try {
      const saved = await saveLeague({ sport, platform, league_id: leagueId, roster_id: rosterId || undefined, team_name: teamName || undefined });
      onAdd(saved);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Failed to save league');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-slate-800/60 rounded-xl border border-indigo-500/30 p-5">
      <p className="text-sm font-bold text-white mb-4">Add League</p>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider">Sport</label>
            <select value={sport} onChange={e => handleSportChange(e.target.value)}
              className="w-full mt-1 bg-slate-900/60 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50">
              <option value="nfl">🏈 NFL</option>
              <option value="mlb">⚾ MLB</option>
              <option value="fpl">⚽ FPL</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider">Platform</label>
            <select value={platform} onChange={e => setPlatform(e.target.value)}
              className="w-full mt-1 bg-slate-900/60 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
              disabled={sport === 'mlb' || sport === 'fpl'}>
              <option value="sleeper">Sleeper</option>
              <option value="espn">ESPN</option>
              <option value="fpl">FPL</option>
              <option value="yahoo">Yahoo</option>
            </select>
            {sport === 'mlb' && <p className="text-[10px] text-slate-500 mt-1">MLB uses ESPN</p>}
          </div>
        </div>
        <input value={leagueId} onChange={e => setLeagueId(e.target.value)} placeholder="League ID *"
          className="w-full bg-slate-900/60 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50" />
        <input value={rosterId} onChange={e => setRosterId(e.target.value)} placeholder="Your Roster ID (optional)"
          className="w-full bg-slate-900/60 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50" />
        <input value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Team Name (optional)"
          className="w-full bg-slate-900/60 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50" />
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={!leagueId || saving}
            className="flex-1 py-2 rounded-lg font-bold text-sm bg-gradient-to-r from-violet-600 to-indigo-600 text-white disabled:opacity-40">
            {saving ? 'Saving...' : 'Save League'}
          </button>
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function MultiLeague() {
  const [leagues, setLeagues] = useState<SavedLeague[]>([]);
  const [tier, setTier] = useState('free');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    getSavedLeagues()
      .then(d => { setLeagues(d.leagues); setTier(d.tier); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleSetPrimary(id: number) {
    await updateLeague(id, { is_primary: true });
    setLeagues(prev => prev.map(l => ({ ...l, is_primary: l.id === id ? 1 : 0 })));
  }

  async function handleDelete(id: number) {
    await deleteLeague(id);
    setLeagues(prev => prev.filter(l => l.id !== id));
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-700/50 flex-shrink-0">
        <h1 className="text-xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          My Leagues
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          {tier === 'pro' ? 'Unlimited leagues' : 'Free tier: 1 league — upgrade for unlimited'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading && (
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <span className="animate-spin">⟳</span> Loading...
          </div>
        )}

        {!loading && (
          <div className="max-w-2xl flex flex-col gap-4">
            {/* League cards */}
            {leagues.map(league => (
              <div key={league.id} className={`bg-slate-800/60 rounded-xl border p-5 ${league.is_primary ? 'border-indigo-500/40' : 'border-slate-700/40'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl">{SPORT_EMOJI[league.sport] ?? '🏆'}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-white text-sm truncate">{league.team_name ?? `League ${league.league_id}`}</p>
                        {league.is_primary === 1 && (
                          <span className="text-[9px] font-bold bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded-full flex-shrink-0">PRIMARY</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{PLATFORM_LABEL[league.platform]} · {league.sport.toUpperCase()} · {league.scoring_format}</p>
                      <p className="text-xs text-slate-600 mt-0.5">ID: {league.league_id}{league.roster_id ? ` · Roster: ${league.roster_id}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {league.is_primary !== 1 && (
                      <button onClick={() => handleSetPrimary(league.id)}
                        className="text-xs text-slate-500 hover:text-indigo-400 transition-colors px-2 py-1 rounded-lg hover:bg-indigo-500/10">
                        Set Primary
                      </button>
                    )}
                    <button onClick={() => handleDelete(league.id)}
                      className="text-xs text-slate-600 hover:text-rose-400 transition-colors px-2 py-1 rounded-lg hover:bg-rose-500/10">
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Add league */}
            {showAdd ? (
              <AddLeagueForm
                onAdd={l => { setLeagues(prev => [...prev, l]); setShowAdd(false); }}
                onCancel={() => setShowAdd(false)}
              />
            ) : (
              <button
                onClick={() => setShowAdd(true)}
                disabled={tier !== 'pro' && leagues.length >= 1}
                className="w-full py-3 rounded-xl border border-dashed border-slate-700 text-slate-500 hover:text-white hover:border-slate-500 transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                + Add League
              </button>
            )}

            {tier !== 'pro' && leagues.length >= 1 && !showAdd && (
              <p className="text-xs text-slate-600 text-center">Upgrade to Pro to save unlimited leagues</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
