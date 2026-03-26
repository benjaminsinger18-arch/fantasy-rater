function gradeColor(grade: string) {
  if (grade.startsWith('A')) return 'bg-green-500/20 text-green-400 border-green-500/30';
  if (grade.startsWith('B')) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  if (grade.startsWith('C')) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  if (grade.startsWith('D')) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
  return 'bg-red-500/20 text-red-400 border-red-500/30';
}

export function GradeChip({ grade, size = 'sm' }: { grade: string; size?: 'sm' | 'lg' }) {
  return (
    <span className={`inline-flex items-center justify-center border rounded font-bold ${gradeColor(grade)} ${
      size === 'lg' ? 'text-3xl w-16 h-16 rounded-xl' : 'text-sm px-2 py-0.5'
    }`}>
      {grade}
    </span>
  );
}
