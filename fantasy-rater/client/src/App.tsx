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

const SPORTS: { id: Sport; label: string }[] = [
  { id: 'nfl', label: 'NFL' },
  { id: 'mlb', label: 'MLB' },
  { id: 'fpl', label: 'FPL' },
  { id: 'ipl', label: 'IPL' },
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
    `flex items-center gap-3 px-3 py-2 text-xs transition-all duration-150 border-l-2 font-mono tracking-wider uppercase ${
      isActive
        ? 'text-[#F2EFE8] border-[#E8321A] bg-[#E8321A]/5'
        : 'text-[#555555] hover:text-[#8A8A8A] border-transparent'
    }`;

  return (
    <aside className="hidden md:flex w-52 flex-shrink-0 border-r border-[#2A2A2A] bg-[#0A0A0A] flex-col">
      <div className="px-4 py-4 border-b border-[#2A2A2A]">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 border-2 border-[#E8321A] flex items-center justify-center flex-shrink-0">
            <Trophy size={11} className="text-[#E8321A]" />
          </div>
          <span className="font-display text-lg font-black tracking-widest text-[#F2EFE8] uppercase">
            FantasyRater
          </span>
        </div>
      </div>

      <div className="px-3 pt-4 pb-2">
        <p className="text-[9px] text-[#333333] uppercase tracking-widest px-1 mb-2 font-mono font-bold">Sport</p>
        <div className="grid grid-cols-2 gap-1">
          {SPORTS.map(s => (
            <button
              key={s.id}
              onClick={() => setSport(s.id)}
              className={`px-2 py-1.5 text-[11px] font-mono font-bold border transition-all tracking-wider ${
                config.sport === s.id
                  ? 'border-[#E8321A] text-[#E8321A] bg-[#E8321A]/5'
                  : 'text-[#555555] border-[#2A2A2A] hover:text-[#8A8A8A] hover:border-[#3A3A3A]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <nav className="px-3 pt-2 flex flex-col gap-0.5 overflow-y-auto">
        <p className="text-[9px] text-[#333333] uppercase tracking-widest px-1 mb-1 mt-2 font-mono font-bold">Tools</p>
        <NavLink to="/" end className={linkClass}><ArrowLeftRight size={13} className="flex-shrink-0" /> Trade Rater</NavLink>
        <NavLink to="/team" className={linkClass}><ClipboardList size={13} className="flex-shrink-0" /> Team Rater</NavLink>
        <NavLink to="/startsit" className={linkClass}><RefreshCw size={13} className="flex-shrink-0" /> Start/Sit</NavLink>
        <NavLink to="/waiver" className={linkClass}>
          <Inbox size={13} className="flex-shrink-0" /> Waiver Wire
          {!isPro && <span className="ml-auto text-[9px] border border-[#E8321A]/40 text-[#E8321A] px-1 py-px font-mono font-bold">PRO</span>}
        </NavLink>
        <NavLink to="/draft" className={linkClass}>
          <Target size={13} className="flex-shrink-0" /> Draft
          {!isPro && <span className="ml-auto text-[9px] border border-[#E8321A]/40 text-[#E8321A] px-1 py-px font-mono font-bold">PRO</span>}
        </NavLink>
        <NavLink to="/rankings" className={linkClass}><Medal size={13} className="flex-shrink-0" /> Rankings</NavLink>
        <NavLink to="/predictor" className={linkClass}>
          <Telescope size={13} className="flex-shrink-0" /> League Predictor
          {!isPro && <span className="ml-auto text-[9px] border border-[#E8321A]/40 text-[#E8321A] px-1 py-px font-mono font-bold">PRO</span>}
        </NavLink>
        <p className="text-[9px] text-[#333333] uppercase tracking-widest px-1 mb-1 mt-3 font-mono font-bold">Account</p>
        <NavLink to="/leagues" className={linkClass}><FolderOpen size={13} className="flex-shrink-0" /> My Leagues</NavLink>
        <NavLink to="/league" className={linkClass}><Settings size={13} className="flex-shrink-0" /> League Setup</NavLink>
        <NavLink to="/settings" className={linkClass}><Bell size={13} className="flex-shrink-0" /> Notifications</NavLink>
      </nav>

      <div className="mt-auto px-3 pt-3 pb-1 flex flex-col gap-2">
        <SignedOut>
          <SignInButton mode="modal">
            <button className="w-full py-2 text-xs text-[#8A8A8A] hover:text-[#F2EFE8] border border-[#2A2A2A] hover:border-[#3A3A3A] transition-colors font-mono uppercase tracking-wider">
              Sign In
            </button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          {!isPro && (
            <button
              onClick={onUpgrade}
              className="w-full py-2 text-xs font-mono font-bold text-white bg-[#E8321A] hover:bg-[#C82818] transition-colors flex items-center justify-center gap-1.5 tracking-wider uppercase"
            >
              <Zap size={12} /> Upgrade to Pro
            </button>
          )}
          <div className="flex items-center gap-2 px-1 py-1">
            <UserButton />
            <div className="flex flex-col min-w-0">
              <span className="text-[#8A8A8A] text-xs font-mono truncate">{user?.firstName ?? 'My Account'}</span>
              {isPro && <span className="text-[#E8321A] text-[10px] font-mono font-bold">PRO</span>}
            </div>
            {isPro && (
              <button onClick={() => openBillingPortal()} className="ml-auto text-[#444444] hover:text-[#8A8A8A] text-xs font-mono transition-colors">
                Manage
              </button>
            )}
          </div>
        </SignedIn>
      </div>

      <div className="px-3 py-4 border-t border-[#2A2A2A]">
        <div className="card-base p-3 border-l-4 border-l-[#E8321A]">
          <p className="text-[9px] text-[#444444] uppercase tracking-widest mb-2 font-mono font-bold">League</p>
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-[#555555] text-xs font-mono">Format</span>
              <span className="text-[#F2EFE8] text-xs font-mono font-medium">{config.scoringFormat}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#555555] text-xs font-mono">Teams</span>
              <span className="text-[#F2EFE8] text-xs font-mono font-medium">{config.leagueSize}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#555555] text-xs font-mono">Week</span>
              <span className="text-[#F2EFE8] text-xs font-mono font-medium">{config.currentWeek}</span>
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
    <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-2.5 bg-[#0A0A0A] border-b border-[#2A2A2A]">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 border-2 border-[#E8321A] flex items-center justify-center flex-shrink-0">
          <Trophy size={10} className="text-[#E8321A]" />
        </div>
        <span className="font-display text-base font-black tracking-widest text-[#F2EFE8] uppercase">
          FantasyRater
        </span>
        {isPro && <span className="text-[9px] border border-[#E8321A]/40 text-[#E8321A] px-1 py-px font-mono font-bold">PRO</span>}
      </div>
      <div className="flex items-center gap-2">
        <select
          value={config.sport}
          onChange={e => setSport(e.target.value as Sport)}
          className="bg-[#111111] text-[#F2EFE8] border border-[#2A2A2A] px-2 py-1.5 text-xs font-mono font-bold focus:outline-none focus:border-[#E8321A] tracking-wider"
        >
          <option value="nfl">NFL</option>
          <option value="mlb">MLB</option>
          <option value="fpl">FPL</option>
          <option value="ipl">IPL</option>
        </select>
        <button
          onClick={onMenuOpen}
          className="w-8 h-8 bg-[#111111] border border-[#2A2A2A] flex items-center justify-center text-[#8A8A8A] hover:text-[#F2EFE8] transition-colors"
        >
          <SignedIn>
            <UserButton />
          </SignedIn>
          <SignedOut>
            <MoreHorizontal size={16} />
          </SignedOut>
        </button>
      </div>
    </header>
  );
}

// ─── Mobile Bottom Nav ────────────────────────────────────────────────────────
function BottomNav({ onMoreOpen }: { onMoreOpen: () => void }) {
  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-mono tracking-wider uppercase transition-colors ${
      isActive ? 'text-[#E8321A]' : 'text-[#444444] active:text-[#666666]'
    }`;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0A0A0A] border-t border-[#2A2A2A] flex items-stretch safe-bottom" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
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
        className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-mono tracking-wider uppercase text-[#444444] active:text-[#666666] transition-colors"
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
      <div className="fixed inset-0 z-50 bg-black/80" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0A] border-t border-[#2A2A2A]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-8 h-0.5 bg-[#2A2A2A]" />
        </div>

        <div className="px-4 py-3 space-y-0.5">
          <p className="text-[9px] text-[#333333] uppercase tracking-widest font-mono font-bold px-2 pb-1">More Tools</p>
          <button onClick={() => go('/waiver')} className="w-full flex items-center gap-3 px-3 py-3 text-[#8A8A8A] hover:text-[#F2EFE8] hover:bg-[#111111] transition-colors text-sm font-mono border-l-2 border-transparent hover:border-[#E8321A]">
            <Inbox size={16} />
            <span>Waiver Wire</span>
            {!isPro && <span className="ml-auto text-[9px] border border-[#E8321A]/40 text-[#E8321A] px-1 py-px font-bold">PRO</span>}
          </button>
          <button onClick={() => go('/draft')} className="w-full flex items-center gap-3 px-3 py-3 text-[#8A8A8A] hover:text-[#F2EFE8] hover:bg-[#111111] transition-colors text-sm font-mono border-l-2 border-transparent hover:border-[#E8321A]">
            <Target size={16} />
            <span>Draft Assistant</span>
            {!isPro && <span className="ml-auto text-[9px] border border-[#E8321A]/40 text-[#E8321A] px-1 py-px font-bold">PRO</span>}
          </button>
          <button onClick={() => go('/predictor')} className="w-full flex items-center gap-3 px-3 py-3 text-[#8A8A8A] hover:text-[#F2EFE8] hover:bg-[#111111] transition-colors text-sm font-mono border-l-2 border-transparent hover:border-[#E8321A]">
            <Telescope size={16} />
            <span>League Predictor</span>
            {!isPro && <span className="ml-auto text-[9px] border border-[#E8321A]/40 text-[#E8321A] px-1 py-px font-bold">PRO</span>}
          </button>

          <div className="h-px bg-[#2A2A2A] my-2" />

          <p className="text-[9px] text-[#333333] uppercase tracking-widest font-mono font-bold px-2 pb-1">Account</p>
          <button onClick={() => go('/leagues')} className="w-full flex items-center gap-3 px-3 py-3 text-[#8A8A8A] hover:text-[#F2EFE8] hover:bg-[#111111] transition-colors text-sm font-mono">
            <FolderOpen size={16} /> My Leagues
          </button>
          <button onClick={() => go('/league')} className="w-full flex items-center gap-3 px-3 py-3 text-[#8A8A8A] hover:text-[#F2EFE8] hover:bg-[#111111] transition-colors text-sm font-mono">
            <Settings size={16} /> League Setup
          </button>
          <button onClick={() => go('/settings')} className="w-full flex items-center gap-3 px-3 py-3 text-[#8A8A8A] hover:text-[#F2EFE8] hover:bg-[#111111] transition-colors text-sm font-mono">
            <Bell size={16} /> Notifications
          </button>

          <div className="h-px bg-[#2A2A2A] my-2" />

          <SignedOut>
            <SignInButton mode="modal">
              <button onClick={onClose} className="w-full py-3 text-xs font-mono font-bold text-white bg-[#E8321A] hover:bg-[#C82818] transition-colors uppercase tracking-wider">
                Sign In
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <div className="flex items-center gap-3 px-3 py-2">
              <UserButton />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono text-[#F2EFE8] truncate">{user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress ?? 'My Account'}</p>
                <p className="text-xs font-mono text-[#555555]">{isPro ? 'Pro member' : 'Free plan'}</p>
              </div>
              {isPro && (
                <button onClick={() => { openBillingPortal(); onClose(); }} className="text-xs font-mono text-[#555555] hover:text-[#8A8A8A]">
                  Manage
                </button>
              )}
            </div>
            {!isPro && (
              <button
                onClick={() => { onUpgrade(); onClose(); }}
                className="w-full py-3 text-xs font-mono font-bold text-white bg-[#E8321A] hover:bg-[#C82818] transition-colors flex items-center justify-center gap-1.5 uppercase tracking-wider"
              >
                <Zap size={12} /> Upgrade to Pro
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
            <main className="flex-1 overflow-y-auto pb-safe md:pb-0">
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
