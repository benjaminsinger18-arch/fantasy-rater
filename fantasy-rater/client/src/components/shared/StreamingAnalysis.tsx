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
    <div className="text-[#E8321A] text-sm bg-[#E8321A]/5 p-4 border border-[#E8321A]/20 flex items-start gap-2 font-mono">
      <AlertCircle size={14} className="flex-shrink-0 mt-0.5 text-[#E8321A]" />
      {error}
    </div>
  );

  return (
    <div className="min-w-0 w-full">
      {loading && !text && (
        <div className="flex items-center gap-2.5 text-sm">
          <Loader2 size={13} className="animate-spin text-[#E8321A]" />
          <span className="text-[#444444] font-mono text-xs">Analyzing...</span>
        </div>
      )}
      {text && (
        <div className="text-[#C8C4BC] text-sm leading-7 break-words whitespace-pre-wrap font-serif tracking-normal">
          {text}
          {loading && (
            <span className="inline-block w-px h-4 bg-[#E8321A] ml-0.5 animate-pulse align-middle" />
          )}
        </div>
      )}
    </div>
  );
}
