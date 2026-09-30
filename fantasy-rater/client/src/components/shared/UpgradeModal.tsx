import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Zap, Lock } from 'lucide-react';
import { setUpgradeHandler, setLoginRequiredHandler, startCheckout } from '../../lib/api.ts';
import { useClerk } from '@clerk/clerk-react';

interface Props {
  open: boolean;
  mode: 'upgrade' | 'login';
  onClose: () => void;
}

const FEATURES = [
  { label: 'Trade Rater',          free: '3/day',  pro: 'Unlimited'    },
  { label: 'Team Rater',           free: '2/day',  pro: 'Unlimited'    },
  { label: 'Start/Sit Optimizer',  free: '2/day',  pro: 'Unlimited'    },
  { label: 'Waiver Wire Picks',    free: '—',      pro: '✓'            },
  { label: 'Draft Assistant',      free: '—',      pro: '✓'            },
  { label: 'Player Rankings',      free: '✓',      pro: '✓'            },
  { label: 'Rankings AI Analysis', free: '—',      pro: '✓'            },
  { label: 'League Predictor',     free: '—',      pro: '✓'            },
  { label: 'Roster Import',        free: '—',      pro: '✓'            },
  { label: 'My Leagues',           free: '1',      pro: 'Unlimited'    },
  { label: 'Injury Alerts',        free: 'Email',  pro: 'Email + Push' },
];

export function UpgradeModal({ open, mode, onClose }: Props) {
  const { openSignIn } = useClerk();

  async function handleUpgrade() {
    try {
      await startCheckout();
    } catch {
      // error handled by interceptor
    }
  }

  function handleLogin() {
    onClose();
    openSignIn();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/75"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              className="pointer-events-auto relative w-full max-w-md max-h-[90vh] overflow-y-auto border border-surface-border"
              style={{ background: '#0D0D10' }}
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            >
              {mode === 'login' ? (
                <div className="p-6">
                  <div className="flex items-center gap-2.5 mb-1">
                    <Lock size={13} className="text-signal flex-shrink-0" />
                    <h2 className="font-display font-black text-warm text-xl tracking-wide uppercase">
                      Sign In to Continue
                    </h2>
                  </div>
                  <p className="text-fade font-mono text-xs mb-6">
                    Create a free account to rate trades and teams
                  </p>
                  <button
                    onClick={handleLogin}
                    className="w-full py-3 btn-signal font-display font-black tracking-widest uppercase text-sm flex items-center justify-center gap-2 rounded"
                  >
                    <Zap size={13} /> Sign In / Sign Up — Free
                  </button>
                </div>
              ) : (
                <div className="p-6">
                  <div className="flex items-center gap-2.5 mb-1">
                    <Zap size={13} className="text-signal flex-shrink-0" />
                    <h2 className="font-display font-black text-warm text-xl tracking-wide uppercase">
                      Upgrade to Pro
                    </h2>
                  </div>
                  <p className="text-fade font-mono text-xs mb-5">
                    Unlock unlimited AI analysis
                  </p>

                  <div className="border border-surface-border mb-5 overflow-hidden">
                    <div className="grid grid-cols-3 bg-surface-raised px-3 py-2 border-b border-surface-border">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-fade">Feature</span>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-fade text-center">Free</span>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-signal text-center">Pro</span>
                    </div>
                    {FEATURES.map((f, i) => (
                      <div
                        key={f.label}
                        className={`grid grid-cols-3 px-3 py-2 border-b border-[#1E1E20] last:border-b-0 ${i % 2 === 1 ? 'bg-white/[0.015]' : ''}`}
                      >
                        <span className="text-pale font-ui text-xs">{f.label}</span>
                        <span className={`text-center font-mono text-xs ${f.free === '—' ? 'text-[#333333]' : 'text-sub'}`}>
                          {f.free}
                        </span>
                        <span className={`text-center font-mono text-xs font-semibold ${
                          f.pro === '✓' || f.pro === 'Unlimited' || f.pro === 'Email + Push'
                            ? 'text-signal'
                            : 'text-soft'
                        }`}>
                          {f.pro}
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleUpgrade}
                    className="w-full py-3 btn-signal font-display font-black tracking-widest uppercase text-sm flex items-center justify-center gap-2 rounded mb-2"
                  >
                    <Zap size={13} /> Upgrade to Pro — $7.99/mo
                  </button>
                  <p className="text-center text-[#333333] font-mono text-[11px]">Cancel anytime</p>
                </div>
              )}

              <button
                onClick={onClose}
                className="absolute top-3 right-3 w-6 h-6 border border-[#2A2A2E] hover:border-[#444448] bg-surface-raised hover:bg-[#222226] text-fade hover:text-pale flex items-center justify-center transition-colors"
              >
                <X size={10} />
              </button>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

// Hook to wire up global handlers — call once at app root
export function useUpgradeModal(
  setOpen: (open: boolean) => void,
  setMode: (mode: 'upgrade' | 'login') => void
) {
  useEffect(() => {
    setUpgradeHandler(() => { setMode('upgrade'); setOpen(true); });
    setLoginRequiredHandler(() => { setMode('login'); setOpen(true); });
  }, [setOpen, setMode]);
}
