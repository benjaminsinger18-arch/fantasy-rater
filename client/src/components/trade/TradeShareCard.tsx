import { forwardRef } from 'react';
import type { Player, TradeScore } from '../../types/index.ts';

interface Props {
  score: TradeScore;
  sideA: Player[];
  sideB: Player[];
  sport: string;
  scoringFormat: string;
  imageUrls?: { sideA: (string | null)[]; sideB: (string | null)[] };
}

const VERDICT_COLORS: Record<string, { bg: string; accent: string; glow: string; text: string; icon: string }> = {
  'Great Deal':    { bg: '#022c22', accent: '#10b981', glow: '#10b98130', text: '#6ee7b7', icon: '🔥' },
  'Good Deal':     { bg: '#042f2e', accent: '#14b8a6', glow: '#14b8a630', text: '#5eead4', icon: '✅' },
  'Toss Up':       { bg: '#2d1d00', accent: '#f59e0b', glow: '#f59e0b30', text: '#fcd34d', icon: '⚖️' },
  'Bad Deal':      { bg: '#2d1200', accent: '#f97316', glow: '#f9731630', text: '#fdba74', icon: '⚠️' },
  'Horrible Deal': { bg: '#1f0708', accent: '#ef4444', glow: '#ef444430', text: '#fca5a5', icon: '🚨' },
};

function PlayerRow({ player, photoSrc, accentColor, labelColor }: {
  player: Player;
  photoSrc: string | null | undefined;
  accentColor: string;
  labelColor: string;
}) {
  const lastName = player.name.split(' ').slice(-1)[0].toUpperCase();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
        border: `2px solid ${accentColor}50`,
        background: 'linear-gradient(135deg, #1e293b, #0f172a)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {photoSrc ? (
          <img src={photoSrc} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
        ) : (
          <span style={{ color: accentColor, fontWeight: 900, fontSize: 12 }}>{player.position}</span>
        )}
      </div>
      <div>
        <div style={{ color: '#f1f5f9', fontWeight: 900, fontSize: 15, letterSpacing: 0.5, lineHeight: 1.2 }}>{lastName}</div>
        <div style={{ color: labelColor, fontSize: 11, marginTop: 1 }}>
          {player.position}{player.team ? ` · ${player.team}` : ''}
        </div>
      </div>
    </div>
  );
}

export const TradeShareCard = forwardRef<HTMLDivElement, Props>(
  ({ score, sideA, sideB, sport, scoringFormat, imageUrls }, ref) => {
    const vc = VERDICT_COLORS[score.verdict] ?? VERDICT_COLORS['Toss Up'];
    const sportLabel = sport === 'nfl' ? 'NFL' : sport === 'mlb' ? 'MLB' : sport === 'fpl' ? 'FPL' : sport.toUpperCase();

    return (
      <div
        ref={ref}
        style={{
          width: 600,
          height: 315,
          background: 'linear-gradient(135deg, #0c1427 0%, #111827 50%, #0c1427 100%)',
          borderRadius: 16,
          overflow: 'hidden',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          border: `1px solid ${vc.accent}35`,
        }}
      >
        {/* Radial glow based on verdict */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(ellipse 60% 40% at 50% 0%, ${vc.glow} 0%, transparent 70%)`,
        }} />

        {/* Top accent bar */}
        <div style={{ height: 3, background: `linear-gradient(90deg, transparent 0%, ${vc.accent} 40%, ${vc.accent} 60%, transparent 100%)`, flexShrink: 0 }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 22px 10px', position: 'relative', flexShrink: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: vc.bg, border: `1px solid ${vc.accent}55`,
            borderRadius: 12, padding: '7px 16px',
          }}>
            <span style={{ fontSize: 22 }}>{vc.icon}</span>
            <span style={{ color: vc.text, fontWeight: 900, fontSize: 19, letterSpacing: 1.5 }}>
              {score.verdict.toUpperCase()}
            </span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#e2e8f0', fontWeight: 900, fontSize: 15, letterSpacing: 0.5 }}>FantasyRater</div>
            <div style={{ color: '#475569', fontSize: 11 }}>fantasyrater.app</div>
          </div>
        </div>

        {/* Players section */}
        <div style={{ display: 'flex', flex: 1, padding: '4px 22px 0', gap: 14, position: 'relative', alignItems: 'flex-start' }}>
          {/* Side A — You Give */}
          <div style={{ flex: 1, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '10px 14px' }}>
            <div style={{ color: '#f87171', fontSize: 9, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>
              You Give
            </div>
            {sideA.map((p, i) => (
              <PlayerRow
                key={i}
                player={p}
                photoSrc={imageUrls?.sideA[i]}
                accentColor="#ef4444"
                labelColor="#94a3b8"
              />
            ))}
          </div>

          {/* Center — scores + arrow */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: 58, paddingTop: 28 }}>
            <div style={{ color: '#f87171', fontWeight: 900, fontSize: 28, lineHeight: 1 }}>{score.sideAScore}</div>
            <div style={{ color: '#334155', fontSize: 20, margin: '6px 0' }}>⇄</div>
            <div style={{ color: '#34d399', fontWeight: 900, fontSize: 28, lineHeight: 1 }}>{score.sideBScore}</div>
          </div>

          {/* Side B — You Receive */}
          <div style={{ flex: 1, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '10px 14px' }}>
            <div style={{ color: '#34d399', fontSize: 9, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>
              You Receive
            </div>
            {sideB.map((p, i) => (
              <PlayerRow
                key={i}
                player={p}
                photoSrc={imageUrls?.sideB[i]}
                accentColor="#10b981"
                labelColor="#94a3b8"
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 22px 12px', position: 'relative',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          marginTop: 8,
        }}>
          <span style={{ color: '#334155', fontSize: 10 }}>Rate trades free at fantasyrater.app</span>
          <span style={{ color: '#334155', fontSize: 10 }}>{sportLabel} · {scoringFormat}</span>
        </div>
      </div>
    );
  }
);

TradeShareCard.displayName = 'TradeShareCard';
