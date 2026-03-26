import { useState } from 'react';
import { useLeague } from '../../lib/LeagueContext.tsx';
import type { Platform, ScoringFormat } from '../../types/index.ts';

const PLATFORMS: { id: Platform; label: string; desc: string }[] = [
  { id: 'sleeper', label: 'Sleeper', desc: 'Free, no auth required' },
  { id: 'espn', label: 'ESPN', desc: 'Paste your cookies for private leagues' },
  { id: 'yahoo', label: 'Yahoo', desc: 'OAuth login required' },
  { id: 'fpl', label: 'FPL', desc: 'Fantasy Premier League' },
];

const NFL_FORMATS: ScoringFormat[] = ['PPR', 'Half-PPR', 'Standard'];
const MLB_FORMATS: ScoringFormat[] = ['H2H Points', 'Roto'];
const FPL_FORMATS: ScoringFormat[] = ['FPL Standard'];

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
        <h1 className="text-2xl font-bold text-white">League Setup</h1>
        <p className="text-gray-400 text-sm mt-1">Configure your league settings for more accurate analysis</p>
      </div>

      {/* Platform */}
      <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 space-y-3">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Platform</h3>
        <div className="grid grid-cols-2 gap-2">
          {PLATFORMS.map(p => (
            <button
              key={p.id}
              onClick={() => setConfig({ platform: p.id })}
              className={`text-left p-3 rounded-lg border transition-all ${
                config.platform === p.id
                  ? 'border-green-500 bg-green-500/10 text-white'
                  : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'
              }`}
            >
              <div className="font-medium text-sm">{p.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{p.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* League ID */}
      {config.platform !== 'yahoo' && (
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 space-y-3">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            {config.platform === 'fpl' ? 'Manager ID' : 'League ID'}
          </h3>
          <input
            type="text"
            value={config.leagueId}
            onChange={e => setConfig({ leagueId: e.target.value })}
            placeholder={config.platform === 'fpl' ? 'e.g. 123456' : 'Paste your league ID'}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
          />
        </div>
      )}

      {/* ESPN cookies */}
      {config.platform === 'espn' && (
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 space-y-3">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">ESPN Cookies (Private Leagues)</h3>
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer text-gray-400 hover:text-white">How to find your cookies</summary>
            <ol className="mt-2 space-y-1 ml-4 list-decimal">
              <li>Open ESPN Fantasy in your browser</li>
              <li>Open DevTools (F12) → Application → Cookies → fantasy.espn.com</li>
              <li>Copy the values for <code className="bg-gray-800 px-1 rounded">espn_s2</code> and <code className="bg-gray-800 px-1 rounded">SWID</code></li>
            </ol>
          </details>
          <input
            type="password"
            value={config.espnS2 ?? ''}
            onChange={e => setConfig({ espnS2: e.target.value })}
            placeholder="espn_s2 cookie value"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
          />
          <input
            type="text"
            value={config.swid ?? ''}
            onChange={e => setConfig({ swid: e.target.value })}
            placeholder="SWID cookie value (e.g. {XXXXXXXX-XXXX-...})"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
          />
        </div>
      )}

      {/* Yahoo OAuth */}
      {config.platform === 'yahoo' && (
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 space-y-3">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Yahoo Authentication</h3>
          {config.yahooSessionId ? (
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <span>✓</span> Connected to Yahoo Fantasy
              <button onClick={() => setConfig({ yahooSessionId: undefined })} className="ml-auto text-gray-500 hover:text-red-400 text-xs">Disconnect</button>
            </div>
          ) : (
            <a
              href="/api/auth/yahoo"
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Connect Yahoo Account
            </a>
          )}
        </div>
      )}

      {/* Scoring settings */}
      <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 space-y-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">League Settings</h3>

        <div>
          <label className="text-xs text-gray-400 block mb-1">Scoring Format</label>
          <select
            value={config.scoringFormat}
            onChange={e => setConfig({ scoringFormat: e.target.value as ScoringFormat })}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
          >
            {getScoringFormats(config.sport).map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">League Size</label>
            <input
              type="number"
              min={4} max={20}
              value={config.leagueSize}
              onChange={e => setConfig({ leagueSize: Number(e.target.value) })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Current Week</label>
            <input
              type="number"
              min={1} max={38}
              value={config.currentWeek}
              onChange={e => setConfig({ currentWeek: Number(e.target.value) })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Weeks Left</label>
            <input
              type="number"
              min={1} max={38}
              value={config.weeksRemaining}
              onChange={e => setConfig({ weeksRemaining: Number(e.target.value) })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors"
      >
        {saved ? '✓ Saved!' : 'Save Settings'}
      </button>
    </div>
    </div>
  );
}
