import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, NavLink, Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeftRight, ClipboardList, RefreshCw, Inbox, Target, Medal,
  Telescope, FolderOpen, Settings, Bell, Trophy, Zap, MoreHorizontal,
} from 'lucide-react';
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
import { setTokenGetter, setClerkReadyGate, openBillingPortal } from './lib/api.ts';
import type { Sport } from './types/index.ts';

const SPORTS: { id: Sport; label: string; color: string }[] = [
  { id: 'nfl', label: 'NFL', color: 'text-green-400 border-green-500/30 bg-green-500/10' },
  { id: 'mlb', label: 'MLB', color: 'text-red-400 border-red-500/30 bg-red-500/10' },
  { id: 'fpl', label: 'FPL', color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' },
  { id: 'ipl', label: 'IPL', color: 'text-orange-400 border-orange-500/30 bg-orange-500/10' },
];

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

// Wires Clerk session token into the Axios client
function AuthSync() {
  const { getToken, isLoaded } = useAuth();
  const resolveRef = useRef<(() => void) | null>(null);
  const readyPromise = useRef(new Promise<void>(r => { resolveRef.current = r; }));

  useEffect(() => {
    setClerkReadyGate(readyPromise.current);
  }, []);

  useEffect(() => {
    if (isLoaded) resolveRef.current?.();
  }, [isLoaded]);

  useEffect(() => {
    setTokenGetter(() => getToken());
  }, [getToken]);

  return null;
}

// ─── Desktop Sidebar ────────────────────────────────────────────────────────
function Sidebar({ onUpgrade }: { onUpgrade: () => void }) {
  const { config, setSport } = useLeague();
  const { user } = useUser();
  const tier = (user?.publicMetadata?.tier as string) ?? 'free';
  const isPro = tier === 'pro';

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 border-l-2 pl-[10px] ${
      isActive
        ? 'bg-gradient-to-r from-indigo-600/25 to-violet-600/10 text-white border-indigo-400'
        : 'text-slate-400 hover:text-white hover:bg-white/5 border-transparent'
    }`;

  return (
    <aside className="hidden md:flex w-60 flex-shrink-0 border-r border-white/5 bg-slate-950/90 backdrop-blur-xl flex-col">
      <div className="px-4 py-5 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30 flex-shrink-0">
            <Trophy size={16} className="text-white" />
          </div>
          <span className="font-display font-black text-base bg-gradient-to-r from-white via-blue-100 to-indigo-300 bg-clip-text text-transparent text-glow-blue">
            FantasyRater
          </span>
        </div>
      </div>

      <div className="px-3 pt-4 pb-2">
        <p className="text-[10px] text-slate-600 uppercase tracking-widest px-1 mb-2 font-bold">Sport</p>
        <div className="grid grid-cols-2 gap-1.5">
          {SPORTS.map(s => (
            <button
              key={s.id}
              onClick={() => setSport(s.id)}
              className={`px-2 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                config.sport === s.id
                  ? s.color
                  : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <nav className="px-3 pt-2 flex flex-col gap-0.5 overflow-y-auto">
        <p className="text-[10px] text-slate-600 uppercase tracking-widest px-1 mb-1 mt-2 font-bold">Tools</p>
        <NavLink to="/" end className={linkClass}><ArrowLeftRight size={16} className="flex-shrink-0" /> Trade Rater</NavLink>
        <NavLink to="/team" className={linkClass}><ClipboardList size={16} className="flex-shrink-0" /> Team Rater</NavLink>
        <NavLink to="/startsit" className={linkClass}><RefreshCw size={16} className="flex-shrink-0" /> Start/Sit</NavLink>
        <NavLink to="/waiver" className={linkClass}>
          <Inbox size={16} className="flex-shrink-0" /> Waiver Wire
          {!isPro && <span className="ml-auto text-[9px] bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded-full font-bold">PRO</span>}
        </NavLink>
        <NavLink to="/draft" className={linkClass}>
          <Target size={16} className="flex-shrink-0" /> Draft
          {!isPro && <span className="ml-auto text-[9px] bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded-full font-bold">PRO</span>}
        </NavLink>
        <NavLink to="/rankings" className={linkClass}><Medal size={16} className="flex-shrink-0" /> Rankings</NavLink>
        <NavLink to="/predictor" className={linkClass}>
          <Telescope size={16} className="flex-shrink-0" /> League Predictor
          {!isPro && <span className="ml-auto text-[9px] bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded-full font-bold">PRO</span>}
        </NavLink>
        <p className="text-[10px] text-slate-600 uppercase tracking-widest px-1 mb-1 mt-3 font-bold">Account</p>
        <NavLink to="/leagues" className={linkClass}><FolderOpen size={16} className="flex-shrink-0" /> My Leagues</NavLink>
        <NavLink to="/league" className={linkClass}><Settings size={16} className="flex-shrink-0" /> League Setup</NavLink>
        <NavLink to="/settings" className={linkClass}><Bell size={16} className="flex-shrink-0" /> Notifications</NavLink>
      </nav>

      <div className="mt-auto px-3 pt-3 pb-1 flex flex-col gap-2">
        <SignedOut>
          <SignInButton mode="modal">
            <button className="w-full py-2 text-sm text-slate-400 hover:text-white border border-white/10 hover:border-white/20 rounded-xl transition-colors">
              Sign In
            </button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          {!isPro && (
            <button
              onClick={onUpgrade}
              className="w-full py-2 text-sm font-bold text-black bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 rounded-xl shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all flex items-center justify-center gap-1.5"
            >
              <Zap size={14} /> Upgrade to Pro
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

      <div className="px-3 py-4 border-t border-white/5">
        <div className="card-base p-3 border-l-4 border-l-indigo-500/40">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-bold">League</p>
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

// ─── Mobile Header ───────────────────────────────────────────────────────────
function MobileHeader({ onMenuOpen }: { onMenuOpen: () => void }) {
  const { config, setSport } = useLeague();
  const { user } = useUser();
  const tier = (user?.publicMetadata?.tier as string) ?? 'free';
  const isPro = tier === 'pro';

  return (
    <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-2.5 bg-slate-950/95 backdrop-blur-md border-b border-white/5">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          <Trophy size={14} className="text-white" />
        </div>
        <span className="font-display font-black text-sm bg-gradient-to-r from-white via-blue-100 to-indigo-300 bg-clip-text text-transparent">
          FantasyRater
        </span>
        {isPro && <span className="text-[9px] bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded-full font-bold">PRO</span>}
      </div>
      <div className="flex items-center gap-2">
        <select
          value={config.sport}
          onChange={e => setSport(e.target.value as Sport)}
          className="bg-slate-900 text-white border border-white/10 rounded-xl px-2 py-1.5 text-xs font-bold focus:outline-none focus:border-indigo-500/60"
        >
          <option value="nfl">NFL</option>
          <option value="mlb">MLB</option>
          <option value="fpl">FPL</option>
          <option value="ipl">IPL</option>
        </select>
        <button
          onClick={onMenuOpen}
          className="w-9 h-9 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
        >
          <SignedIn>
            <UserButton />
          </SignedIn>
          <SignedOut>
            <MoreHorizontal size={18} />
          </SignedOut>
        </button>
      </div>
    </header>
  );
}

// ─── Mobile Bottom Nav ────────────────────────────────────────────────────────
function BottomNav({ onMoreOpen }: { onMoreOpen: () => void }) {
  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-bold transition-colors ${
      isActive ? 'text-indigo-400' : 'text-slate-600 active:text-slate-400'
    }`;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-white/5 flex items-stretch safe-bottom" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <NavLink to="/" end className={tabClass}>
        <ArrowLeftRight size={20} />
        Trade
      </NavLink>
      <NavLink to="/team" className={tabClass}>
        <ClipboardList size={20} />
        Team
      </NavLink>
      <NavLink to="/startsit" className={tabClass}>
        <RefreshCw size={20} />
        Start/Sit
      </NavLink>
      <NavLink to="/rankings" className={tabClass}>
        <Medal size={20} />
        Rankings
      </NavLink>
      <button
        onClick={onMoreOpen}
        className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-bold text-slate-600 active:text-slate-400 transition-colors"
      >
        <MoreHorizontal size={20} />
        More
      </button>
    </nav>
  );
}

// ─── Mobile Slide-up Menu ────────────────────────────────────────────────────
function MobileMenu({ open, onClose, onUpgrade }: { open: boolean; onClose: () => void; onUpgrade: () => void }) {
  const { user } = useUser();
  const tier = (user?.publicMetadata?.tier as string) ?? 'free';
  const isPro = tier === 'pro';
  const navigate = useNavigate();

  function go(path: string) {
    navigate(path);
    onClose();
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950 rounded-t-3xl border-t border-white/5" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-white/15 rounded-full" />
        </div>

        <div className="px-4 py-3 space-y-1">
          <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold px-2 pb-1">More Tools</p>
          <button onClick={() => go('/waiver')} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-300 hover:bg-white/5 active:bg-white/5 transition-colors text-sm font-medium">
            <Inbox size={18} className="text-slate-400" />
            <span>Waiver Wire</span>
            {!isPro && <span className="ml-auto text-[9px] bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded-full font-bold">PRO</span>}
          </button>
          <button onClick={() => go('/draft')} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-300 hover:bg-white/5 active:bg-white/5 transition-colors text-sm font-medium">
            <Target size={18} className="text-slate-400" />
            <span>Draft Assistant</span>
            {!isPro && <span className="ml-auto text-[9px] bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded-full font-bold">PRO</span>}
          </button>
          <button onClick={() => go('/predictor')} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-300 hover:bg-white/5 active:bg-white/5 transition-colors text-sm font-medium">
            <Telescope size={18} className="text-slate-400" />
            <span>League Predictor</span>
            {!isPro && <span className="ml-auto text-[9px] bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded-full font-bold">PRO</span>}
          </button>

          <div className="h-px bg-white/5 my-2" />

          <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold px-2 pb-1">Account</p>
          <button onClick={() => go('/leagues')} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-300 hover:bg-white/5 transition-colors text-sm font-medium">
            <FolderOpen size={18} className="text-slate-400" /> My Leagues
          </button>
          <button onClick={() => go('/league')} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-300 hover:bg-white/5 transition-colors text-sm font-medium">
            <Settings size={18} className="text-slate-400" /> League Setup
          </button>
          <button onClick={() => go('/settings')} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-300 hover:bg-white/5 transition-colors text-sm font-medium">
            <Bell size={18} className="text-slate-400" /> Notifications
          </button>

          <div className="h-px bg-white/5 my-2" />

          <SignedOut>
            <SignInButton mode="modal">
              <button onClick={onClose} className="w-full py-3 text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl transition-all">
                Sign In
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <div className="flex items-center gap-3 px-3 py-2">
              <UserButton />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress ?? 'My Account'}</p>
                <p className="text-xs text-slate-500">{isPro ? 'Pro member' : 'Free plan'}</p>
              </div>
              {isPro && (
                <button onClick={() => { openBillingPortal(); onClose(); }} className="text-xs text-slate-500 hover:text-slate-300">
                  Manage
                </button>
              )}
            </div>
            {!isPro && (
              <button
                onClick={() => { onUpgrade(); onClose(); }}
                className="w-full py-3 text-sm font-bold text-black bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5"
              >
                <Zap size={14} /> Upgrade to Pro
              </button>
            )}
          </SignedIn>
        </div>
      </div>
    </>
  );
}

// ─── Page Routes with transitions ───────────────────────────────────────────
function AppRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<motion.div className="h-full" variants={pageVariants} initial="initial" animate="animate" exit="exit"><TradeRater /></motion.div>} />
        <Route path="/team" element={<motion.div className="h-full" variants={pageVariants} initial="initial" animate="animate" exit="exit"><TeamRater /></motion.div>} />
        <Route path="/rankings" element={<motion.div className="h-full" variants={pageVariants} initial="initial" animate="animate" exit="exit"><PlayerRankings /></motion.div>} />
        <Route path="/predictor" element={<motion.div className="h-full" variants={pageVariants} initial="initial" animate="animate" exit="exit"><LeaguePredictor /></motion.div>} />
        <Route path="/league" element={<motion.div className="h-full" variants={pageVariants} initial="initial" animate="animate" exit="exit"><LeagueSetup /></motion.div>} />
        <Route path="/startsit" element={<motion.div className="h-full" variants={pageVariants} initial="initial" animate="animate" exit="exit"><StartSit /></motion.div>} />
        <Route path="/waiver" element={<motion.div className="h-full" variants={pageVariants} initial="initial" animate="animate" exit="exit"><WaiverWire /></motion.div>} />
        <Route path="/draft" element={<motion.div className="h-full" variants={pageVariants} initial="initial" animate="animate" exit="exit"><DraftAssistant /></motion.div>} />
        <Route path="/leagues" element={<motion.div className="h-full" variants={pageVariants} initial="initial" animate="animate" exit="exit"><MultiLeague /></motion.div>} />
        <Route path="/settings" element={<motion.div className="h-full" variants={pageVariants} initial="initial" animate="animate" exit="exit"><NotificationSettings /></motion.div>} />
      </Routes>
    </AnimatePresence>
  );
}

// ─── Root App ────────────────────────────────────────────────────────────────
export default function App() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'upgrade' | 'login'>('upgrade');
  const [menuOpen, setMenuOpen] = useState(false);

  useUpgradeModal(setModalOpen, setModalMode);

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
        <MobileMenu
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          onUpgrade={() => { setModalMode('upgrade'); setModalOpen(true); }}
        />

        <div className="h-screen flex bg-mesh">
          {/* Desktop sidebar */}
          <Sidebar onUpgrade={() => { setModalMode('upgrade'); setModalOpen(true); }} />

          {/* Main area */}
          <div className="flex-1 flex flex-col min-h-0 min-w-0">
            {/* Mobile top header */}
            <MobileHeader onMenuOpen={() => setMenuOpen(true)} />

            {/* Page content */}
            <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
              <AppRoutes />
            </main>

            {/* Mobile bottom nav */}
            <BottomNav onMoreOpen={() => setMenuOpen(true)} />
          </div>
        </div>
      </BrowserRouter>
    </LeagueProvider>
  );
}
