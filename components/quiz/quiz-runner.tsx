'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Confetti } from '@/components/ui/confetti';
import {
  ArrowRightIcon,
  CheckIcon,
  ChevronDownIcon,
  MaximizeIcon,
  MinimizeIcon,
  ShuffleIcon,
  SwapIcon,
  UndoIcon,
  VolumeIcon,
  XIcon,
} from '@/components/ui/icons';
import { recordActivity } from '@/lib/study-stats';
import { cn } from '@/lib/utils';
import type { QuizItem } from '@/lib/ai/schemas';

/**
 * Brought up to the same level of polish as the flashcard review: shuffle the
 * questions still ahead, shuffle each question's own answer order, read the
 * current question or verdict aloud, and a distraction-free focus mode. See
 * components/flashcards/flashcard-review.tsx for the sibling implementation —
 * the toolbar and focus-mode mechanics intentionally match it.
 */

const CELEBRATE_AT = 80; // percent

function shuffled<T>(list: T[]): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function QuizRunner({
  items,
  trackStats = true,
  compact = false,
}: {
  items: QuizItem[];
  /** Off for a demo/sample quiz, so playing with it never touches this browser's real study streak. */
  trackStats?: boolean;
  /** Drops the secondary toolbar and keyboard hint for a narrower slot, like the landing page hero. */
  compact?: boolean;
}) {
  const [order, setOrder] = useState<number[]>(() => items.map((_, i) => i));
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [picks, setPicks] = useState<number[]>([]);
  const nextButton = useRef<HTMLButtonElement>(null);

  // Study options, matching the flashcard toolbar.
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [focus, setFocus] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);

  const question = items[order[index]];
  const finished = index >= items.length;
  const optionCount = question?.options.length ?? 0;

  // Read through a ref so toggling the checkbox mid-question never reshuffles
  // the options you're already looking at — only takes effect from the next
  // question the memo below actually recomputes for. Seeded synchronously
  // (not via an effect) so the first question's options are present on the
  // very first paint, instead of flashing in a frame later.
  const [optionOrder, setOptionOrder] = useState<number[]>(() =>
    Array.from({ length: optionCount }, (_, i) => i),
  );

