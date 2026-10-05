'use client';

import { FlameIcon } from '@/components/ui/icons';
import { computeStreak, useStudyStats } from '@/lib/study-stats';

/** Header chip. Renders nothing until there is a streak worth showing. */
export function StreakBadge() {
  const streak = computeStreak(useStudyStats());
  if (streak === 0) return null;

  const label = `${streak}-day study streak`;
  return (
    <span
      title={label}
      aria-label={label}
      className="inline-flex h-8 items-center gap-1 rounded-md border bg-background px-2 text-xs font-medium tabular-nums"
    >
      <FlameIcon className="size-3.5 text-warning" />
      {streak}
    </span>
  );
}
