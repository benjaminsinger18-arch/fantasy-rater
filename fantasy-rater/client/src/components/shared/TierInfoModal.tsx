import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export const TIER_INFO = [
  {
    key: 's',
    short: 'S',
    name: 'S Tier',
    range: '90–100',
    color: '#E8321A',
    desc: 'Elite. Untouchable asset — first name on any roster, never trade.',
  },
  {
    key: 'a',
    short: 'A',
    name: 'A Tier',
    range: '75–89',
    color: '#C8882A',
    desc: 'Excellent. Must-start every week; backbone of a championship roster.',
  },
  {
    key: 'b',
    short: 'B',
    name: 'B Tier',
    range: '55–74',
    color: '#5090D8',
    desc: 'Good. Reliable starter in most formats with real weekly upside.',
  },
  {
    key: 'c',
    short: 'C',
    name: 'C Tier',
    range: '35–54',
    color: '#4DC878',
    desc: 'Average. Flex-worthy plug-in; solid in favorable matchups.',
  },
  {
    key: 'd',
    short: 'D',
    name: 'D Tier',
    range: '20–34',
    color: '#9BA4B5',
    desc: 'Below average. Bench depth or streaming target in a pinch.',
  },
  {
    key: 'e',
    short: 'E',
    name: 'E Tier',
    range: '8–19',
    color: '#C4A882',
    desc: 'Weak. Emergency-only start; likely droppable in most leagues.',
  },
  {
    key: 'f',
    short: 'F',
    name: 'F Tier',
    range: '0–7',
    color: '#555555',
    desc: 'Poor. Waiver-wire level — likely available in your league.',
  },
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function TierInfoModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={e => { e.stopPropagation(); onClose(); }}
          />
          <motion.div
            className="fixed z-[101] top-1/2 left-1/2 w-[min(92vw,380px)]"
            style={{ translateX: '-50%', translateY: '-50%' }}
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 6 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          >
            <div className="bg-[#0E0E0E] border border-[#2A2A2A] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A2A2A]">
                <div>
                  <h2 className="font-display text-sm tracking-widest text-[#F2EFE8]">PLAYER TIERS</h2>
                  <p className="text-[10px] font-mono text-[#555555] mt-0.5">Based on composite fantasy value score</p>
                </div>
                <motion.button
                  onClick={onClose}
                  className="w-7 h-7 flex items-center justify-center text-[#555555] hover:text-[#F2EFE8] border border-[#2A2A2A] hover:border-[#3A3A3A] transition-colors"
                  whileTap={{ scale: 0.88 }}
                >
                  <X size={12} />
                </motion.button>
              </div>

              {/* Tier rows */}
              <div className="divide-y divide-[#1A1A1A]">
                {TIER_INFO.map(({ short, name, range, color, desc }, i) => (
                  <motion.div
                    key={short}
                    className="flex items-start gap-3 px-4 py-2.5"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.04 + i * 0.035, type: 'spring', stiffness: 400, damping: 30 }}
                  >
                    {/* Color swatch */}
                    <div
                      className="w-0.5 self-stretch flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: color }}
                    />
                    {/* Labels */}
                    <div className="w-8 flex-shrink-0 pt-0.5">
                      <div className="text-[11px] font-mono font-bold" style={{ color }}>{short}</div>
                      <div className="text-[9px] font-mono text-[#444444] mt-0.5">{range}</div>
                    </div>
                    {/* Name + desc */}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-display tracking-wider text-[#F2EFE8]">{name}</div>
                      <div className="text-[10px] font-mono text-[#666666] mt-0.5 leading-snug">{desc}</div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-[#2A2A2A] bg-[#0A0A0A]">
                <p className="text-[9px] font-mono text-[#3A3A3A] text-center tracking-wider">
                  SCORES ARE RELATIVE TO POSITION AND LEAGUE FORMAT
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
