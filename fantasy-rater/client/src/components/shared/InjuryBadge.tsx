const STATUS_STYLES: Record<string, string> = {
  out: 'bg-red-500/20 text-red-400',
  ir: 'bg-red-500/20 text-red-400',
  pup: 'bg-red-500/20 text-red-400',
  doubtful: 'bg-orange-500/20 text-orange-400',
  dtd: 'bg-orange-500/20 text-orange-400',
  questionable: 'bg-yellow-500/20 text-yellow-400',
  ques: 'bg-yellow-500/20 text-yellow-400',
};

export function InjuryBadge({ status }: { status: string }) {
  const key = status.toLowerCase();
  const style = STATUS_STYLES[key] ?? 'bg-gray-500/20 text-gray-400';
  return (
    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded uppercase ${style}`}>
      {status}
    </span>
  );
}
