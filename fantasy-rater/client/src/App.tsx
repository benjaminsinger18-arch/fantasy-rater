import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, NavLink, Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeftRight, ClipboardList, RefreshCw, Inbox, Target, Medal,
  Telescope, FolderOpen, Settings, Bell, Trophy, Zap, MoreHorizontal, Activity, MessageCircle, Swords,
} from 'lucide-react';
import { SignedIn, SignedOut, SignInButton, UserButton, useAuth, useUser } from '@clerk/clerk-react';
import { AuthGatePage } from './components/shared/AuthGatePage.tsx';
import { OnboardingTutorial, ONBOARDING_KEY } from './components/shared/OnboardingTutorial.tsx';
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
import { LiveScoring } from './components/live/LiveScoring.tsx';
import { LineupOptimizer } from './components/lineup/LineupOptimizer.tsx';
import { FantasyChat } from './components/chat/FantasyChat.tsx';
import { MatchupAnalyzer } from './components/matchup/MatchupAnalyzer.tsx';
import { UpgradeModal, useUpgradeModal } from './components/shared/UpgradeModal.tsx';
import { setTokenGetter, setClerkReadyGate } from './lib/api.ts';
import type { Sport } from './types/index.ts';

const SPORTS: { id: Sport; label: string }[] = [
  { id: 'nfl', label: 'NFL' },
  { id: 'mlb', label: 'MLB' },
  { id: 'fpl', label: 'FPL' },
  { id: 'ipl', label: 'IPL' },
];

