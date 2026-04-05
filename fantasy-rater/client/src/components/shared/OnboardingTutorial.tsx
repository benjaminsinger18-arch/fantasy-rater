import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeftRight, RefreshCw, Activity, Zap, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';

export const ONBOARDING_KEY = 'fr_onboarding_v1';

const PRO_FEATURES = [
  'Waiver Wire AI Picks',
  'Draft Assistant',
  'AI Fantasy Advisor Chat',
  'Lineup Optimizer',
  'League Predictor',
  'Unlimited everything',
];

interface Step {
  icon: React.ReactNode;
  title: string;
  body: string;
  isPro?: boolean;
}

const STEPS: Step[] = [
  {
    icon: <span className="text-4xl font-display font-black text-[#E8321A]">FR</span>,
    title: 'Welcome to FantasyRater',
    body: 'The AI toolkit serious fantasy managers use. Rate trades, optimize lineups, and get an edge over your league — all in one place.',
  },
  {
    icon: <ArrowLeftRight size={36} className="text-[#E8321A]" />,
    title: 'Trade Rater',
    body: 'Get an instant AI grade for both sides of any trade — player values, positional scarcity, and win-now vs. rebuild context included.',
  },
  {
    icon: <RefreshCw size={36} className="text-[#E8321A]" />,
    title: 'Start/Sit & Rankings',
    body: 'Never guess who to start again. AI-powered start/sit advice and live rankings updated with real injury and matchup data.',
  },
  {
    icon: <Activity size={36} className="text-[#E8321A]" />,
    title: 'Live Scoring & Matchup Analyzer',
    body: 'Track scores in real time and analyze your matchup before kickoff. Know your win probability, key players, and where your team is vulnerable.',
  },
  {
    icon: <Zap size={36} className="text-[#E8321A]" />,
    title: 'Go Pro — Win More',
    body: '',
    isPro: true,
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

export function OnboardingTutorial({ open, onClose, onUpgrade }: Props) {
  const [step, setStep] = useState(0);
  const { user } = useUser();

  function finish() {
    localStorage.setItem(ONBOARDING_KEY, '1');
    setStep(0);
    onClose();
  }

  function next() {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else finish();
  }

  function back() {
    if (step > 0) setStep(s => s - 1);
  }

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={finish}
      />
      <motion.div
        className="relative bg-[#1E1E22] border border-[#484850] w-full max-w-sm p-7 flex flex-col items-center text-center z-10"
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        {/* Skip */}
        <button
          onClick={finish}
          className="absolute top-3 right-3 text-[#444444] hover:text-[#888888] transition-colors cursor-pointer"
          aria-label="Skip tutorial"
        >
          <X size={16} />
        </button>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            className="flex flex-col items-center gap-4 w-full"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="h-16 flex items-center justify-center">
              {current.icon}
            </div>

            <h2 className="text-[#F2EFE8] font-display font-black text-xl tracking-wide">
              {step === 0 && user?.firstName ? `Welcome, ${user.firstName}` : current.title}
            </h2>

            {current.isPro ? (
              <div className="w-full">
                <p className="text-[#8A8A8A] text-sm font-mono mb-4">
                  Unlock the full arsenal. The tools your competition wishes they had.
                </p>
                <div className="text-left space-y-2 mb-4">
                  {PRO_FEATURES.map(f => (
                    <div key={f} className="flex items-center gap-2 text-sm font-mono">
                      <div className="w-1.5 h-1.5 bg-[#E8321A] flex-shrink-0" />
                      <span className="text-[#CCCCCC]">{f}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[#E8321A] font-mono font-bold text-sm">$7.99 / month · Cancel anytime</p>
              </div>
            ) : (
              <p className="text-[#888888] text-sm font-mono leading-relaxed">{current.body}</p>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Progress dots */}
        <div className="flex gap-1.5 mt-6 mb-5">
          {STEPS.map((_, i) => (
            <motion.div
              key={i}
              className="h-1 rounded-full bg-[#E8321A] cursor-pointer"
              animate={{ width: i === step ? 20 : 6, opacity: i === step ? 1 : 0.3 }}
              transition={{ duration: 0.2 }}
              onClick={() => setStep(i)}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex gap-2 w-full">
          {step > 0 && (
            <button
              onClick={back}
              className="flex items-center gap-1 px-4 py-2.5 border border-[#484850] text-[#8A8A8A] hover:text-[#F2EFE8] hover:border-[#888888] text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer"
            >
              <ChevronLeft size={14} /> Back
            </button>
          )}
          {isLast ? (
            <div className="flex-1 flex gap-2">
              <button
                onClick={finish}
                className="flex-1 py-2.5 border border-[#484850] text-[#8A8A8A] hover:text-[#F2EFE8] font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Maybe Later
              </button>
              <button
                onClick={() => { finish(); onUpgrade(); }}
                className="flex-1 py-2.5 bg-[#E8321A] hover:bg-[#C82818] text-white font-mono font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Zap size={12} /> Go Pro
              </button>
            </div>
          ) : (
            <button
              onClick={next}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#E8321A] hover:bg-[#C82818] text-white font-mono font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Next <ChevronRight size={14} />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
