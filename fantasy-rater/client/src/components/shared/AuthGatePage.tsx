import { SignInButton, SignUpButton } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { Trophy, Zap } from 'lucide-react';

export function AuthGatePage() {
  return (
    <div className="h-screen w-full bg-[#1A1A1E] bg-dot-grid flex flex-col items-center justify-center relative overflow-hidden">
      {/* Animated scan line */}
      <motion.div
        className="absolute inset-x-0 h-40 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent, rgba(232,50,26,0.05), transparent)' }}
        animate={{ top: ['-15%', '115%'] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
      />

      {/* Logo */}
      <motion.div
        className="flex items-center gap-3 mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="w-10 h-10 border-2 border-[#E8321A] flex items-center justify-center">
          <Trophy size={18} className="text-[#E8321A]" />
        </div>
        <span className="font-display text-3xl font-black tracking-widest text-[#F2EFE8] uppercase">
          FantasyRater
        </span>
      </motion.div>

      {/* Tagline */}
      <motion.p
        className="text-[#555555] text-sm font-mono tracking-widest uppercase mb-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        AI-powered fantasy decisions
      </motion.p>

      {/* Buttons */}
      <motion.div
        className="flex flex-col gap-3 w-full max-w-xs px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <SignUpButton mode="modal">
          <button className="w-full py-3 bg-[#E8321A] hover:bg-[#C82818] text-white font-mono font-bold text-sm uppercase tracking-widest transition-colors flex items-center justify-center gap-2 cursor-pointer">
            <Zap size={14} /> Create Free Account
          </button>
        </SignUpButton>
        <SignInButton mode="modal">
          <button className="w-full py-3 border border-[#484850] hover:border-[#888888] text-[#8A8A8A] hover:text-[#F2EFE8] font-mono text-sm uppercase tracking-widest transition-colors cursor-pointer">
            Sign In
          </button>
        </SignInButton>
      </motion.div>

      {/* Footer note */}
      <motion.p
        className="absolute bottom-6 text-[#333333] text-xs font-mono"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        Free to use · Pro features available
      </motion.p>
    </div>
  );
}
