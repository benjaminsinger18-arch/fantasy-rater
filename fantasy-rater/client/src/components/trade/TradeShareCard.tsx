import { forwardRef } from 'react';
import type { Player, TradeScore } from '../../types/index.ts';

interface Props {
  score: TradeScore;
  sideA: Player[];
  sideB: Player[];
  sport: string;
  scoringFormat: string;
}

const VERDICT_COLORS: Record<string, { bg: string; accent: string; text: string; icon: string }> = {
  'Great Deal':    { bg: '#022c22', accent: '#10b981', text: '#6ee7b7', icon: '🔥' },
  'Good Deal':     { bg: '#042f2e', accent: '#14b8a6', text: '#5eead4', icon: '✅' },
  'Toss Up':       { bg: '#2d1d00', accent: '#f59e0b', text: '#fcd34d', icon: '⚖️' },
  'Bad Deal':      { bg: '#2d1200', accent: '#f97316', text: '#fdba74', icon: '⚠️' },
  'Horrible Deal': { bg: '#1f0708', accent: '#ef4444', text: '#fca5a5', icon: '🚨' },
};

export const TradeShareCard = forwardRef<HTMLDivElement, Props>(
  ({ score, sideA, sideB, sport, scoringFormat }, ref) => {
    const vc = VERDICT_COLORS[score.verdict] ?? VERDICT_COLORS['Toss Up'];

    const sportLabel = sport === 'nfl' ? 'NFL' : sport === 'mlb' ? 'MLB' : sport === 'fpl' ? 'FPL' : sport.toUpperCase();

    return (
      <div
        ref={ref}
        style={{
          width: 600,
          height: 315,
          background: '#0f172a',
          borderRadius: 16,
          overflow: 'hidden',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          border: `1px solid ${vc.accent}40`,
        }}
      >
        {/* Accent top bar */}
        <div style={{ height: 4, background: `linear-gradient(90deg, ${vc.accent}, transparent)` }} />

        {/* Header row: verdict + branding */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px 10px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: vc.bg, border: `1px solid ${vc.accent}60`,
            borderRadius: 10, padding: '6px 14px',
          }}>
            <span style={{ fontSize: 20 }}>{vc.icon}</span>
            <span style={{ color: vc.text, fontWeight: 900, fontSize: 18, letterSpacing: 1 }}>
              {score.verdict.toUpperCase()}
            </span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#e2e8f0', fontWeight: 900, fontSize: 15, letterSpacing: 0.5 }}>FantasyRater</div>
            <div style={{ color: '#64748b', fontSize: 11 }}>fantasyrater.app</div>
          </div>
        </div>

        {/* Player columns */}
        <div style={{ display: 'flex', flex: 1, padding: '0 20px', gap: 12 }}>
          {/* Side A — You Give */}
          <div style={{ flex: 1, background: '#1e1b28', border: '1px solid #ef444430', borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ color: '#f87171', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
              You Give
            </div>
            {sideA.map((p, i) => (
              <div key={i} style={{ marginBottom: 4 }}>
                <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 13 }}>{p.name}</span>
                <span style={{ color: '#94a3b8', fontSize: 11, marginLeft: 5 }}>{p.position}{p.team ? ` · ${p.team}` : ''}</span>
              </div>
            ))}
          </div>

          {/* Center arrow + scores */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, minWidth: 64 }}>
            <div style={{ color: '#f87171', fontWeight: 900, fontSize: 22 }}>{score.sideAScore}</div>
            <div style={{ color: '#475569', fontSize: 18, fontWeight: 700 }}>⇄</div>
            <div style={{ color: '#34d399', fontWeight: 900, fontSize: 22 }}>{score.sideBScore}</div>
          </div>

          {/* Side B — You Receive */}
          <div style={{ flex: 1, background: '#0d1f17', border: '1px solid #10b98130', borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ color: '#34d399', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
              You Receive
            </div>
            {sideB.map((p, i) => (
              <div key={i} style={{ marginBottom: 4 }}>
                <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 13 }}>{p.name}</span>
                <span style={{ color: '#94a3b8', fontSize: 11, marginLeft: 5 }}>{p.position}{p.team ? ` · ${p.team}` : ''}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px 14px', borderTop: '1px solid #1e293b' }}>
          <span style={{ color: '#475569', fontSize: 11 }}>Analyzed with AI · Rate your trades free</span>
          <span style={{ color: '#475569', fontSize: 11 }}>{sportLabel} · {scoringFormat}</span>
        </div>
      </div>
    );
  }
);

TradeShareCard.displayName = 'TradeShareCard';
