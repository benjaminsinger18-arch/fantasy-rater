import { useEffect, useRef, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

interface Props {
  hash: string;
  onComplete?: () => void;
}

export function StreamingAnalysis({ hash, onComplete }: Props) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!hash) return;
    setText('');
    setLoading(true);
    setError('');

    const base = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');
    const es = new EventSource(`${base}/analyze/stream?hash=${hash}`);
    esRef.current = es;

    es.onmessage = (e) => {
      if (e.data === '[DONE]') {
        setLoading(false);
        es.close();
        onComplete?.();
        return;
      }
      try {
        const parsed = JSON.parse(e.data);
        if (parsed.error) {
          setError(parsed.error);
          setLoading(false);
          es.close();
        } else if (parsed.text) {
          setText(prev => prev + parsed.text);
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      setError('Connection lost. Please try again.');
      setLoading(false);
      es.close();
    };

    return () => es.close();
  }, [hash]);

  if (error) return (
    <div className="text-rose-300 text-sm bg-rose-500/10 rounded-xl p-4 border border-rose-500/20 flex items-start gap-2">
      <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-rose-400" />
      {error}
    </div>
  );

  return (
    <div className="min-w-0 w-full">
      {loading && !text && (
        <div className="flex items-center gap-2.5 text-slate-400 text-sm">
          <Loader2 size={14} className="animate-spin text-indigo-400" />
          <span className="text-slate-500">Analyzing...</span>
        </div>
      )}
      {text && (
        <div className="text-slate-300 text-sm leading-7 break-words whitespace-pre-wrap font-body tracking-wide">
          {text}
          {loading && (
            <span className="inline-block w-0.5 h-4 bg-indigo-400 ml-0.5 animate-pulse align-middle" />
          )}
        </div>
      )}
    </div>
  );
}
