'use client';

import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { FlashcardFace } from '@/components/flashcards/flashcard-face';
import { RoundSummary } from '@/components/flashcards/round-summary';
import { SWIPE_THRESHOLD, useCardGestures } from '@/components/flashcards/use-card-gestures';
import { FocusShell, useFocusMode } from '@/components/study/focus-mode';
import { StudyToolbar } from '@/components/study/study-toolbar';
import { useSpeech } from '@/components/study/use-speech';
import { useStudyKeys } from '@/components/study/use-study-keys';
import { Button } from '@/components/ui/button';
import { CheckIcon, FlipIcon, UndoIcon } from '@/components/ui/icons';
import { Kbd } from '@/components/ui/kbd';
import { initRounds, roundsReducer, summarizeRounds } from '@/lib/review-rounds';
import { shuffled } from '@/lib/shuffle';
import { recordActivity } from '@/lib/study-stats';
import type { Flashcard } from '@/lib/ai/schemas';

/**
 * Interaction: click or press Space to flip; drag the card (or use the arrow
 * keys) to sort it. Right = got it, left = review again. How rounds work is in
 * lib/review-rounds.ts; the pointer handling is in use-card-gestures.ts.
 *
 * Extras: shuffle what's left, show answers first, read the card aloud, and a
 * distraction-free focus mode (Esc to leave). Finished rounds are counted in
 * the local study stats (lib/study-stats.ts).
 */

const EXIT_MS = 340; // keep in step with fc-exit-* in globals.css

type ExitDirection = 'left' | 'right';

