import { useEffect } from 'react';
import { setUpgradeHandler, setLoginRequiredHandler, startCheckout } from '../../lib/api.ts';
import { useClerk } from '@clerk/clerk-react';

interface Props {
  open: boolean;
  mode: 'upgrade' | 'login';
  onClose: () => void;
}

const FEATURES = [
  { label: 'Trade Rater', free: '3/day', pro: 'Unlimited' },
  { label: 'Team Rater', free: '2/day', pro: 'Unlimited' },
  { label: 'Start/Sit Optimizer', free: '2/day', pro: 'Unlimited' },
  { label: 'Waiver Wire Picks', free: '✗', pro: '✓' },
  { label: 'Draft Assistant', free: '✗', pro: '✓' },
  { label: 'Player Rankings', free: '✓', pro: '✓' },
  { label: 'Rankings AI Analysis', free: '✗', pro: '✓' },
  { label: 'League Predictor', free: '✗', pro: '✓' },
  { label: 'Roster Import', free: '✗', pro: '✓' },
  { label: 'My Leagues', free: '1', pro: 'Unlimited' },
  { label: 'Injury Alerts', free: 'Email', pro: 'Email + Push' },
];

export function UpgradeModal({ open, mode, onClose }: Props) {
  const { openSignIn } = useClerk();

  if (!open) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/60 rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-black/50"
        onClick={e => e.stopPropagation()}
      >
        {mode === 'login' ? (
          <>
            <div className="text-center mb-6">
              <div className="text-3xl mb-2">🔒</div>
              <h2 className="text-xl font-black text-white">Sign in to continue</h2>
              <p className="text-slate-400 text-sm mt-1">Create a free account to rate trades and teams</p>
            </div>
            <button
              onClick={handleLogin}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl transition-all"
            >
              Sign In / Sign Up — Free
            </button>
          </>
        ) : (
          <>
            <div className="text-center mb-5">
              <div className="text-3xl mb-2">⚡</div>
              <h2 className="text-xl font-black text-white">Upgrade to Pro</h2>
              <p className="text-slate-400 text-sm mt-1">Unlock unlimited AI analysis</p>
            </div>

            <div className="mb-5 rounded-xl overflow-hidden border border-slate-700/40">
              <div className="grid grid-cols-3 text-xs font-bold uppercase tracking-wider bg-slate-800/60 px-3 py-2">
                <span className="text-slate-400">Feature</span>
                <span className="text-slate-400 text-center">Free</span>
                <span className="text-violet-400 text-center">Pro</span>
              </div>
              {FEATURES.map(f => (
                <div key={f.label} className="grid grid-cols-3 px-3 py-2 border-t border-slate-700/30 text-sm">
                  <span className="text-slate-300">{f.label}</span>
                  <span className={`text-center ${f.free === '✗' ? 'text-slate-600' : 'text-slate-400'}`}>{f.free}</span>
                  <span className={`text-center font-semibold ${f.pro === '✓' || f.pro === 'Unlimited' ? 'text-violet-400' : 'text-slate-400'}`}>{f.pro}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleUpgrade}
              className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-violet-500/25"
            >
              Upgrade to Pro — $7.99/mo
            </button>
            <p className="text-center text-slate-600 text-xs mt-2">Cancel anytime</p>
          </>
        )}

        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center text-sm transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
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
