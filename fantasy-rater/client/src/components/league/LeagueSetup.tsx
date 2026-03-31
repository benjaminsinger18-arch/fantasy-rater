import { useState } from 'react';
import { useLeague } from '../../lib/LeagueContext.tsx';
import type { Platform, ScoringFormat } from '../../types/index.ts';

const PLATFORMS: { id: Platform; label: string; desc: string }[] = [
  { id: 'sleeper', label: 'Sleeper', desc: 'Free, no auth required' },
  { id: 'espn', label: 'ESPN', desc: 'Paste your cookies for private leagues' },
  { id: 'yahoo', label: 'Yahoo', desc: 'OAuth login required' },
  { id: 'fpl', label: 'FPL', desc: 'Fantasy Premier League' },
];

const SPORT_PLATFORMS: Record<string, Platform[]> = {
  nfl: ['sleeper', 'espn', 'yahoo'],
  mlb: ['espn'],
  fpl: ['fpl'],
  ipl: ['ipl' as Platform],
};

const NFL_FORMATS: ScoringFormat[] = ['PPR', 'Half-PPR', 'Standard'];
const MLB_FORMATS: ScoringFormat[] = ['H2H Points', 'Roto'];
const FPL_FORMATS: ScoringFormat[] = ['FPL Standard'];

function getMaxWeeks(sport: string): number {
  if (sport === 'fpl') return 38;
  if (sport === 'mlb') return 26;
  if (sport === 'ipl') return 14;
  return 18;
}

function getScoringFormats(sport: string): ScoringFormat[] {
  if (sport === 'mlb') return MLB_FORMATS;
  if (sport === 'fpl') return FPL_FORMATS;
  return NFL_FORMATS;
}

export function LeagueSetup() {
  const { config, setConfig } = useLeague();
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="h-full overflow-y-auto">
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-black bg-gradient-to-r from-white via-blue-100 to-indigo-300 bg-clip-text text-transparent">League Setup</h1>
        <p className="text-slate-400 text-sm mt-1">Configure your league settings for more accurate analysis</p>
      </div>

      {/* Platform */}
      <div className="card-base p-5 space-y-3">
        <h3 className="font-display text-xs font-bold text-slate-400 uppercase tracking-widest">Platform</h3>
        <div className="grid grid-cols-2 gap-2">
          {PLATFORMS.filter(p => (SPORT_PLATFORMS[config.sport] ?? []).includes(p.id)).map(p => (
            <button
              key={p.id}
              onClick={() => setConfig({ platform: p.id })}
              className={`text-left p-3 rounded-xl border transition-all ${
                config.platform === p.id
                  ? 'border-indigo-500/60 bg-indigo-500/15 text-white'
                  : 'border-white/[0.08] bg-slate-900/60 text-slate-300 hover:border-white/15 hover:text-white'
              }`}
            >
              <div className="font-medium text-sm">{p.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{p.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* League ID */}
      {config.platform !== 'yahoo' && (
        <div className="card-base p-5 space-y-3">
          <h3 className="font-display text-xs font-bold text-slate-400 uppercase tracking-widest">
            {config.platform === 'fpl' ? 'Manager ID' : 'League ID'}
          </h3>
          <input
            type="text"
            value={config.leagueId}
            onChange={e => setConfig({ leagueId: e.target.value })}
            placeholder={config.platform === 'fpl' ? 'e.g. 123456' : 'Paste your league ID'}
            className="input-base"
          />
        </div>
      )}

      {/* ESPN cookies */}
      {config.platform === 'espn' && (
        <div className="card-base p-5 space-y-3">
          <h3 className="font-display text-xs font-bold text-slate-400 uppercase tracking-widest">ESPN Cookies (Private Leagues)</h3>
          <details className="text-xs text-slate-500">
            <summary className="cursor-pointer text-slate-400 hover:text-white">How to find your cookies</summary>
            <ol className="mt-2 space-y-1 ml-4 list-decimal">
              <li>Open ESPN Fantasy in your browser</li>
              <li>Open DevTools (F12) → Application → Cookies → fantasy.espn.com</li>
              <li>Copy the values for <code className="bg-slate-800 px-1 rounded">espn_s2</code> and <code className="bg-slate-800 px-1 rounded">SWID</code></li>
            </ol>
          </details>
          <input
            type="password"
            value={config.espnS2 ?? ''}
            onChange={e => setConfig({ espnS2: e.target.value })}
            placeholder="espn_s2 cookie value"
            className="input-base"
          />
          <input
            type="text"
            value={config.swid ?? ''}
            onChange={e => setConfig({ swid: e.target.value })}
            placeholder="SWID cookie value (e.g. {XXXXXXXX-XXXX-...})"
            className="input-base"
          />
        </div>
      )}

      {/* Yahoo OAuth */}
      {config.platform === 'yahoo' && (
        <div className="card-base p-5 space-y-3">
          <h3 className="font-display text-xs font-bold text-slate-400 uppercase tracking-widest">Yahoo Authentication</h3>
          {config.yahooSessionId ? (
            <div className="flex items-center gap-2 text-emerald-400 text-sm">
              <span>✓</span> Connected to Yahoo Fantasy
              <button onClick={() => setConfig({ yahooSessionId: undefined })} className="ml-auto text-slate-500 hover:text-rose-400 text-xs">Disconnect</button>
            </div>
          ) : (
            <a
              href="/api/auth/yahoo"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-bold rounded-xl transition-all"
            >
              Connect Yahoo Account
            </a>
          )}
        </div>
      )}

      {/* Scoring settings */}
      <div className="card-base p-5 space-y-4">
        <h3 className="font-display text-xs font-bold text-slate-400 uppercase tracking-widest">League Settings</h3>

        <div>
          <label className="text-xs text-slate-500 block mb-1">Scoring Format</label>
          <select
            value={config.scoringFormat}
            onChange={e => setConfig({ scoringFormat: e.target.value as ScoringFormat })}
            className="input-base"
          >
            {getScoringFormats(config.sport).map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-slate-500 block mb-1">League Size</label>
            <input
              type="number"
              min={4} max={20}
              value={config.leagueSize}
              onChange={e => setConfig({ leagueSize: Number(e.target.value) })}
              className="input-base"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Current Week</label>
            <input
              type="number"
              min={1} max={getMaxWeeks(config.sport)}
              value={config.currentWeek}
              onChange={e => setConfig({ currentWeek: Number(e.target.value) })}
              className="input-base"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Weeks Left</label>
            <input
              type="number"
              min={1} max={getMaxWeeks(config.sport)}
              value={config.weeksRemaining}
              onChange={e => setConfig({ weeksRemaining: Number(e.target.value) })}
              className="input-base"
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-display font-bold rounded-xl transition-all shadow-lg shadow-amber-500/25"
      >
        {saved ? '✓ Saved!' : 'Save Settings'}
      </button>
    </div>
    </div>
  );
}
