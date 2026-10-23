import { DIFFICULTY_LABELS, DIFFICULTY_RANK, type Difficulty } from '@campuskit/project-catalog';

import { cn } from '../lib/cn.ts';

/**
 * Difficulty as one to three filled bars next to its name. The bars are
 * decoration; the word carries the meaning, so nothing depends on colour.
 */
export function DifficultyMeter({
  difficulty,
  className,
}: {
  difficulty: Difficulty;
  className?: string;
}) {
  const level = DIFFICULTY_RANK[difficulty] + 1;
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span aria-hidden="true" className="inline-flex items-end gap-0.5">
        {[1, 2, 3].map((bar) => (
          <span
            key={bar}
            className={cn(
              'w-1 rounded-full',
              bar === 1 ? 'h-1.5' : bar === 2 ? 'h-2.5' : 'h-3.5',
              bar <= level ? 'bg-violet' : 'bg-line-strong',
            )}
          />
        ))}
      </span>
      {DIFFICULTY_LABELS[difficulty]}
    </span>
  );
}
