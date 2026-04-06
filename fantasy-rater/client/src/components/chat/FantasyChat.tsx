import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageCircle, Loader2, Trash2 } from 'lucide-react';
import { streamChatMessage } from '../../lib/api.ts';
import { useLeague } from '../../lib/LeagueContext.tsx';
import { ChatMessage } from './ChatMessage.tsx';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_PROMPTS = [
  'Rate my team overall',
  'Best waiver pickup this week?',
  'What is my biggest positional weakness?',
  'Give me a bold trade to make',
];

function storageKey(sport: string) {
  return `fantasy-rater-chat-${sport}`;
}

function loadHistory(sport: string): Message[] {
  try {
    const raw = localStorage.getItem(storageKey(sport));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(sport: string, messages: Message[]) {
  try {
    localStorage.setItem(storageKey(sport), JSON.stringify(messages.slice(-40)));
  } catch { /* quota exceeded — ignore */ }
}

export function FantasyChat() {
  const { config } = useLeague();
  const [messages, setMessages] = useState<Message[]>(() => loadHistory(config.sport));
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<boolean>(false);
  const [roster, setRoster] = useState<Array<{
    name: string; position: string; team: string;
    injuryStatus?: string | null; avgPoints?: number; rank?: number;
  }> | undefined>(undefined);

  // Reset history when sport changes
  useEffect(() => {
    setMessages(loadHistory(config.sport));
    setStreamingText('');
    setStreaming(false);
    setRoster(undefined);
  }, [config.sport]);

  // Fetch roster from connected platform to give AI current player context
  useEffect(() => {
    if (!config.leagueId) return;
    const apiBase = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');

    let url = '';
    if (config.sport === 'fpl' && config.fplManagerId) {
      url = `${apiBase}/team/import/fpl?managerId=${config.fplManagerId}&gameweek=${config.currentWeek}`;
    } else if (config.platform === 'sleeper') {
      url = `${apiBase}/team/import/sleeper?leagueId=${config.leagueId}${config.myRosterId ? `&rosterId=${config.myRosterId}` : ''}`;
    } else if (config.platform === 'espn') {
      url = `${apiBase}/team/import/espn?leagueId=${config.leagueId}&sport=${config.sport}${config.myRosterId ? `&rosterId=${config.myRosterId}` : ''}`;
    }

    if (!url) return;

    fetch(url, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.roster) setRoster(data.roster);
      })
      .catch(() => {}); // non-fatal — chat works fine without roster
  }, [config.leagueId, config.sport, config.platform, config.myRosterId, config.fplManagerId, config.currentWeek]);

  // Persist history
  useEffect(() => {
    if (messages.length) saveHistory(config.sport, messages);
  }, [messages, config.sport]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const buildContext = useCallback(() => ({
    sport: config.sport,
    scoringFormat: config.scoringFormat,
    leagueSize: config.leagueSize,
    currentWeek: config.currentWeek,
    roster,
  }), [config, roster]);

  async function send(text: string) {
    if (!text.trim() || streaming) return;
    const userMsg: Message = { role: 'user', content: text.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setStreaming(true);
    setStreamingText('');
    abortRef.current = false;

    let full = '';
    try {
      await streamChatMessage(
        { messages: next, context: buildContext() },
        (chunk) => {
          if (abortRef.current) return;
          full += chunk;
          setStreamingText(full);
        },
        () => {
          setMessages(prev => [...prev, { role: 'assistant', content: full }]);
          setStreamingText('');
          setStreaming(false);
        },
        (err) => {
          setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err}` }]);
          setStreamingText('');
          setStreaming(false);
        },
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Something went wrong';
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${msg}` }]);
      setStreamingText('');
      setStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  function clearHistory() {
    localStorage.removeItem(storageKey(config.sport));
    setMessages([]);
    setStreamingText('');
  }

  const allMessages = streamingText
    ? [...messages, { role: 'assistant' as const, content: streamingText }]
    : messages;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-4 md:px-5 pt-4 md:pt-5 pb-3 border-b border-[#2A2A2A] flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-black text-[#F2EFE8] tracking-wider">AI Advisor</h1>
          <p className="text-[10px] font-mono text-[#555555] mt-0.5">Your personal fantasy {config.sport.toUpperCase()} expert</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearHistory}
            className="flex items-center gap-1 text-[10px] font-mono text-[#444444] hover:text-[#E8321A] transition-colors mt-1"
          >
            <Trash2 size={11} /> Clear
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-5 py-4 space-y-4 min-h-0">
        {allMessages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full gap-4 py-8"
          >
            <div className="w-12 h-12 border border-[#484850] flex items-center justify-center">
              <MessageCircle size={22} className="text-[#484850]" />
            </div>
            <div className="text-center">
              <p className="text-sm font-display font-black text-[#F2EFE8] tracking-wider mb-1">Ask anything</p>
              <p className="text-xs font-mono text-[#444444]">Trade advice, start/sit, waiver pickups, roster analysis</p>
            </div>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {allMessages.map((msg, i) => {
            const isStreaming = streaming && i === allMessages.length - 1 && msg.role === 'assistant';
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
              >
                <ChatMessage role={msg.role} content={msg.content} streaming={isStreaming} />
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts — show only when no messages or just started */}
      {allMessages.length === 0 && (
        <div className="flex-shrink-0 px-4 md:px-5 pb-3 flex gap-2 flex-wrap">
          {QUICK_PROMPTS.map(p => (
            <motion.button
              key={p}
              whileTap={{ scale: 0.96 }}
              onClick={() => send(p)}
              disabled={streaming}
              className="px-2.5 py-1.5 text-[10px] font-mono border border-[#484850] text-[#8A8A8A] hover:text-[#F2EFE8] hover:border-[#E8321A]/40 transition-colors disabled:opacity-40"
            >
              {p}
            </motion.button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 px-4 md:px-5 pb-4 md:pb-5 pt-2 border-t border-[#2A2A2A]">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={streaming}
            rows={1}
            placeholder="Ask about your roster, trades, start/sit..."
            className="flex-1 input-base resize-none py-2.5 leading-relaxed min-h-[42px] max-h-32 overflow-y-auto"
            style={{ height: 'auto' }}
            onInput={e => {
              const t = e.currentTarget;
              t.style.height = 'auto';
              t.style.height = `${Math.min(t.scrollHeight, 128)}px`;
            }}
          />
          <button
            onClick={() => send(input)}
            disabled={streaming || !input.trim()}
            className="w-10 h-10 flex-shrink-0 bg-[#E8321A] hover:bg-[#C82818] disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
          >
            {streaming
              ? <Loader2 size={14} className="animate-spin" />
              : <Send size={14} />
            }
          </button>
        </div>
        <p className="text-[9px] font-mono text-[#333333] mt-1.5">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
