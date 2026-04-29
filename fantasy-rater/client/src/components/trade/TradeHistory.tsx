import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, History, ChevronDown, ChevronUp } from 'lucide-react';
import { getTradeHistory } from '../../lib/api.ts';

interface TradeRecord {
  id: number;
  sport: string;
  sideA: string[];
  sideB: string[];
  sideAScore: number;
  sideBScore: number;
  verdict: string;
  scoringFormat: string;
  createdAt: number;
  analysisHash: string | null;
  aiAnalysis: string | null;
}

const VERDICT_STYLE: Record<string, { color: string; bg: string }> = {
  'Great Deal':    { color: '#4DC878', bg: '#4DC878/10' },
  'Good Deal':     { color: '#4DC878', bg: '#4DC878/10' },
  'Toss Up':       { color: '#C8882A', bg: '#C8882A/10' },
  'Bad Deal':      { color: '#E8321A', bg: '#E8321A/10' },
  'Horrible Deal': { color: '#E8321A', bg: '#E8321A/10' },
};

function VerdictBadge({ verdict }: { verdict: string }) {
  const s = VERDICT_STYLE[verdict] ?? { color: '#555555', bg: '#555555/10' };
  return (
    <span
      className="text-[9px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.5 border"
      style={{ color: s.color, borderColor: s.color, backgroundColor: `${s.color}18` }}
    >
      {verdict}
    </span>
  );
}

function relativeTime(ts: number): string {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(ts * 1000).toLocaleDateString();
}

export function TradeHistory() {
  const [history, setHistory] = useState<TradeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    getTradeHistory()
      .then(setHistory)
      .catch(() => setError('Failed to load history'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={18} className="animate-spin text-[#E8321A]" />
      </div>
    );
  }

  if (error) {
    return <p className="text-rose-400 text-xs font-mono text-center py-8">{error}</p>;
  }

  if (!history.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <History size={28} className="text-[#2A2A2A]" />
        <p className="text-xs font-mono text-[#444444]">No trades rated yet — rate a trade to see it here</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {history.map((trade, i) => (
        <motion.div
          key={trade.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
          className="card-base p-3 border-l-4"
          style={{ borderLeftColor: VERDICT_STYLE[trade.verdict]?.color ?? '#484850' }}
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <VerdictBadge verdict={trade.verdict} />
            <span className="text-[9px] font-mono text-[#444444] flex-shrink-0">{relativeTime(trade.createdAt)}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Side A — what I give */}
            <div>
              <p className="text-[9px] font-mono text-[#555555] uppercase tracking-widest mb-1">You give</p>
              {trade.sideA.map(name => (
                <p key={name} className="text-[11px] font-display font-black text-[#F2EFE8] truncate">{name}</p>
              ))}
              <p className="text-[10px] font-mono text-[#555555] mt-0.5">Score: {trade.sideAScore}</p>
            </div>
            {/* Side B — what I get */}
            <div>
              <p className="text-[9px] font-mono text-[#555555] uppercase tracking-widest mb-1">You get</p>
              {trade.sideB.map(name => (
                <p key={name} className="text-[11px] font-display font-black text-[#F2EFE8] truncate">{name}</p>
              ))}
              <p className="text-[10px] font-mono text-[#555555] mt-0.5">Score: {trade.sideBScore}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <span className="text-[9px] font-mono text-[#444444] uppercase">{trade.sport}</span>
            <span className="text-[#333333]">·</span>
            <span className="text-[9px] font-mono text-[#444444]">{trade.scoringFormat}</span>
          </div>

          {trade.aiAnalysis && (
            <div className="mt-2 border-t border-[#2A2A2A] pt-2">
              <button
                onClick={() => setExpandedId(expandedId === trade.id ? null : trade.id)}
                className="flex items-center gap-1 text-[9px] font-mono text-[#555555] hover:text-[#E8321A] transition-colors uppercase tracking-widest"
              >
                {expandedId === trade.id ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                AI Analysis
              </button>
              {expandedId === trade.id && (
                <p className="text-[11px] font-mono text-[#AAAAAA] mt-2 leading-relaxed">
                  {trade.aiAnalysis}
                </p>
              )}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