const pageVariants = {
  initial: { opacity: 0, y: 22, filter: 'blur(3px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, y: -10, filter: 'blur(3px)', transition: { duration: 0.16, ease: 'easeIn' } },
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
function Sidebar({ onUpgrade, onTutorial }: { onUpgrade: () => void; onTutorial: () => void }) {
  const { config, setSport } = useLeague();
  const { user } = useUser();
  const tier = (user?.publicMetadata?.tier as string) ?? 'free';
  const isPro = tier === 'pro';

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 text-xs transition-all duration-200 border-l-2 font-mono tracking-wider uppercase relative overflow-hidden ${
      isActive
        ? 'text-[#F2EFE8] border-[#E8321A] bg-[#E8321A]/5 shadow-[inset_2px_0_12px_rgba(232,50,26,0.12)]'
        : 'text-[#888888] hover:text-[#BBBBBB] border-transparent hover:bg-[#2A2A2E] hover:border-[#3A3A3A]'
    }`;

  return (
    <aside className="hidden md:flex w-52 flex-shrink-0 border-r border-[#484850] bg-[#222226] flex-col relative overflow-hidden bg-dot-grid">
      {/* Animated vertical scan line */}
      <motion.div
        className="absolute inset-x-0 h-32 pointer-events-none z-0"
        style={{ background: 'linear-gradient(to bottom, transparent, rgba(232,50,26,0.04), transparent)' }}
        animate={{ top: ['-10%', '110%'] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear', repeatDelay: 3 }}
      />
      <div className="px-4 py-4 border-b border-[#484850] relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 border-2 border-[#E8321A] flex items-center justify-center flex-shrink-0">
            <Trophy size={11} className="text-[#E8321A]" />
          </div>
          <span className="font-display text-lg font-black tracking-widest text-[#F2EFE8] uppercase">
            FantasyRater
          </span>
          <button
            onClick={onTutorial}
            className="ml-auto w-5 h-5 border border-[#484850] hover:border-[#888888] text-[#444444] hover:text-[#888888] flex items-center justify-center text-[10px] font-mono transition-colors cursor-pointer flex-shrink-0"
            title="Show tutorial"
          >
            ?
          </button>
        </div>
      </div>

      <div className="px-3 pt-4 pb-2 relative z-10">
        <p className="text-[9px] text-[#555555] uppercase tracking-widest px-1 mb-2 font-mono font-bold">Sport</p>
        <div className="grid grid-cols-2 gap-1">
          {SPORTS.map(s => (
            <motion.button
              key={s.id}
              onClick={() => setSport(s.id)}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.03 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className={`relative px-2 py-1.5 text-[11px] font-mono font-bold border transition-colors tracking-wider overflow-hidden ${
                config.sport === s.id
                  ? 'border-[#E8321A] text-[#E8321A]'
                  : 'text-[#555555] border-[#484850] hover:text-[#8A8A8A] hover:border-[#3A3A3A]'
              }`}
            >
              {config.sport === s.id && (
                <motion.div
                  layoutId="sport-active-bg"
                  className="absolute inset-0 bg-[#E8321A]/10"
                  transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                />
              )}
              <span className="relative z-10">{s.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      <nav className="px-3 pt-2 flex flex-col gap-0.5 overflow-y-auto relative z-10">
        <p className="text-[9px] text-[#555555] uppercase tracking-widest px-1 mb-1 mt-2 font-mono font-bold">Tools</p>
        {[
          { to: '/', end: true, icon: <ArrowLeftRight size={13} className="flex-shrink-0" />, label: 'Trade Rater' },
          { to: '/team', icon: <ClipboardList size={13} className="flex-shrink-0" />, label: 'Team Rater' },
          { to: '/startsit', icon: <RefreshCw size={13} className="flex-shrink-0" />, label: 'Start/Sit' },
          { to: '/waiver', icon: <Inbox size={13} className="flex-shrink-0" />, label: 'Waiver Wire', pro: !isPro },
          { to: '/draft', icon: <Target size={13} className="flex-shrink-0" />, label: 'Draft', pro: !isPro },
          { to: '/rankings', icon: <Medal size={13} className="flex-shrink-0" />, label: 'Rankings' },
          { to: '/live', icon: <Activity size={13} className="flex-shrink-0" />, label: 'Live Score' },
          { to: '/lineup', icon: <Zap size={13} className="flex-shrink-0" />, label: 'Lineup Optimizer', pro: !isPro },
          { to: '/chat', icon: <MessageCircle size={13} className="flex-shrink-0" />, label: 'AI Advisor', pro: !isPro },
          { to: '/matchup', icon: <Swords size={13} className="flex-shrink-0" />, label: 'Matchup Analyzer' },
          { to: '/predictor', icon: <Telescope size={13} className="flex-shrink-0" />, label: 'League Predictor', pro: !isPro },
        ].map(({ to, end, icon, label, pro }, i) => (
          <motion.div
            key={to}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, type: 'spring', stiffness: 480, damping: 26 }}
          >
            <NavLink to={to} end={end} className={linkClass}>
              {icon} {label}
              {pro && <span className="ml-auto text-[9px] border border-[#E8321A]/40 text-[#E8321A] px-1 py-px font-mono font-bold">PRO</span>}
            </NavLink>
          </motion.div>
        ))}
        <p className="text-[9px] text-[#555555] uppercase tracking-widest px-1 mb-1 mt-3 font-mono font-bold">Account</p>
        {[
          { to: '/leagues', icon: <FolderOpen size={13} className="flex-shrink-0" />, label: 'My Leagues' },
          { to: '/league', icon: <Settings size={13} className="flex-shrink-0" />, label: 'League Setup' },
          { to: '/settings', icon: <Bell size={13} className="flex-shrink-0" />, label: 'Notifications' },
        ].map(({ to, icon, label }, i) => (
          <motion.div
            key={to}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 + i * 0.05, type: 'spring', stiffness: 480, damping: 26 }}
          >
            <NavLink to={to} className={linkClass}>{icon} {label}</NavLink>
          </motion.div>
        ))}
      </nav>

      <div className="mt-auto px-3 pt-3 pb-1 flex flex-col gap-2 relative z-10">
        <SignedOut>
          <SignInButton mode="modal">
            <button className="w-full py-2 text-xs text-[#8A8A8A] hover:text-[#F2EFE8] border border-[#484850] hover:border-[#3A3A3A] transition-colors font-mono uppercase tracking-wider">
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
          </div>
        </SignedIn>
      </div>

      <div className="px-3 py-4 border-t border-[#484850] relative z-10">
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
    <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-2.5 bg-[#222226] border-b border-[#484850]">
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
          style={{ fontSize: '16px' }}
          className="bg-[#2C2C31] text-[#F2EFE8] border border-[#484850] px-2 py-1.5 font-mono font-bold focus:outline-none focus:border-[#E8321A] tracking-wider"
        >
          <option value="nfl">NFL</option>
          <option value="mlb">MLB</option>
          <option value="fpl">FPL</option>
          <option value="ipl">IPL</option>
        </select>
        <button
          onClick={onMenuOpen}
          className="w-8 h-8 bg-[#2C2C31] border border-[#484850] flex items-center justify-center text-[#8A8A8A] hover:text-[#F2EFE8] transition-colors"
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
  const location = useLocation();

  const tabs = [
    { to: '/chat',     icon: MessageCircle, label: 'Chat' },
    { to: '/rankings', icon: Medal,         label: 'Rankings' },
    { to: '/live',     icon: Activity,      label: 'Live' },
    { to: '/team',     icon: ClipboardList, label: 'Team' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#222226] border-t border-[#484850] flex items-stretch safe-bottom" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {tabs.map(({ to, icon: Icon, label }) => {
        const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
        return (
          <NavLink
            key={to}
            to={to}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-mono tracking-wider uppercase transition-colors relative ${
              isActive ? 'text-[#E8321A]' : 'text-[#777777] active:text-[#AAAAAA]'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="bottom-nav-indicator"
                className="absolute top-0 left-2 right-2 h-px bg-[#E8321A]"
                style={{ boxShadow: '0 0 8px 2px rgba(232,50,26,0.5)' }}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <motion.div
              animate={isActive ? { scale: 1.18 } : { scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className="relative"
            >
              {isActive && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-[#E8321A]/15 blur-sm scale-150"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
              <Icon size={20} className="relative z-10" />
            </motion.div>
            {label}
          </NavLink>
        );
      })}
      <motion.button
        onClick={onMoreOpen}
        className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-mono tracking-wider uppercase text-[#777777] active:text-[#AAAAAA] transition-colors"
        whileTap={{ scale: 0.9 }}
      >
        <MoreHorizontal size={20} />
        More
      </motion.button>
    </nav>
  );
}

// ─── Mobile Slide-up Menu ────────────────────────────────────────────────────
const menuItems = [
  { icon: ArrowLeftRight, label: 'Trade Rater',      path: '/',          pro: false },
  { icon: RefreshCw,      label: 'Start / Sit',      path: '/startsit',  pro: false },
  { icon: Swords,         label: 'Matchup Analyzer', path: '/matchup',   pro: false },
  { icon: Zap,            label: 'Lineup Optimizer', path: '/lineup',    pro: true },
  { icon: Inbox,          label: 'Waiver Wire',      path: '/waiver',    pro: true },
  { icon: Target,         label: 'Draft Assistant',  path: '/draft',     pro: true },
  { icon: Telescope,      label: 'League Predictor', path: '/predictor', pro: true },
];

const accountItems = [
  { icon: FolderOpen, label: 'My Leagues', path: '/leagues' },
  { icon: Settings, label: 'League Setup', path: '/league' },
  { icon: Bell, label: 'Notifications', path: '/settings' },
];

function MobileMenu({ open, onClose, onUpgrade }: { open: boolean; onClose: () => void; onUpgrade: () => void }) {
  const { user } = useUser();
  const tier = (user?.publicMetadata?.tier as string) ?? 'free';
  const isPro = tier === 'pro';
  const navigate = useNavigate();

  function go(path: string) {
    navigate(path);
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#222226] border-t border-[#484850]"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-8 h-0.5 bg-[#2A2A2A]" />
            </div>

            <div className="px-4 py-3 space-y-0.5">
              <motion.p
                className="text-[9px] text-[#555555] uppercase tracking-widest font-mono font-bold px-2 pb-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.08 }}
              >
                More Tools
              </motion.p>
              {menuItems.map(({ icon: Icon, label, path, pro }, i) => (
                <motion.button
                  key={path}
                  onClick={() => go(path)}
                  className="w-full flex items-center gap-3 px-3 py-3 text-[#8A8A8A] hover:text-[#F2EFE8] hover:bg-[#2C2C31] transition-colors text-sm font-mono border-l-2 border-transparent hover:border-[#E8321A]"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.06, type: 'spring', stiffness: 400, damping: 28 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                  {pro && !isPro && <span className="ml-auto text-[9px] border border-[#E8321A]/40 text-[#E8321A] px-1 py-px font-bold">PRO</span>}
                </motion.button>
              ))}

              <div className="h-px bg-[#2A2A2A] my-2" />

              <motion.p
                className="text-[9px] text-[#555555] uppercase tracking-widest font-mono font-bold px-2 pb-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.28 }}
              >
                Account
              </motion.p>
              {accountItems.map(({ icon: Icon, label, path }, i) => (
                <motion.button
                  key={path}
                  onClick={() => go(path)}
                  className="w-full flex items-center gap-3 px-3 py-3 text-[#8A8A8A] hover:text-[#F2EFE8] hover:bg-[#2C2C31] transition-colors text-sm font-mono"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.06, type: 'spring', stiffness: 400, damping: 28 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon size={16} /> {label}
                </motion.button>
              ))}

              <div className="h-px bg-[#2A2A2A] my-2" />

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.48 }}
              >
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
                  </div>
                  {!isPro && (
                    <motion.button
                      onClick={() => { onUpgrade(); onClose(); }}
                      className="w-full py-3 text-xs font-mono font-bold text-white bg-[#E8321A] hover:bg-[#C82818] transition-colors flex items-center justify-center gap-1.5 uppercase tracking-wider"
                      whileTap={{ scale: 0.97 }}
                    >
                      <Zap size={12} /> Upgrade to Pro
                    </motion.button>
                  )}
                </SignedIn>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
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
        <Route path="/live" element={<motion.div className="h-full" variants={pageVariants} initial="initial" animate="animate" exit="exit"><LiveScoring /></motion.div>} />
        <Route path="/lineup" element={<motion.div className="h-full" variants={pageVariants} initial="initial" animate="animate" exit="exit"><LineupOptimizer /></motion.div>} />
        <Route path="/chat" element={<motion.div className="h-full" variants={pageVariants} initial="initial" animate="animate" exit="exit"><FantasyChat /></motion.div>} />
        <Route path="/matchup" element={<motion.div className="h-full" variants={pageVariants} initial="initial" animate="animate" exit="exit"><MatchupAnalyzer /></motion.div>} />
      </Routes>
    </AnimatePresence>
  );
}

// ─── Root App ────────────────────────────────────────────────────────────────
export default function App() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'upgrade' | 'login'>('upgrade');
  const [menuOpen, setMenuOpen] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();

  useUpgradeModal(setModalOpen, setModalMode);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') {
      window.history.replaceState({}, '', '/');
      setCheckoutSuccess(true);
      // Webhook fires async — reload Clerk user object after short delays
      // so publicMetadata.tier updates without requiring a manual page refresh
      const refresh = async () => {
        await new Promise(r => setTimeout(r, 1500));
        await user?.reload();
        await new Promise(r => setTimeout(r, 3000));
        await user?.reload();
      };
      refresh();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isLoaded && isSignedIn && !localStorage.getItem(ONBOARDING_KEY)) {
      setTutorialOpen(true);
    }
  }, [isLoaded, isSignedIn]);

  if (!isLoaded) return null;

  if (!isSignedIn) return (
    <BrowserRouter>
      <AuthSync />
      <AuthGatePage />
    </BrowserRouter>
  );

  return (
    <LeagueProvider>
      <BrowserRouter>
        <AuthSync />
        <OnboardingTutorial
          open={tutorialOpen}
          onClose={() => setTutorialOpen(false)}
          onUpgrade={() => { setModalMode('upgrade'); setModalOpen(true); }}
        />
        <UpgradeModal open={modalOpen} mode={modalMode} onClose={() => setModalOpen(false)} />
        <MobileMenu
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          onUpgrade={() => { setModalMode('upgrade'); setModalOpen(true); }}
        />

        {/* Post-checkout success banner */}
        <AnimatePresence>
          {checkoutSuccess && (
            <motion.div
              initial={{ y: -48, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -48, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="fixed top-0 inset-x-0 z-[200] bg-[#E8321A] text-white flex items-center justify-center gap-3 py-2.5 px-4"
            >
              <Zap size={14} className="flex-shrink-0" />
              <span className="text-xs font-mono font-bold tracking-widest uppercase">Pro activated — welcome to the elite tier</span>
              <button
                onClick={() => setCheckoutSuccess(false)}
                className="ml-2 text-white/60 hover:text-white transition-colors text-xs"
              >✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="h-screen flex bg-mesh">
          {/* Desktop sidebar */}
          <Sidebar
            onUpgrade={() => { setModalMode('upgrade'); setModalOpen(true); }}
            onTutorial={() => setTutorialOpen(true)}
          />

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
