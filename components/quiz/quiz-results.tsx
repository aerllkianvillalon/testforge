'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Confetti } from '@/components/ui/confetti';
import { ChevronDownIcon, UndoIcon } from '@/components/ui/icons';
import { recordActivity } from '@/lib/study-stats';
import type { QuizItem } from '@/lib/ai/schemas';

const CELEBRATE_AT = 80; // percent
const RING_RADIUS = 52;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function QuizResults({
  items,
  order,
  score,
  answers,
  picks,
  onRestart,
  focus,
  onExitFocus,
  trackStats,
}: {
  items: QuizItem[];
  /** The order the questions were asked in; `answers`/`picks` are in this order. */
  order: number[];
  score: number;
  answers: boolean[];
  picks: number[];
  onRestart: () => void;
  focus: boolean;
  onExitFocus: () => void;
  trackStats: boolean;
}) {
  const total = answers.length;
  const percent = total === 0 ? 0 : Math.round((score / total) * 100);
  const missed = answers.map((correct, i) => (correct ? null : i)).filter((n): n is number => n !== null);
  const recorded = useRef(false);

  // Count the finished quiz once toward the study stats.
  useEffect(() => {
    if (!trackStats || recorded.current || total === 0) return;
    recorded.current = true;
    recordActivity({ questions: total, correct: score });
  }, [trackStats, total, score]);

  // Start the ring empty and fill it on the next frame so it animates in.
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(percent));
    return () => cancelAnimationFrame(frame);
  }, [percent]);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      {percent >= CELEBRATE_AT ? <Confetti /> : null}

      <Card className="animate-reveal">
        <CardBody className="flex flex-col items-center gap-6 py-10 text-center">
          <div className="relative size-36">
            <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
              <circle cx="60" cy="60" r={RING_RADIUS} fill="none" strokeWidth="9" className="stroke-secondary" />
              <circle
                cx="60"
                cy="60"
                r={RING_RADIUS}
                fill="none"
                strokeWidth="9"
                strokeLinecap="round"
                className="stroke-primary transition-[stroke-dashoffset] duration-1000 ease-out"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={RING_CIRCUMFERENCE * (1 - shown / 100)}
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <span className="text-3xl font-semibold tabular-nums tracking-tight">{percent}%</span>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold tracking-tight">
              {score} of {total} correct
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {missed.length === 0
                ? 'No misses.'
                : `Questions you missed: ${missed.map((i) => i + 1).join(', ')}.`}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="secondary" onClick={onRestart}>
              <UndoIcon />
              Take it again
            </Button>
            {focus ? (
              <Button variant="ghost" onClick={onExitFocus}>
                Exit focus
              </Button>
            ) : null}
          </div>
        </CardBody>
      </Card>

      {missed.length > 0 ? (
        <section aria-labelledby="missed-heading" className="space-y-3">
          <h4 id="missed-heading" className="text-sm font-medium">
            Worth another look
          </h4>
          <div className="space-y-2">
            {missed.map((i) => (
              <MissedQuestion key={i} number={i + 1} item={items[order[i]]} pickedIndex={picks[i]} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function MissedQuestion({ number, item, pickedIndex }: { number: number; item: QuizItem; pickedIndex: number }) {
  return (
    <details className="group rounded-lg border bg-card open:shadow-sm">
      <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-3 text-sm [&::-webkit-details-marker]:hidden">
        <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded bg-destructive/10 text-[0.7rem] font-medium text-destructive">
          {number}
        </span>
        <span className="flex-1 leading-relaxed">{item.question}</span>
        <ChevronDownIcon className="mt-1 size-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-2 border-t px-4 py-3 text-sm leading-relaxed">
        <p>
          <span className="text-muted-foreground">You chose: </span>
          <span className="text-destructive">{item.options[pickedIndex]}</span>
        </p>
        <p>
          <span className="text-muted-foreground">Correct answer: </span>
          <span className="font-medium text-success">{item.options[item.correctIndex]}</span>
        </p>
        <p className="text-muted-foreground">{item.explanation}</p>
      </div>
    </details>
  );
}
