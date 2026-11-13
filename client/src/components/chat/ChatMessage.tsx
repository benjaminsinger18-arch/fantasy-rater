interface Props {
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

export function ChatMessage({ role, content, streaming }: Props) {
  const isAi = role === 'assistant';
  return (
    <div className={`flex gap-2.5 ${isAi ? '' : 'flex-row-reverse'}`}>
      <div className={`w-5 h-5 flex-shrink-0 flex items-center justify-center text-[8px] font-mono font-bold border mt-0.5 ${
        isAi ? 'border-signal text-signal' : 'border-rim text-fade'
      }`}>
        {isAi ? 'AI' : 'ME'}
      </div>
      <div className={`max-w-[85%] ${isAi ? '' : 'items-end'}`}>
        <div className={`text-[13px] leading-[1.65] whitespace-pre-wrap break-words font-serif ${
          isAi ? 'text-[#C8C4BC]' : 'text-soft text-right'
        }`}>
          {content}
          {streaming && (
            <span className="inline-block w-px h-3.5 bg-signal ml-0.5 animate-pulse align-middle" />
          )}
        </div>
      </div>
    </div>
  );
}