export function FlashcardReview({
  items,
  trackStats = true,
  compact = false,
}: {
  items: Flashcard[];
  /** Off for a demo/sample deck, so playing with it never touches this browser's real study streak. */
  trackStats?: boolean;
  /** Drops the secondary toolbar and keyboard hint for a narrower slot, like the landing page hero. */
  compact?: boolean;
}) {
  const [rounds, dispatch] = useReducer(roundsReducer, items.length, initRounds);
  const { queue, position, repeat, round, run, shuffles } = rounds;
  const { total, done, current, known, progressPercent } = summarizeRounds(rounds);

  // Presentation state for the card itself.
  const [flipped, setFlipped] = useState(false);
  const [lift, setLift] = useState<'none' | 'a' | 'b'>('none');
  const [exit, setExit] = useState<ExitDirection | null>(null);
  const [reversed, setReversed] = useState(false);

  const focus = useFocusMode();
  const speech = useSpeech();
  const gestures = useCardGestures({ locked: exit !== null, onTap: flip, onSwipe: (toLeft) => sort(toLeft) });

  const exitTimer = useRef<number | null>(null);
  const recordedRun = useRef(-1);

  const card = current === null ? null : items[current];
  const behind = done ? 0 : Math.min(2, total - position - 1);
  const tall = useMemo(() => items.some((item) => Math.max(item.front.length, item.back.length) > 180), [items]);

  // What each face shows. "Answer first" simply swaps them.
  const frontText = card ? (reversed ? card.back : card.front) : '';
  const backText = card ? (reversed ? card.front : card.back) : '';
  const frontLabel = reversed ? 'Answer' : 'Prompt';
  const backLabel = reversed ? 'Prompt' : 'Answer';

  useEffect(() => {
    return () => {
      if (exitTimer.current !== null) window.clearTimeout(exitTimer.current);
    };
  }, []);

  // Count each finished round once toward the study streak.
  useEffect(() => {
    if (!trackStats || !done || total === 0 || recordedRun.current === run) return;
    recordedRun.current = run;
    recordActivity({ cards: total, known: total - repeat.length });
  }, [trackStats, done, run, total, repeat.length]);

  function showFront() {
    setFlipped(false);
    setLift('none');
  }

  function flip() {
    if (exit) return;
    speech.stop();
    setFlipped((f) => !f);
    // Alternating between two identical keyframes restarts the lift every flip.
    setLift((l) => (l === 'a' ? 'b' : 'a'));
  }

  function shuffle() {
    if (exit || done || total - position < 2) return;
    speech.stop();
    dispatch({ type: 'shuffle', upcoming: shuffled(queue.slice(position)) });
    showFront();
  }

  function toggleReversed() {
    speech.stop();
    setReversed((r) => !r);
    showFront();
  }

  function advance(keep: boolean) {
    dispatch({ type: 'sort', keep });
    speech.stop();
    showFront();
    gestures.resetDrag();
  }

  /** keep = true sends the card to the "review again" pile (left). */
  function sort(keep: boolean) {
    if (exit || done) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      advance(keep);
      return;
    }
    setExit(keep ? 'left' : 'right');
    exitTimer.current = window.setTimeout(() => {
      exitTimer.current = null;
      setExit(null);
      advance(keep);
    }, EXIT_MS);
  }

  function nextRound() {
    dispatch({ type: 'nextRound' });
    showFront();
  }

  function restart() {
    dispatch({ type: 'restart', count: items.length });
    showFront();
  }

  useStudyKeys(!done, (event, target) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      sort(false);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      sort(true);
    } else if (event.key === ' ' || event.key === 'Enter') {
      // Focused buttons and links handle Space/Enter themselves.
      if (target?.closest('button, a')) return;
      event.preventDefault();
      flip();
    }
  });

  if (done) {
    return (
      <FocusShell active={focus.focus}>
        <RoundSummary
          round={round}
          total={total}
          remaining={repeat.map((index) => items[index])}
          onNextRound={nextRound}
          onRestart={restart}
          focus={focus.focus}
          onExitFocus={focus.exit}
        />
      </FocusShell>
    );
  }

  const { dragX, dragging } = gestures;
  const dragStyle =
    dragX !== 0 || dragging ? { transform: `translateX(${dragX}px) rotate(${dragX / 20}deg)` } : undefined;
  const knownStamp = exit === 'right' ? 1 : Math.min(Math.max(dragX / SWIPE_THRESHOLD, 0), 1);
  const againStamp = exit === 'left' ? 1 : Math.min(Math.max(-dragX / SWIPE_THRESHOLD, 0), 1);
  const hiddenSide = reversed ? 'prompt' : 'answer';
  const count = `${position + 1} / ${total}`;

  return (
    <FocusShell active={focus.focus}>
      <div className="mx-auto w-full max-w-xl space-y-5">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Card {position + 1} of {total}
              {round > 1 ? ` · round ${round}` : ''}
            </span>
            <span className="tabular-nums">
              {known} known · {repeat.length} to review
            </span>
          </div>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-secondary"
            role="progressbar"
            aria-label="Round progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent}
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {compact ? null : (
          <StudyToolbar
            shuffle={{
              label: 'Shuffle the remaining cards',
              disabled: exit !== null || total - position < 2,
              onClick: shuffle,
            }}
            option={{ label: 'Show answers first', text: 'Answer first', active: reversed, onClick: toggleReversed }}
            speech={{
              available: speech.canSpeak,
              speaking: speech.speaking,
              label: 'Read this side aloud',
              onClick: () => speech.toggle(flipped ? backText : frontText),
            }}
            focus={{ active: focus.focus, onClick: focus.toggle }}
          />
        )}

        <div className="fc-stage">
          <div className="fc-deck" data-tall={tall}>
            {Array.from({ length: behind }, (_, i) => (
              <div key={i} className="fc-ghost" data-depth={i + 1} aria-hidden="true" />
            ))}

            <div
              // Remounting per card replays the "rise from the stack" entrance.
              key={`${round}-${position}-${shuffles}`}
              className="fc-card"
              role="button"
              tabIndex={0}
              aria-label={
                flipped
                  ? `Flashcard, showing the ${reversed ? 'prompt' : 'answer'}. Activate to flip back.`
                  : `Flashcard, showing the ${reversed ? 'answer' : 'prompt'}. Activate to flip.`
              }
              data-dragging={dragging}
              data-exit={exit ?? undefined}
              style={dragStyle}
              {...gestures.handlers}
            >
              <div className="fc-tilt" ref={gestures.tiltRef}>
                <div className="fc-scene" data-lift={lift}>
                  <div className="fc-flip" data-flipped={flipped}>
                    <FlashcardFace
                      side="front"
                      label={frontLabel}
                      text={frontText}
                      count={count}
                      hint="Click to flip"
                      hidden={flipped}
                    />
                    <FlashcardFace
                      side="back"
                      label={backLabel}
                      text={backText}
                      count={count}
                      hint="Click to flip back"
                      hidden={!flipped}
                    />
                  </div>
                </div>
                <div className="fc-glare" aria-hidden="true" />
              </div>

              <span className="fc-stamp fc-stamp-known" style={{ opacity: knownStamp }} aria-hidden="true">
                Got it
              </span>
              <span className="fc-stamp fc-stamp-again" style={{ opacity: againStamp }} aria-hidden="true">
                Review again
              </span>
            </div>
          </div>
        </div>

        <p className="sr-only" aria-live="polite">
          {flipped ? `${backLabel}: ${backText}` : `${frontLabel}: ${frontText}`}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <Button variant="secondary" size={compact ? 'md' : 'lg'} onClick={() => sort(true)} disabled={exit !== null}>
            <UndoIcon />
            Review again
          </Button>
          <Button variant="secondary" size={compact ? 'md' : 'lg'} onClick={flip} disabled={exit !== null}>
            <FlipIcon />
            {flipped ? `Hide ${hiddenSide}` : `Show ${hiddenSide}`}
          </Button>
          <Button size={compact ? 'md' : 'lg'} onClick={() => sort(false)} disabled={exit !== null}>
            <CheckIcon />
            Got it
          </Button>
        </div>

        {compact ? null : (
          <p className="text-center text-xs text-muted-foreground">
            <span className="hidden sm:inline">
              <Kbd>Space</Kbd> flips · <Kbd>←</Kbd> review again · <Kbd>→</Kbd> got it · or{' '}
            </span>
            <span className="sm:hidden">Tap to flip. </span>
            <span>drag the card left or right</span>
          </p>
        )}
      </div>
    </FocusShell>
  );
}
