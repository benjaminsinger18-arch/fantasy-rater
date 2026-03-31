import { motion } from 'framer-motion';

function gradeColor(grade: string) {
  if (grade.startsWith('A')) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/20';
  if (grade.startsWith('B')) return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
  if (grade.startsWith('C')) return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  if (grade.startsWith('D')) return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
  return 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm shadow-rose-500/20';
}

export function GradeChip({ grade, size = 'sm' }: { grade: string; size?: 'sm' | 'lg' }) {
  return (
    <motion.span
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      className={`inline-flex items-center justify-center border font-display font-bold ${gradeColor(grade)} ${
        size === 'lg' ? 'text-3xl w-16 h-16 rounded-2xl' : 'text-sm px-2 py-0.5 rounded-lg'
      }`}
    >
      {grade}
    </motion.span>
  );
}
