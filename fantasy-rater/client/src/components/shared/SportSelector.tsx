import { useLeague } from '../../lib/LeagueContext.tsx';
import type { Sport } from '../../types/index.ts';

const SPORTS: { id: Sport; label: string; emoji: string }[] = [
  { id: 'nfl', label: 'NFL', emoji: '🏈' },
  { id: 'mlb', label: 'MLB', emoji: '⚾' },
  { id: 'fpl', label: 'FPL', emoji: '⚽' },
];

export function SportSelector() {
  const { config, setSport } = useLeague();

  return (
    <div className="flex gap-2">
      {SPORTS.map(s => (
        <button
          key={s.id}
          onClick={() => setSport(s.id)}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
            config.sport === s.id
              ? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
          }`}
        >
          {s.emoji} {s.label}
        </button>
      ))}
    </div>
  );
}