useEffect(() => {
  const idx = Array.from({ length: optionCount }, (_, i) => i);
  setOptionOrder(shuffleOptions ? shuffled(idx) : idx);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [order[index]]);

useEffect(() => {
  if (selected !== null) return;
  const idx = Array.from({ length: optionCount }, (_, i) => i);
  setOptionOrder(shuffleOptions ? shuffled(idx) : idx);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [shuffleOptions]);

  // After answering, move focus to the next step so the keyboard flow is
  // answer → Enter → next question, without hunting for the button.
  useEffect(() => {
    if (selected !== null && selected === question.correctIndex) nextButton.current?.focus();
  }, [selected]);

  useEffect(() => {
    setCanSpeak('speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined');
    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  // Focus mode: lock page scroll, and let Esc leave. Identical to the
  // flashcard's version.
  useEffect(() => {
    if (!focus) return;
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setFocus(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.documentElement.style.overflow = previous;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [focus]);

  function stopSpeaking() {
    if (!('speechSynthesis' in window)) return;
    utterance.current = null; // so the cancelled utterance's onerror is ignored
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  /** What "Read aloud" reads: the question and its options before answering, the verdict and explanation after. */
  function speechText(): string {
    if (selected === null) {
      const optionsText = optionOrder
        .map((optionIndex, i) => `${String.fromCharCode(65 + i)}. ${question.options[optionIndex]}`)
        .join('. ');
      return `${question.question} ${optionsText}`;
    }
    const verdict = selected === question.correctIndex ? 'Correct.' : 'Not this one.';
    return `${verdict} ${question.explanation}`;
  }

  function toggleSpeak() {
    if (speaking) {
      stopSpeaking();
      return;
    }
    const spoken = new SpeechSynthesisUtterance(speechText());
    const finish = () => {
      if (utterance.current === spoken) {
        utterance.current = null;
        setSpeaking(false);
      }
    };
    spoken.onend = finish;
    spoken.onerror = finish;
    window.speechSynthesis.cancel();
    utterance.current = spoken;
    window.speechSynthesis.speak(spoken);
    setSpeaking(true);
  }

  /** Reshuffles only the questions strictly after this one — the current question, answered or not, never changes under you. */
  function shuffleUpcoming() {
    const start = selected === null ? index : index + 1;
    if (items.length - start < 2) return;
    stopSpeaking();
    setOrder((prev) => [...prev.slice(0, start), ...shuffled(prev.slice(start))]);
  }

  function toggleShuffleOptions() {
    stopSpeaking();
    setShuffleOptions((s) => !s);
  }

  function choose(displayIndex: number) {
    if (selected !== null || finished) return;
    const optionIndex = optionOrder[displayIndex];
    stopSpeaking();
    setSelected(optionIndex);
    const correct = optionIndex === question.correctIndex;
    if (correct) setScore((s) => s + 1);
    setAnswers((prev) => [...prev, correct]);
    setPicks((prev) => [...prev, optionIndex]);
  }

  function next() {
    if (selected === null) return;
    stopSpeaking();
    setSelected(null);
    setIndex((i) => i + 1);
  }

  function restart() {
    stopSpeaking();
    setOrder(items.map((_, i) => i));
    setIndex(0);
    setSelected(null);
    setScore(0);
    setAnswers([]);
    setPicks([]);
  }

  // Registered once; reads the latest handlers through a ref (no stale closures).
  const actions = useRef({ choose, next, optionCount: 0, answered: false });
  actions.current = { choose, next, optionCount, answered: selected !== null };

  useEffect(() => {
    if (finished) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const current = actions.current;

      if (!current.answered) {
        // 1–4 or A–D pick an option, by the position it's shown at.
        const digit = /^[1-9]$/.test(event.key) ? Number(event.key) - 1 : -1;
        const letter = /^[a-z]$/i.test(event.key) ? event.key.toLowerCase().charCodeAt(0) - 97 : -1;
        const picked = digit >= 0 ? digit : letter;
        if (picked >= 0 && picked < current.optionCount) {
          event.preventDefault();
          current.choose(picked);
        }
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        current.next();
      }
      // Enter on the focused "Next" button is handled by the button itself.
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [finished]);

  /**
   * Normal layout renders `children` in place. Focus mode portals them to
   * `document.body`, exactly like the flashcard review — see that file's
   * `shell()` for why a portal beats a plain z-index here.
   */
  function shell(children: React.ReactNode) {
    if (!focus) return children;
    return createPortal(
      <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
        <div className="bg-dots pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto flex min-h-full max-w-2xl flex-col justify-center px-5 py-10">
          {children}
        </div>
      </div>,
      document.body,
    );
  }

  if (finished) {
    return shell(
      <Results
        items={items}
        order={order}
        score={score}
        answers={answers}
        picks={picks}
        onRestart={restart}
        focus={focus}
        onExitFocus={() => setFocus(false)}
        trackStats={trackStats}
      />,
    );
  }

  return shell(
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Question {index + 1} of {items.length}
          </span>
          <span className="tabular-nums">
            Score {score}/{answers.length}
          </span>
        </div>
        {/* One segment per question, coloured as answers come in. */}
        <div className="flex gap-1.5" aria-hidden="true">
          {items.map((_, i) => (
            <span
              key={i}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors duration-300',
                i < answers.length ? (answers[i] ? 'bg-success' : 'bg-destructive') : i === index ? 'bg-foreground/40' : 'bg-secondary',
              )}
            />
          ))}
        </div>
      </div>

      {compact ? null : (
        <div className="-mx-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={shuffleUpcoming}
              disabled={items.length - index - 1 < 2}
              aria-label="Shuffle the remaining questions"
            >
              <ShuffleIcon />
              <span className="hidden sm:inline">Shuffle</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleShuffleOptions}
              aria-pressed={shuffleOptions}
              aria-label="Shuffle answer order"
              className={cn(shuffleOptions && 'bg-accent')}
            >
              <SwapIcon />
              <span className="hidden sm:inline">Shuffle options</span>
            </Button>
          </div>
          <div className="flex items-center gap-1">
            {canSpeak ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSpeak}
                aria-pressed={speaking}
                aria-label={speaking ? 'Stop reading aloud' : 'Read this question aloud'}
                className={cn(speaking && 'bg-accent')}
              >
                <VolumeIcon className={cn(speaking && 'animate-pulse')} />
                <span className="hidden sm:inline">{speaking ? 'Stop' : 'Read aloud'}</span>
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFocus((f) => !f)}
              aria-pressed={focus}
              aria-label={focus ? 'Exit focus mode' : 'Enter focus mode'}
            >
              {focus ? <MinimizeIcon /> : <MaximizeIcon />}
              <span className="hidden sm:inline">{focus ? 'Exit focus' : 'Focus'}</span>
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardBody className="space-y-6 p-5 sm:p-8">
          <h3 className="text-xl font-medium leading-snug tracking-tight sm:text-2xl">{question.question}</h3>

          <div className="space-y-2.5" role="group" aria-label="Answer options">
            {optionOrder.map((optionIndex, displayIndex) => {
              const option = question.options[optionIndex];
              const isAnswer = optionIndex === question.correctIndex;
              const isPicked = optionIndex === selected;
              const revealed = selected !== null;

              return (
                <button
                  key={optionIndex}
                  type="button"
                  onClick={() => choose(displayIndex)}
                  disabled={revealed}
                  className={cn(
                    'group flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm leading-relaxed transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    !revealed && 'border-input hover:border-foreground/40 hover:bg-accent',
                    revealed && isAnswer && 'border-success bg-success/10',
                    revealed && isPicked && !isAnswer && 'border-destructive bg-destructive/10',
                    revealed && !isAnswer && !isPicked && 'text-muted-foreground opacity-70',
                  )}
                >
                  <span
                    className={cn(
                      'grid size-7 shrink-0 place-items-center rounded-md border text-xs font-medium transition-colors',
                      !revealed && 'bg-background text-muted-foreground group-hover:text-foreground',
                      revealed && isAnswer && 'border-success bg-success text-background',
                      revealed && isPicked && !isAnswer && 'border-destructive bg-destructive text-background',
                    )}
                  >
                    {revealed && isAnswer ? (
                      <CheckIcon className="size-3.5" />
                    ) : revealed && isPicked ? (
                      <XIcon className="size-3.5" />
                    ) : (
                      String.fromCharCode(65 + displayIndex)
                    )}
                  </span>
                  <span className="flex-1">{option}</span>
                </button>
              );
            })}
          </div>

          {selected !== null ? (
            <div className="animate-reveal rounded-lg border bg-muted/50 px-4 py-3 text-sm">
              <p className={cn('font-medium', selected === question.correctIndex ? 'text-success' : 'text-destructive')}>
                {selected === question.correctIndex ? 'Correct.' : 'Not this one.'}
              </p>
              <p className="mt-1 leading-relaxed text-muted-foreground">{question.explanation}</p>
            </div>
          ) : null}
        </CardBody>
      </Card>

      {selected !== null ? (
        <div className="flex justify-end">
          <Button ref={nextButton} size="lg" onClick={next}>
            {index === items.length - 1 ? 'See results' : 'Next question'}
            <ArrowRightIcon />
          </Button>
        </div>
      ) : compact ? null : (
        <p className="hidden text-center text-xs text-muted-foreground sm:block">
          Press <Kbd>A</Kbd>–<Kbd>D</Kbd> or <Kbd>1</Kbd>–<Kbd>4</Kbd> to answer
        </p>
      )}
    </div>,
  );
}

function Results({
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

  const radius = 52;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      {percent >= CELEBRATE_AT ? <Confetti /> : null}

      <Card className="animate-reveal">
        <CardBody className="flex flex-col items-center gap-6 py-10 text-center">
          <div className="relative size-36">
            <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
              <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="9" className="stroke-secondary" />
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                strokeWidth="9"
                strokeLinecap="round"
                className="stroke-primary transition-[stroke-dashoffset] duration-1000 ease-out"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - shown / 100)}
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
            {missed.map((i) => {
              const item = items[order[i]];
              return (
                <details key={i} className="group rounded-lg border bg-card open:shadow-sm">
                  <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-3 text-sm [&::-webkit-details-marker]:hidden">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded bg-destructive/10 text-[0.7rem] font-medium text-destructive">
                      {i + 1}
                    </span>
                    <span className="flex-1 leading-relaxed">{item.question}</span>
                    <ChevronDownIcon className="mt-1 size-4 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="space-y-2 border-t px-4 py-3 text-sm leading-relaxed">
                    <p>
                      <span className="text-muted-foreground">You chose: </span>
                      <span className="text-destructive">{item.options[picks[i]]}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Correct answer: </span>
                      <span className="font-medium text-success">{item.options[item.correctIndex]}</span>
                    </p>
                    <p className="text-muted-foreground">{item.explanation}</p>
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border bg-muted px-1.5 py-0.5 font-sans text-[0.7rem] font-medium text-foreground">
      {children}
    </kbd>
  );
}