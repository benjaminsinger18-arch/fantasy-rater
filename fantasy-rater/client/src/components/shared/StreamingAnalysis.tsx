import { useEffect, useRef, useState } from 'react';

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
    <div className="text-red-400 text-sm bg-red-500/10 rounded-lg p-3">{error}</div>
  );

  return (
    <div className="min-w-0 w-full">
      {loading && !text && (
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <span className="animate-spin">⟳</span> Analyzing...
        </div>
      )}
      {text && (
        <div className="text-gray-200 text-sm leading-relaxed break-words overflow-wrap-anywhere whitespace-pre-wrap">
          {text}
          {loading && <span className="animate-pulse ml-0.5">▋</span>}
        </div>
      )}
    </div>
  );
}
