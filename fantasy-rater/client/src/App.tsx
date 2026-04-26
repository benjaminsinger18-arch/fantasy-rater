import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { BrowserRouter, NavLink, Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeftRight, ClipboardList, RefreshCw, Inbox, Target, Medal,
  Telescope, FolderOpen, Settings, Bell, Trophy, Zap, MoreHorizontal, Activity, MessageCircle, Swords,
} from 'lucide-react';
import { SignedIn, SignedOut, SignInButton, UserButton, useAuth, useUser } from '@clerk/clerk-react';
import { AuthGatePage } from './components/shared/AuthGatePage.tsx';
import { ErrorBoundary } from './components/shared/ErrorBoundary.tsx';
import { OnboardingTutorial, ONBOARDING_KEY } from './components/shared/OnboardingTutorial.tsx';
import { LeagueProvider, useLeague } from './lib/LeagueContext.tsx';
const TradeRater           = lazy(() => import('./components/trade/TradeRater.tsx').then(m => ({ default: m.TradeRater })));
const TeamRater            = lazy(() => import('./components/team/TeamRater.tsx').then(m => ({ default: m.TeamRater })));
const LeagueSetup          = lazy(() => import('./components/league/LeagueSetup.tsx').then(m => ({ default: m.LeagueSetup })));
const LeaguePredictor      = lazy(() => import('./components/league/LeaguePredictor.tsx').then(m => ({ default: m.LeaguePredictor })));
const PlayerRankings       = lazy(() => import('./components/rankings/PlayerRankings.tsx').then(m => ({ default: m.PlayerRankings })));
const StartSit             = lazy(() => import('./components/startsit/StartSit.tsx').then(m => ({ default: m.StartSit })));
const WaiverWire           = lazy(() => import('./components/waiver/WaiverWire.tsx').then(m => ({ default: m.WaiverWire })));
const DraftAssistant       = lazy(() => import('./components/draft/DraftAssistant.tsx').then(m => ({ default: m.DraftAssistant })));
const MultiLeague          = lazy(() => import('./components/league/MultiLeague.tsx').then(m => ({ default: m.MultiLeague })));
const NotificationSettings = lazy(() => import('./components/settings/NotificationSettings.tsx').then(m => ({ default: m.NotificationSettings })));
const LiveScoring          = lazy(() => import('./components/live/LiveScoring.tsx').then(m => ({ default: m.LiveScoring })));
const LineupOptimizer      = lazy(() => import('./components/lineup/LineupOptimizer.tsx').then(m => ({ default: m.LineupOptimizer })));
const FantasyChat          = lazy(() => import('./components/chat/FantasyChat.tsx').then(m => ({ default: m.FantasyChat })));
const MatchupAnalyzer      = lazy(() => import('./components/matchup/MatchupAnalyzer.tsx').then(m => ({ default: m.MatchupAnalyzer })));
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
    `flex items-center gap-2.5 px-3 py-2 text-[13px] transition-all duration-150 border-l-2 font-ui font-medium relative ${
      isActive
        ? 'text-[#F2EFE8] border-[#E8321A] bg-[#E8321A]/5'
        : 'text-[#888888] hover:text-[#CCCCCC] border-transparent hover:bg-[#2A2A2E]'
    }`;

  return (
    <aside className="hidden md:flex w-56 flex-shrink-0 border-r border-[#333338] bg-[#1E1E22] flex-col overflow-hidden">
      <div className="px-4 py-4 border-b border-[#333338]">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 border-2 border-[#E8321A] flex items-center justify-center flex-shrink-0">
            <Trophy size={11} className="text-[#E8321A]" />
          </div>
          <span className="font-display text-lg font-black tracking-wide text-[#F2EFE8] uppercase">
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

      <div className="px-3 pt-4 pb-2">
        <p className="text-[10px] text-[#666666] uppercase tracking-wide px-1 mb-2 font-ui font-semibold">Sport</p>
        <div className="grid grid-cols-2 gap-1">
          {SPORTS.map(s => (
            <button
              key={s.id}
              onClick={() => setSport(s.id)}
              className={`relative px-2 py-1.5 text-[12px] font-ui font-semibold border transition-colors rounded-sm ${
                config.sport === s.id
                  ? 'border-[#E8321A] text-[#F2EFE8] bg-[#E8321A]/10'
                  : 'text-[#666666] border-[#333338] hover:text-[#AAAAAA] hover:border-[#555558]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative flex-1 min-h-0">
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-[#1E1E22] to-transparent z-10" />
      <nav className="px-3 pt-2 pb-6 flex flex-col gap-0.5 overflow-y-auto h-full">
        <p className="text-[10px] text-[#666666] uppercase tracking-wide px-1 mb-1 mt-2 font-ui font-semibold">Tools</p>
        {[
          { to: '/', end: true, icon: <ArrowLeftRight size={14} className="flex-shrink-0" />, label: 'Trade Rater' },
          { to: '/team', icon: <ClipboardList size={14} className="flex-shrink-0" />, label: 'Team Rater' },
          { to: '/startsit', icon: <RefreshCw size={14} className="flex-shrink-0" />, label: 'Start / Sit' },
          { to: '/waiver', icon: <Inbox size={14} className="flex-shrink-0" />, label: 'Waiver Wire', pro: !isPro },
          { to: '/draft', icon: <Target size={14} className="flex-shrink-0" />, label: 'Draft', pro: !isPro },
          { to: '/rankings', icon: <Medal size={14} className="flex-shrink-0" />, label: 'Rankings' },
          { to: '/live', icon: <Activity size={14} className="flex-shrink-0" />, label: 'Live Score' },
          { to: '/lineup', icon: <Zap size={14} className="flex-shrink-0" />, label: 'Lineup', pro: !isPro },
          { to: '/chat', icon: <MessageCircle size={14} className="flex-shrink-0" />, label: 'AI Advisor', pro: !isPro },
          { to: '/matchup', icon: <Swords size={14} className="flex-shrink-0" />, label: 'Matchup' },
          { to: '/predictor', icon: <Telescope size={14} className="flex-shrink-0" />, label: 'League Predictor', pro: !isPro },
        ].map(({ to, end, icon, label, pro }) => (
          <NavLink key={to} to={to} end={end} className={linkClass}>
            {icon} {label}
            {pro && <span className="ml-auto text-[10px] bg-[#E8321A]/10 text-[#E8321A] px-1.5 py-px font-ui font-semibold rounded-sm">Pro</span>}
          </NavLink>
        ))}
        <p className="text-[10px] text-[#666666] uppercase tracking-wide px-1 mb-1 mt-4 font-ui font-semibold">Account</p>
        {[
          { to: '/leagues', icon: <FolderOpen size={14} className="flex-shrink-0" />, label: 'My Leagues' },
          { to: '/league', icon: <Settings size={14} className="flex-shrink-0" />, label: 'League Setup' },
          { to: '/settings', icon: <Bell size={14} className="flex-shrink-0" />, label: 'Notifications' },
        ].map(({ to, icon, label }) => (
          <NavLink key={to} to={to} className={linkClass}>{icon} {label}</NavLink>
        ))}
      </nav>
      </div>

      <div className="px-3 pt-3 pb-1 flex flex-col gap-2">
        <SignedOut>
          <SignInButton mode="modal">
            <button className="w-full py-2 text-[13px] text-[#888888] hover:text-[#F2EFE8] border border-[#333338] hover:border-[#555558] transition-colors font-ui font-medium rounded">
              Sign In
            </button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          {!isPro && (
            <button
              onClick={onUpgrade}
              className="w-full py-2 text-[13px] font-ui font-semibold text-white bg-[#E8321A] hover:bg-[#C82818] transition-colors flex items-center justify-center gap-1.5 rounded"
            >
              <Zap size={13} /> Upgrade to Pro
            </button>
          )}
          <div className="flex items-center gap-2 px-1 py-1">
            <UserButton />
            <div className="flex flex-col min-w-0">
              <span className="text-[#AAAAAA] text-[13px] font-ui truncate">{user?.firstName ?? 'My Account'}</span>
              {isPro && <span className="text-[#E8321A] text-[11px] font-ui font-semibold">Pro</span>}
            </div>
          </div>
        </SignedIn>
      </div>

      <div className="px-3 py-4 border-t border-[#333338]">
        <div className="bg-[#252528] border border-[#333338] rounded p-3">
          <p className="text-[10px] text-[#666666] uppercase tracking-wide mb-2.5 font-ui font-semibold">League</p>
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-[#666666] text-[12px] font-ui">Format</span>
              <span className="text-[#F2EFE8] text-[12px] font-mono font-medium">{config.scoringFormat}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666666] text-[12px] font-ui">Teams</span>
              <span className="text-[#F2EFE8] text-[12px] font-mono font-medium">{config.leagueSize}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666666] text-[12px] font-ui">Week</span>
              <span className="text-[#F2EFE8] text-[12px] font-mono font-medium">{config.currentWeek}</span>
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
    <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-2.5 bg-[#1E1E22] border-b border-[#333338]">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 border-2 border-[#E8321A] flex items-center justify-center flex-shrink-0">
          <Trophy size={10} className="text-[#E8321A]" />
        </div>
        <span className="font-display text-base font-black tracking-wide text-[#F2EFE8] uppercase">
          FantasyRater
        </span>
        {isPro && <span className="text-[10px] bg-[#E8321A]/10 text-[#E8321A] px-1.5 py-px font-ui font-semibold rounded-sm">Pro</span>}
      </div>
      <div className="flex items-center gap-2">
        <select
          value={config.sport}
          onChange={e => setSport(e.target.value as Sport)}
          style={{ fontSize: '16px' }}
          className="bg-[#2C2C31] text-[#F2EFE8] border border-[#333338] px-2 py-1.5 font-ui font-semibold focus:outline-none focus:border-[#E8321A] rounded"
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
    { to: '/',         icon: ArrowLeftRight, label: 'Trade', end: true },
    { to: '/rankings', icon: Medal,          label: 'Rankings' },
    { to: '/live',     icon: Activity,       label: 'Live' },
    { to: '/team',     icon: ClipboardList,  label: 'Team' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#1E1E22] border-t border-[#333338] flex items-stretch" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {tabs.map(({ to, icon: Icon, label, end }) => {
        const isActive = end ? location.pathname === to : location.pathname === to || location.pathname.startsWith(to + '/');
        return (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-ui font-medium uppercase transition-colors relative ${
              isActive ? 'text-[#F2EFE8]' : 'text-[#666666] active:text-[#AAAAAA]'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="bottom-nav-indicator"
                className="absolute top-0 left-4 right-4 h-0.5 bg-[#E8321A] rounded-full"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <Icon size={20} />
            {label}
          </NavLink>
        );
      })}
      <button
        onClick={onMoreOpen}
        className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-ui font-medium uppercase text-[#666666] active:text-[#AAAAAA] transition-colors"
      >
        <MoreHorizontal size={20} />
        More
      </button>
    </nav>
  );
}

// ─── Mobile Slide-up Menu ────────────────────────────────────────────────────
const menuItems = [
  { icon: ArrowLeftRight, label: 'Trade Rater',      path: '/',          pro: false },
  { icon: RefreshCw,      label: 'Start / Sit',      path: '/startsit',  pro: false },
  { icon: Swords,         label: 'Matchup Analyzer', path: '/matchup',   pro: false },
  { icon: MessageCircle,  label: 'AI Advisor',       path: '/chat',      pro: true },
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
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#1E1E22] border-t border-[#333338]"
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
              <p className="text-[10px] text-[#666666] uppercase tracking-wide font-ui font-semibold px-2 pb-1">
                More Tools
              </p>
              {menuItems.map(({ icon: Icon, label, path, pro }) => (
                <button
                  key={path}
                  onClick={() => go(path)}
                  className="w-full flex items-center gap-3 px-3 py-3 text-[#AAAAAA] hover:text-[#F2EFE8] hover:bg-[#2A2A2E] transition-colors text-[14px] font-ui rounded"
                >
                  <Icon size={16} />
                  <span>{label}</span>
                  {pro && !isPro && <span className="ml-auto text-[10px] bg-[#E8321A]/10 text-[#E8321A] px-1.5 py-px font-ui font-semibold rounded-sm">Pro</span>}
                </button>
              ))}

              <div className="h-px bg-[#2A2A2A] my-2" />

              <p className="text-[10px] text-[#666666] uppercase tracking-wide font-ui font-semibold px-2 pb-1">
                Account
              </p>
              {accountItems.map(({ icon: Icon, label, path }) => (
                <button
                  key={path}
                  onClick={() => go(path)}
                  className="w-full flex items-center gap-3 px-3 py-3 text-[#AAAAAA] hover:text-[#F2EFE8] hover:bg-[#2A2A2E] transition-colors text-[14px] font-ui rounded"
                >
                  <Icon size={16} /> {label}
                </button>
              ))}

              <div className="h-px bg-[#2A2A2A] my-2" />

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.48 }}
              >
                <SignedOut>
                  <SignInButton mode="modal">
                    <button onClick={onClose} className="w-full py-3 text-[14px] font-ui font-semibold text-white bg-[#E8321A] hover:bg-[#C82818] transition-colors rounded">
                      Sign In
                    </button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <div className="flex items-center gap-3 px-3 py-2">
                    <UserButton />
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-ui text-[#F2EFE8] truncate">{user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress ?? 'My Account'}</p>
                      <p className="text-[12px] font-ui text-[#666666]">{isPro ? 'Pro member' : 'Free plan'}</p>
                    </div>
                  </div>
                  {!isPro && (
                    <button
                      onClick={() => { onUpgrade(); onClose(); }}
                      className="w-full py-3 text-[14px] font-ui font-semibold text-white bg-[#E8321A] hover:bg-[#C82818] transition-colors flex items-center justify-center gap-2 rounded"
                    >
                      <Zap size={14} /> Upgrade to Pro
                    </button>
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
function PageLoader() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#E8321A] border-t-transparent animate-spin" />
    </div>
  );
}

function AppRoutes() {
  const location = useLocation();
  return (
    <Suspense fallback={<PageLoader />}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/"         element={<motion.div className="h-full" variants={pageVariants} initial="initial" animate="animate" exit="exit"><TradeRater /></motion.div>} />
          <Route path="/team"     element={<motion.div className="h-full" variants={pageVariants} initial="initial" animate="animate" exit="exit"><TeamRater /></motion.div>} />
          <Route path="/rankings" element={<motion.div className="h-full" variants={pageVariants} initial="initial" animate="animate" exit="exit"><PlayerRankings /></motion.div>} />
          <Route path="/predictor" element={<motion.div className="h-full" variants={pageVariants} initial="initial" animate="animate" exit="exit"><LeaguePredictor /></motion.div>} />
          <Route path="/league"   element={<motion.div className="h-full" variants={pageVariants} initial="initial" animate="animate" exit="exit"><LeagueSetup /></motion.div>} />
          <Route path="/startsit" element={<motion.div className="h-full" variants={pageVariants} initial="initial" animate="animate" exit="exit"><StartSit /></motion.div>} />
          <Route path="/waiver"   element={<motion.div className="h-full" variants={pageVariants} initial="initial" animate="animate" exit="exit"><WaiverWire /></motion.div>} />
          <Route path="/draft"    element={<motion.div className="h-full" variants={pageVariants} initial="initial" animate="animate" exit="exit"><DraftAssistant /></motion.div>} />
          <Route path="/leagues"  element={<motion.div className="h-full" variants={pageVariants} initial="initial" animate="animate" exit="exit"><MultiLeague /></motion.div>} />
          <Route path="/settings" element={<motion.div className="h-full" variants={pageVariants} initial="initial" animate="animate" exit="exit"><NotificationSettings /></motion.div>} />
          <Route path="/live"     element={<motion.div className="h-full" variants={pageVariants} initial="initial" animate="animate" exit="exit"><LiveScoring /></motion.div>} />
          <Route path="/lineup"   element={<motion.div className="h-full" variants={pageVariants} initial="initial" animate="animate" exit="exit"><LineupOptimizer /></motion.div>} />
          <Route path="/chat"     element={<motion.div className="h-full" variants={pageVariants} initial="initial" animate="animate" exit="exit"><FantasyChat /></motion.div>} />
          <Route path="/matchup"  element={<motion.div className="h-full" variants={pageVariants} initial="initial" animate="animate" exit="exit"><MatchupAnalyzer /></motion.div>} />
        </Routes>
      </AnimatePresence>
    </Suspense>
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
              <ErrorBoundary>
                <AppRoutes />
              </ErrorBoundary>
            </main>

            {/* Mobile bottom nav */}
            <BottomNav onMoreOpen={() => setMenuOpen(true)} />
          </div>
        </div>
      </BrowserRouter>
    </LeagueProvider>
  );
}
