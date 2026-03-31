import { useState, useEffect } from 'react';
import { Loader2, Trash2, Star } from 'lucide-react';
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

const SPORT_BADGE: Record<string, { label: string; cls: string }> = {
  nfl: { label: 'NFL', cls: 'text-green-400 bg-green-500/10 border-green-500/30' },
  mlb: { label: 'MLB', cls: 'text-red-400 bg-red-500/10 border-red-500/30' },
  fpl: { label: 'FPL', cls: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
  ipl: { label: 'IPL', cls: 'text-orange-400 bg-orange-500/10 border-orange-500/30' },
};
const PLATFORM_LABEL: Record<string, string> = { sleeper: 'Sleeper', espn: 'ESPN', fpl: 'FPL', yahoo: 'Yahoo' };

function AddLeagueForm({ onAdd, onCancel }: { onAdd: (l: SavedLeague) => void; onCancel: () => void }) {
  const [sport, setSport] = useState('nfl');
  const [platform, setPlatform] = useState('sleeper');

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
    <div className="card-base p-5 border-l-4 border-l-indigo-500/60">
      <p className="text-sm font-display font-bold text-white mb-4">Add League</p>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider">Sport</label>
            <select value={sport} onChange={e => handleSportChange(e.target.value)}
              className="input-base mt-1">
              <option value="nfl">NFL</option>
              <option value="mlb">MLB</option>
              <option value="fpl">FPL</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider">Platform</label>
            <select value={platform} onChange={e => setPlatform(e.target.value)}
              className="input-base mt-1"
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
          className="input-base" />
        <input value={rosterId} onChange={e => setRosterId(e.target.value)} placeholder="Your Roster ID (optional)"
          className="input-base" />
        <input value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Team Name (optional)"
          className="input-base" />
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={!leagueId || saving}
            className="flex-1 py-2 rounded-xl font-display font-bold text-sm bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black disabled:opacity-40 transition-all shadow-lg shadow-amber-500/20">
            {saving ? 'Saving...' : 'Save League'}
          </button>
          <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white border border-white/[0.08] hover:border-white/15 transition-colors">
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
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    getSavedLeagues()
      .then(d => { setLeagues(d.leagues); setTier(d.tier); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleSetPrimary(id: number) {
    const prev = leagues;
    setLeagues(prev => prev.map(l => ({ ...l, is_primary: l.id === id ? 1 : 0 })));
    try {
      await updateLeague(id, { is_primary: true });
    } catch {
      setLeagues(prev);
      setActionError('Failed to update primary league.');
    }
  }

  async function handleDelete(id: number) {
    const prev = leagues;
    setLeagues(prev => prev.filter(l => l.id !== id));
    try {
      await deleteLeague(id);
    } catch {
      setLeagues(prev);
      setActionError('Failed to delete league.');
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/5 flex-shrink-0">
        <h1 className="text-xl font-display font-black bg-gradient-to-r from-white via-blue-100 to-indigo-300 bg-clip-text text-transparent">
          My Leagues
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          {tier === 'pro' ? 'Unlimited leagues' : 'Free tier: 1 league — upgrade for unlimited'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {actionError && <p className="text-rose-400 text-sm mb-3">{actionError}</p>}

        {loading && (
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Loader2 size={14} className="animate-spin text-indigo-400" /> Loading...
          </div>
        )}

        {!loading && (
          <div className="max-w-2xl flex flex-col gap-4">
            {/* League cards */}
            {leagues.map(league => {
              const badge = SPORT_BADGE[league.sport];
              return (
                <div key={league.id} className={`card-base p-5 ${league.is_primary ? 'border-l-4 border-l-indigo-500/70' : ''}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {badge && (
                        <span className={`text-[10px] font-display font-bold px-2 py-1 rounded-lg border ${badge.cls}`}>{badge.label}</span>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-white text-sm truncate">{league.team_name ?? `League ${league.league_id}`}</p>
                          {league.is_primary === 1 && (
                            <span className="text-[9px] font-display font-bold bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded-full flex-shrink-0">PRIMARY</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">{PLATFORM_LABEL[league.platform]} · {league.sport.toUpperCase()} · {league.scoring_format}</p>
                        <p className="text-xs text-slate-600 mt-0.5">ID: {league.league_id}{league.roster_id ? ` · Roster: ${league.roster_id}` : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {league.is_primary !== 1 && (
                        <button onClick={() => handleSetPrimary(league.id)}
                          className="text-xs text-slate-500 hover:text-indigo-400 transition-colors px-2 py-1 rounded-lg hover:bg-indigo-500/10 flex items-center gap-1">
                          <Star size={12} /> Primary
                        </button>
                      )}
                      <button onClick={() => handleDelete(league.id)}
                        className="text-xs text-slate-600 hover:text-rose-400 transition-colors px-2 py-1 rounded-lg hover:bg-rose-500/10 flex items-center gap-1">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

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
                className="w-full py-3 rounded-xl border border-dashed border-white/10 hover:border-white/20 text-slate-500 hover:text-white transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
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
