import { motion } from 'framer-motion';

function gradeColor(grade: string) {
  if (grade === 'A+' || grade === 'A')  return 'text-[#E8321A] border-[#E8321A]/40';
  if (grade === 'A-')                   return 'text-[#E8321A]/75 border-[#E8321A]/25';
  if (grade.startsWith('B'))            return 'text-[#F2EFE8] border-[#3A3A3A]';
  if (grade.startsWith('C'))            return 'text-[#8A8A8A] border-[#2A2A2A]';
  if (grade.startsWith('D'))            return 'text-[#555555] border-[#222222]';
  return 'text-[#333333] border-[#1E1E1E]';
}

export function GradeChip({ grade, size = 'sm' }: { grade: string; size?: 'sm' | 'lg' }) {
  return (
    <motion.span
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={`inline-flex items-center justify-center border font-display font-black bg-transparent ${gradeColor(grade)} ${
        size === 'lg'
          ? 'text-5xl w-16 h-16 tracking-tight'
          : 'text-sm px-2 py-0.5 tracking-wider'
      }`}
    >
      {grade}
    </motion.span>
  );
}
