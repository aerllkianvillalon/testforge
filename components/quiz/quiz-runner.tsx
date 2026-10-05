'use client';

import { useEffect, useRef, useState } from 'react';
import { QuizResults } from '@/components/quiz/quiz-results';
import { useOptionOrder } from '@/components/quiz/use-option-order';
import { FocusShell, useFocusMode } from '@/components/study/focus-mode';
import { StudyToolbar } from '@/components/study/study-toolbar';
import { useSpeech } from '@/components/study/use-speech';
import { useStudyKeys } from '@/components/study/use-study-keys';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { ArrowRightIcon, CheckIcon, XIcon } from '@/components/ui/icons';
import { Kbd } from '@/components/ui/kbd';
import { indices, shuffled } from '@/lib/shuffle';
import { recordActivity } from '@/lib/study-stats';
import { cn } from '@/lib/utils';
import type { QuizItem } from '@/lib/ai/schemas';

/**
 * Answer with the mouse or with A–D / 1–4, then Next (or →). Study options
 * match the flashcard review's: shuffle the questions still ahead, shuffle each
 * question's own answer order, read aloud, and a distraction-free focus mode.
 * See components/study for the pieces the two share.
 */

const letter = (i: number) => String.fromCharCode(65 + i);

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
  const [order, setOrder] = useState<number[]>(() => indices(items.length));
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [picks, setPicks] = useState<number[]>([]);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [run, setRun] = useState(0); // bumps on every restart
  const recordedRun = useRef(-1);
  const nextButton = useRef<HTMLButtonElement>(null);
  const focus = useFocusMode();
  const speech = useSpeech();

  const question = items[order[index]];
  const finished = index >= items.length;
  const optionCount = question?.options.length ?? 0;
  const optionOrder = useOptionOrder({
    questionId: order[index],
    optionCount,
    shuffle: shuffleOptions,
    locked: selected !== null,
  });

  // After answering correctly, move focus to the next step so the keyboard flow
  // is answer → Enter → next question, without hunting for the button.
  useEffect(() => {
    if (selected !== null && selected === question.correctIndex) nextButton.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // Count each finished quiz once toward the study stats. This lives here, not
  // in the results screen, because toggling focus mode remounts that screen.
  useEffect(() => {
    if (!trackStats || !finished || answers.length === 0 || recordedRun.current === run) return;
    recordedRun.current = run;
    recordActivity({ questions: answers.length, correct: score });
  }, [trackStats, finished, run, answers.length, score]);

  /** What "Read aloud" reads: the question and its options before answering, the verdict and explanation after. */
  function speechText(): string {
    if (selected === null) {
      const options = optionOrder.map((optionIndex, i) => `${letter(i)}. ${question.options[optionIndex]}`).join('. ');
      return `${question.question} ${options}`;
    }
    const verdict = selected === question.correctIndex ? 'Correct.' : 'Not this one.';
    return `${verdict} ${question.explanation}`;
  }

  /** Reshuffles only the questions strictly after this one: the current question, answered or not, never changes under you. */
  function shuffleUpcoming() {
    const start = selected === null ? index : index + 1;
    if (items.length - start < 2) return;
    speech.stop();
    setOrder((prev) => [...prev.slice(0, start), ...shuffled(prev.slice(start))]);
  }

  function toggleShuffleOptions() {
    speech.stop();
    setShuffleOptions((s) => !s);
  }

  function choose(displayIndex: number) {
    if (selected !== null || finished) return;
    const optionIndex = optionOrder[displayIndex];
    speech.stop();
    setSelected(optionIndex);
    const correct = optionIndex === question.correctIndex;
    if (correct) setScore((s) => s + 1);
    setAnswers((prev) => [...prev, correct]);
    setPicks((prev) => [...prev, optionIndex]);
  }

  function next() {
    if (selected === null) return;
    speech.stop();
    setSelected(null);
    setIndex((i) => i + 1);
  }

  function restart() {
    speech.stop();
    setOrder(indices(items.length));
    setIndex(0);
    setSelected(null);
    setScore(0);
    setAnswers([]);
    setPicks([]);
    setRun((r) => r + 1);
  }

  useStudyKeys(!finished, (event) => {
    if (selected === null) {
      // 1–4 or A–D pick an option, by the position it's shown at.
      const digit = /^[1-9]$/.test(event.key) ? Number(event.key) - 1 : -1;
      const alpha = /^[a-z]$/i.test(event.key) ? event.key.toLowerCase().charCodeAt(0) - 97 : -1;
      const picked = digit >= 0 ? digit : alpha;
      if (picked >= 0 && picked < optionCount) {
        event.preventDefault();
        choose(picked);
      }
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      next();
    }
    // Enter on the focused "Next" button is handled by the button itself.
  });

  if (finished) {
    return (
      <FocusShell active={focus.focus}>
        <QuizResults
          items={items}
          order={order}
          score={score}
          answers={answers}
          picks={picks}
          onRestart={restart}
          focus={focus.focus}
          onExitFocus={focus.exit}
        />
      </FocusShell>
    );
  }

  const revealed = selected !== null;

  return (
    <FocusShell active={focus.focus}>
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
                  i < answers.length
                    ? answers[i]
                      ? 'bg-success'
                      : 'bg-destructive'
                    : i === index
                      ? 'bg-foreground/40'
                      : 'bg-secondary',
                )}
              />
            ))}
          </div>
        </div>

        {compact ? null : (
          <StudyToolbar
            shuffle={{
              label: 'Shuffle the remaining questions',
              disabled: items.length - index - 1 < 2,
              onClick: shuffleUpcoming,
            }}
            option={{
              label: 'Shuffle answer order',
              text: 'Shuffle options',
              active: shuffleOptions,
              onClick: toggleShuffleOptions,
            }}
            speech={{
              available: speech.canSpeak,
              speaking: speech.speaking,
              label: 'Read this question aloud',
              onClick: () => speech.toggle(speechText()),
            }}
            focus={{ active: focus.focus, onClick: focus.toggle }}
          />
        )}

        <Card>
          <CardBody className="space-y-6 p-5 sm:p-8">
            <h3 className="text-xl font-medium leading-snug tracking-tight sm:text-2xl">{question.question}</h3>

            <div className="space-y-2.5" role="group" aria-label="Answer options">
              {optionOrder.map((optionIndex, displayIndex) => (
                <OptionButton
                  key={optionIndex}
                  letter={letter(displayIndex)}
                  text={question.options[optionIndex]}
                  revealed={revealed}
                  isAnswer={optionIndex === question.correctIndex}
                  isPicked={optionIndex === selected}
                  onClick={() => choose(displayIndex)}
                />
              ))}
            </div>

            {revealed ? (
              <div className="animate-reveal rounded-lg border bg-muted/50 px-4 py-3 text-sm">
                <p className={cn('font-medium', selected === question.correctIndex ? 'text-success' : 'text-destructive')}>
                  {selected === question.correctIndex ? 'Correct.' : 'Not this one.'}
                </p>
                <p className="mt-1 leading-relaxed text-muted-foreground">{question.explanation}</p>
              </div>
            ) : null}
          </CardBody>
        </Card>

        {revealed ? (
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
      </div>
    </FocusShell>
  );
}

function OptionButton({
  letter,
  text,
  revealed,
  isAnswer,
  isPicked,
  onClick,
}: {
  letter: string;
  text: string;
  /** True once the question has been answered: the right option is marked, and a wrong pick too. */
  revealed: boolean;
  isAnswer: boolean;
  isPicked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
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
          letter
        )}
      </span>
      <span className="flex-1">{text}</span>
    </button>
  );
}
