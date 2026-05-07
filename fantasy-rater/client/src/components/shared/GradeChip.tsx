import { motion } from 'framer-motion';
import { IridescentBorder } from './IridescentBorder.tsx';

function gradeColor(grade: string) {
  if (grade.startsWith('B')) return 'text-[#F2EFE8] border-white/20';
  if (grade.startsWith('C')) return 'text-[#8A8A8A] border-white/10';
  if (grade.startsWith('D')) return 'text-[#555555] border-white/[0.06]';
  return 'text-[#333333] border-white/[0.04]';
}

export function GradeChip({ grade, size = 'sm' }: { grade: string; size?: 'sm' | 'lg' }) {
  const isTopGrade = grade === 'A+' || grade === 'A' || grade === 'A-';

  const chipContent = (
    <motion.span
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={`inline-flex items-center justify-center font-display font-black bg-transparent ${
        isTopGrade
          ? 'text-[#E8321A]'
          : `border ${gradeColor(grade)}`
      } ${
        size === 'lg'
          ? 'text-5xl w-16 h-16 tracking-tight'
          : 'text-sm px-2 py-0.5 tracking-wider'
      }`}
    >
      {grade}
    </motion.span>
  );

  if (isTopGrade) {
    return (
      <IridescentBorder innerStyle={{ background: 'rgba(12, 8, 14, 0.95)' }}>
        {chipContent}
      </IridescentBorder>
    );
  }

  return chipContent;
}
