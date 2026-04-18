import { SignInButton, SignUpButton } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { Trophy, ArrowRight } from 'lucide-react';

const features = [
  'Trade grades in seconds',
  'AI-powered start/sit advice',
  'Live waiver wire picks',
  'Matchup win probability',
];

export function AuthGatePage() {
  return (
    <div className="h-screen w-full bg-[#141416] flex overflow-hidden">

      {/* ── Left: Branding column ─────────────────────────────────── */}
      <div className="hidden md:flex w-1/2 flex-col justify-between p-12 border-r border-[#1F1F23] relative">
        {/* Subtle background number — editorial accent */}
        <div
          className="absolute bottom-0 left-0 right-0 select-none pointer-events-none overflow-hidden"
          aria-hidden
        >
          <span
            className="block font-display font-black text-[28vw] leading-none text-[#1A1A1D] whitespace-nowrap"
            style={{ marginLeft: '-2%' }}
          >
            FR
          </span>
        </div>

        {/* Logo */}
        <motion.div
          className="flex items-center gap-3 relative z-10"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="w-8 h-8 border-2 border-[#E8321A] flex items-center justify-center">
            <Trophy size={14} className="text-[#E8321A]" />
          </div>
          <span className="font-display text-xl font-black tracking-wide text-[#F2EFE8] uppercase">
            FantasyRater
          </span>
        </motion.div>

        {/* Headline */}
        <motion.div
          className="relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="font-display font-black text-[#F2EFE8] leading-none mb-4" style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', letterSpacing: '0.02em' }}>
            WIN YOUR<br />
            <span className="text-[#E8321A]">FANTASY</span><br />
            LEAGUE.
          </h1>
          <p className="text-[#666666] font-ui text-base leading-relaxed max-w-xs">
            AI analysis. Live data. Instant verdicts.
            Every decision made smarter.
          </p>
        </motion.div>

        {/* Feature list */}
        <motion.ul
          className="relative z-10 space-y-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          {features.map((f, i) => (
            <motion.li
              key={f}
              className="flex items-center gap-2.5 text-[13px] font-ui text-[#888888]"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 + i * 0.07, duration: 0.3 }}
            >
              <span className="w-1 h-1 rounded-full bg-[#E8321A] flex-shrink-0" />
              {f}
            </motion.li>
          ))}
        </motion.ul>
      </div>

      {/* ── Right: Auth column ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 relative">

        {/* Mobile logo only */}
        <motion.div
          className="md:hidden flex items-center gap-3 mb-10"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="w-8 h-8 border-2 border-[#E8321A] flex items-center justify-center">
            <Trophy size={14} className="text-[#E8321A]" />
          </div>
          <span className="font-display text-xl font-black tracking-wide text-[#F2EFE8] uppercase">
            FantasyRater
          </span>
        </motion.div>

        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="mb-8 md:hidden">
            <h2 className="font-display font-black text-[#F2EFE8] text-3xl mb-2" style={{ letterSpacing: '0.02em' }}>
              GET STARTED
            </h2>
            <p className="text-[#666666] font-ui text-sm">AI-powered fantasy decisions</p>
          </div>

          <div className="hidden md:block mb-8">
            <h2 className="font-display font-black text-[#F2EFE8] text-2xl mb-2" style={{ letterSpacing: '0.02em' }}>
              GET STARTED
            </h2>
            <p className="text-[#666666] font-ui text-sm">Create a free account to begin</p>
          </div>

          <div className="space-y-3">
            <SignUpButton mode="modal">
              <button className="w-full py-3.5 bg-[#E8321A] hover:bg-[#CC2C17] text-white font-ui font-semibold text-[15px] transition-colors flex items-center justify-center gap-2 rounded cursor-pointer">
                Create Free Account
                <ArrowRight size={15} />
              </button>
            </SignUpButton>

            <SignInButton mode="modal">
              <button className="w-full py-3.5 border border-[#2A2A2E] hover:border-[#444448] text-[#888888] hover:text-[#F2EFE8] font-ui font-medium text-[15px] transition-colors rounded cursor-pointer">
                Sign In
              </button>
            </SignInButton>
          </div>

          <p className="mt-6 text-center text-[#444448] text-[12px] font-ui">
            Free to use · Pro features available
          </p>
        </motion.div>
      </div>
    </div>
  );
}
