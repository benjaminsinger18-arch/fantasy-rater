import { useState, useEffect } from 'react';
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import { SignedIn, SignedOut, SignInButton, UserButton, useAuth, useUser } from '@clerk/clerk-react';
import { LeagueProvider, useLeague } from './lib/LeagueContext.tsx';
import { TradeRater } from './components/trade/TradeRater.tsx';
import { TeamRater } from './components/team/TeamRater.tsx';
import { LeagueSetup } from './components/league/LeagueSetup.tsx';
import { LeaguePredictor } from './components/league/LeaguePredictor.tsx';
import { PlayerRankings } from './components/rankings/PlayerRankings.tsx';
import { StartSit } from './components/startsit/StartSit.tsx';
import { WaiverWire } from './components/waiver/WaiverWire.tsx';
import { DraftAssistant } from './components/draft/DraftAssistant.tsx';
import { MultiLeague } from './components/league/MultiLeague.tsx';
import { NotificationSettings } from './components/settings/NotificationSettings.tsx';
import { UpgradeModal, useUpgradeModal } from './components/shared/UpgradeModal.tsx';
import { setTokenGetter, openBillingPortal } from './lib/api.ts';
import type { Sport } from './types/index.ts';

const SPORTS: { id: Sport; emoji: string; label: string; activeClass: string }[] = [
  { id: 'nfl', emoji: '🏈', label: 'NFL', activeClass: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30' },
  { id: 'mlb', emoji: '⚾', label: 'MLB', activeClass: 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg shadow-blue-500/30' },
  { id: 'fpl', emoji: '⚽', label: 'FPL', activeClass: 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30' },
];

// Wires Clerk session token into the Axios client
function AuthSync() {
  const { getToken } = useAuth();
  useEffect(() => {
    setTokenGetter(() => getToken());
  }, [getToken]);
  return null;
}

function Sidebar({ onUpgrade }: { onUpgrade: () => void }) {
  const { config, setSport } = useLeague();
  const { user } = useUser();
  const tier = (user?.publicMetadata?.tier as string) ?? 'free';
  const isPro = tier === 'pro';

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
      isActive
        ? 'bg-gradient-to-r from-indigo-500/20 to-violet-500/10 text-indigo-300 border border-indigo-500/30'
        : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
    }`;

  return (
    <aside className="w-56 flex-shrink-0 border-r border-slate-700/50 bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-sm">
            🏆
          </div>
          <span className="font-black text-base bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            FantasyRater
          </span>
        </div>
      </div>

      {/* Sport selector */}
      <div className="px-3 pt-4 pb-2">
        <p className="text-xs text-slate-600 uppercase tracking-wider px-1 mb-2 font-semibold">Sport</p>
        <div className="flex gap-1">
          {SPORTS.map(s => (
            <button
              key={s.id}
              onClick={() => setSport(s.id)}
              title={s.label}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                config.sport === s.id
                  ? s.activeClass
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {s.emoji}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500 text-center mt-1.5 font-medium">
          {SPORTS.find(s => s.id === config.sport)?.label}
        </p>
      </div>

      {/* Nav links */}
      <nav className="px-3 pt-2 flex flex-col gap-1 overflow-y-auto">
        <p className="text-xs text-slate-600 uppercase tracking-wider px-1 mb-1 mt-2 font-semibold">Tools</p>
        <NavLink to="/" end className={linkClass}>
          <span className="text-base">⇄</span> Trade Rater
        </NavLink>
        <NavLink to="/team" className={linkClass}>
          <span className="text-base">📋</span> Team Rater
        </NavLink>
        <NavLink to="/startsit" className={linkClass}>
          <span className="text-base">🔄</span> Start/Sit
        </NavLink>
        <NavLink to="/waiver" className={linkClass}>
          <span className="text-base">📥</span> Waiver Wire
          {!isPro && <span className="ml-auto text-[9px] bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded-full font-bold">PRO</span>}
        </NavLink>
        <NavLink to="/draft" className={linkClass}>
          <span className="text-base">🎯</span> Draft
          {!isPro && <span className="ml-auto text-[9px] bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded-full font-bold">PRO</span>}
        </NavLink>
        <NavLink to="/rankings" className={linkClass}>
          <span className="text-base">🏅</span> Rankings
        </NavLink>
        <NavLink to="/predictor" className={linkClass}>
          <span className="text-base">🔮</span> League Predictor
          {!isPro && <span className="ml-auto text-[9px] bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded-full font-bold">PRO</span>}
        </NavLink>
        <p className="text-xs text-slate-600 uppercase tracking-wider px-1 mb-1 mt-3 font-semibold">Account</p>
        <NavLink to="/leagues" className={linkClass}>
          <span className="text-base">🗂️</span> My Leagues
        </NavLink>
        <NavLink to="/league" className={linkClass}>
          <span className="text-base">⚙️</span> League Setup
        </NavLink>
        <NavLink to="/settings" className={linkClass}>
          <span className="text-base">🔔</span> Notifications
        </NavLink>
      </nav>

      {/* Auth + upgrade */}
      <div className="mt-auto px-3 pt-3 pb-1 flex flex-col gap-2">
        <SignedOut>
          <SignInButton mode="modal">
            <button className="w-full py-2 text-sm text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 rounded-lg transition-colors">
              Sign In
            </button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          {!isPro && (
            <button
              onClick={onUpgrade}
              className="w-full py-2 text-sm font-bold text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 hover:border-violet-500/50 rounded-lg transition-all"
            >
              ⚡ Upgrade to Pro
            </button>
          )}
          <div className="flex items-center gap-2 px-1 py-1">
            <UserButton />
            <div className="flex flex-col min-w-0">
              <span className="text-slate-300 text-xs font-medium truncate">{user?.firstName ?? 'My Account'}</span>
              {isPro && <span className="text-violet-400 text-[10px] font-bold">PRO</span>}
            </div>
            {isPro && (
              <button onClick={() => openBillingPortal()} className="ml-auto text-slate-600 hover:text-slate-400 text-xs transition-colors">
                Manage
              </button>
            )}
          </div>
        </SignedIn>
      </div>

      {/* League summary */}
      <div className="px-3 py-4 border-t border-slate-700/50">
        <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-700/40">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-semibold">League</p>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Format</span>
              <span className="text-slate-200 font-medium">{config.scoringFormat}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Teams</span>
              <span className="text-slate-200 font-medium">{config.leagueSize}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Week</span>
              <span className="text-slate-200 font-medium">{config.currentWeek}</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default function App() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'upgrade' | 'login'>('upgrade');

  useUpgradeModal(setModalOpen, setModalMode);

  // Auto-open upgrade modal if Stripe checkout succeeded
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') {
      window.history.replaceState({}, '', '/');
    }
  }, []);

  return (
    <LeagueProvider>
      <BrowserRouter>
        <AuthSync />
        <UpgradeModal open={modalOpen} mode={modalMode} onClose={() => setModalOpen(false)} />
        <div className="h-screen flex" style={{ backgroundColor: '#020617' }}>
          <Sidebar onUpgrade={() => { setModalMode('upgrade'); setModalOpen(true); }} />
          <main className="flex-1 h-full overflow-y-auto">
            <Routes>
              <Route path="/" element={<TradeRater />} />
              <Route path="/team" element={<TeamRater />} />
              <Route path="/rankings" element={<PlayerRankings />} />
              <Route path="/predictor" element={<LeaguePredictor />} />
              <Route path="/league" element={<LeagueSetup />} />
              <Route path="/startsit" element={<StartSit />} />
              <Route path="/waiver" element={<WaiverWire />} />
              <Route path="/draft" element={<DraftAssistant />} />
              <Route path="/leagues" element={<MultiLeague />} />
              <Route path="/settings" element={<NotificationSettings />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </LeagueProvider>
  );
}
