'use client';

import { Card, CardBody } from '@/components/ui/card';
import { FlameIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { computeStreak, dayTotal, lastDays, useStudyStats } from '@/lib/study-stats';

/**
 * The week at a glance. Numbers come from this browser's own history (see
 * lib/study-stats.ts), so the panel says so rather than implying an account-wide record.
 */
export function StudyActivity() {
  const stats = useStudyStats();
  const hasAny = Object.values(stats.days).some((day) => dayTotal(day) > 0);

  if (!hasAny) {
    return (
      <Card className="mb-8 border-dashed shadow-none">
        <CardBody className="flex items-center gap-3 p-5 text-sm text-muted-foreground">
          <FlameIcon className="size-5" />
          Finish a round of flashcards or a quiz and your week of study shows up here.
        </CardBody>
      </Card>
    );
  }

  const week = lastDays(stats, 7);
  const streak = computeStreak(stats);
  const cards = week.reduce((sum, d) => sum + d.stats.cards, 0);
  const known = week.reduce((sum, d) => sum + d.stats.known, 0);
  const questions = week.reduce((sum, d) => sum + d.stats.questions, 0);
  const correct = week.reduce((sum, d) => sum + d.stats.correct, 0);
  const peak = Math.max(1, ...week.map((d) => d.total));

  return (
    <Card className="mb-8">
      <CardBody className="grid gap-6 p-5 sm:grid-cols-[1fr_auto] sm:items-end sm:p-6">
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-medium">Study activity</h2>
            <p className="text-xs text-muted-foreground">Last 7 days · kept on this device</p>
          </div>

          <dl className="mt-4 grid grid-cols-3 gap-4">
            <Stat label="Day streak" value={String(streak)} icon={streak > 0 ? <FlameIcon className="size-4 text-warning" /> : null} />
            <Stat label="Cards reviewed" value={String(cards)} hint={cards > 0 ? `${known} known` : undefined} />
            <Stat
              label="Quiz accuracy"
              value={questions > 0 ? `${Math.round((correct / questions) * 100)}%` : '—'}
              hint={questions > 0 ? `${correct} of ${questions}` : undefined}
            />
          </dl>
        </div>

        <div className="flex h-24 items-end gap-2 sm:w-64" role="img" aria-label={`Study activity over the last 7 days: ${week.map((d) => `${d.label} ${d.total}`).join(', ')}`}>
          {week.map((day) => (
            <div key={day.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5" title={`${day.label}: ${day.total} reviewed`}>
              <div className="flex w-full flex-1 items-end">
                <div
                  className={cn(
                    'w-full rounded-sm transition-[height] duration-500',
                    day.total === 0 ? 'bg-secondary' : day.isToday ? 'bg-primary' : 'bg-primary/35',
                  )}
                  style={{ height: day.total === 0 ? '4px' : `${Math.max(12, (day.total / peak) * 100)}%` }}
                />
              </div>
              <span className={cn('text-[0.65rem]', day.isToday ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                {day.label.slice(0, 2)}
              </span>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

function Stat({ label, value, hint, icon }: { label: string; value: string; hint?: string; icon?: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 flex items-center gap-1.5 text-2xl font-semibold tabular-nums tracking-tight">
        {icon}
        {value}
      </dd>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
