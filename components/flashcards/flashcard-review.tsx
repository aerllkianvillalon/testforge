'use client';

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Confetti } from '@/components/ui/confetti';
import {
  CheckIcon,
  FlipIcon,
  MaximizeIcon,
  MinimizeIcon,
  ShuffleIcon,
  SwapIcon,
  UndoIcon,
  VolumeIcon,
} from '@/components/ui/icons';
import { recordActivity } from '@/lib/study-stats';
import { cn } from '@/lib/utils';
import type { Flashcard } from '@/lib/ai/schemas';

/**
 * Review runs in rounds. Cards marked "Review again" come back in the next
 * round; cards marked "Got it" drop out. That is the whole scheduling model —
 * honest about being simple, rather than implying a spaced-repetition system
 * that isn't there.
 *
 * Interaction: click or press Space to flip; drag the card (or use the arrow
 * keys) to sort it. Right = got it, left = review again.
 *
 * Extras: shuffle what's left, show answers first, read the card aloud, and a
 * distraction-free focus mode (Esc to leave). Finished rounds are counted in
 * the local study stats (lib/study-stats.ts).
 */

const EXIT_MS = 340; // keep in step with fc-exit-* in globals.css
const SWIPE_THRESHOLD = 110; // px of horizontal drag that commits a sort
const TAP_SLOP = 6; // px of movement that still counts as a tap
const REVIEW_PREVIEW = 5; // how many "still to review" cards the summary lists

type ExitDirection = 'left' | 'right';

function shuffled<T>(list: T[]): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

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
  const [queue, setQueue] = useState<number[]>(() => items.map((_, i) => i));
  const [position, setPosition] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [repeat, setRepeat] = useState<number[]>([]);
  const [round, setRound] = useState(1);
  const [run, setRun] = useState(0); // bumps every time a round is (re)started

  // Study options.
  const [reversed, setReversed] = useState(false);
  const [focus, setFocus] = useState(false);
  const [shuffles, setShuffles] = useState(0);
  const [canSpeak, setCanSpeak] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  // Presentation state for the card itself.
  const [lift, setLift] = useState<'none' | 'a' | 'b'>('none');
  const [exit, setExit] = useState<ExitDirection | null>(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);

  const pointer = useRef<{ id: number; startX: number; moved: boolean } | null>(null);
  const lastDragX = useRef(0);
  const exitTimer = useRef<number | null>(null);
  const tilt = useRef<HTMLDivElement>(null);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const recordedRun = useRef(-1);

  const total = queue.length;
  const done = position >= total;
  const card = done ? null : items[queue[position]];
  const progress = useMemo(() => (total === 0 ? 0 : Math.round((position / total) * 100)), [position, total]);
  const behind = done ? 0 : Math.min(2, total - position - 1);
  const known = position - repeat.length;
  const tall = useMemo(() => items.some((item) => Math.max(item.front.length, item.back.length) > 180), [items]);

  // What each face shows. "Answer first" simply swaps them.
  const frontText = card ? (reversed ? card.back : card.front) : '';
  const backText = card ? (reversed ? card.front : card.back) : '';
  const frontLabel = reversed ? 'Answer' : 'Prompt';
  const backLabel = reversed ? 'Prompt' : 'Answer';

  useEffect(() => {
    setCanSpeak('speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined');
    return () => {
      if (exitTimer.current !== null) window.clearTimeout(exitTimer.current);
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  // Count each finished round once toward the study streak.
  useEffect(() => {
    if (!trackStats || !done || total === 0 || recordedRun.current === run) return;
    recordedRun.current = run;
    recordActivity({ cards: total, known: total - repeat.length });
  }, [trackStats, done, run, total, repeat.length]);

  // Focus mode: lock page scroll, and let Esc leave.
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

  function toggleSpeak() {
    if (speaking) {
      stopSpeaking();
      return;
    }
    const spoken = new SpeechSynthesisUtterance(flipped ? backText : frontText);
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

  function flip() {
    if (exit) return;
    stopSpeaking();
    setFlipped((f) => !f);
    // Alternating between two identical keyframes restarts the lift every flip.
    setLift((l) => (l === 'a' ? 'b' : 'a'));
  }

  function shuffle() {
    if (exit || done || total - position < 2) return;
    stopSpeaking();
    // Shuffle the current card and everything after it; cards already sorted stay put.
    setQueue([...queue.slice(0, position), ...shuffled(queue.slice(position))]);
    setFlipped(false);
    setLift('none');
    setShuffles((n) => n + 1); // new key → the "rise from the deck" entrance replays
  }

  function toggleReversed() {
    stopSpeaking();
    setReversed((r) => !r);
    setFlipped(false);
    setLift('none');
  }

  function advance(keep: boolean) {
    if (keep) setRepeat((prev) => [...prev, queue[position]]);
    stopSpeaking();
    setFlipped(false);
    setLift('none');
    setDragX(0);
    lastDragX.current = 0;
    setPosition((prev) => prev + 1);
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
    setQueue(repeat);
    setRepeat([]);
    setPosition(0);
    setFlipped(false);
    setLift('none');
    setRound((r) => r + 1);
    setRun((r) => r + 1);
  }

  function restart() {
    setQueue(items.map((_, i) => i));
    setRepeat([]);
    setPosition(0);
    setFlipped(false);
    setLift('none');
    setRound(1);
    setRun((r) => r + 1);
  }

  // The keyboard handler is registered once and reads the latest actions
  // through a ref, so it never acts on a stale closure.
  const actions = useRef({ flip, sort });
  actions.current = { flip, sort };

  useEffect(() => {
    if (done) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      const target = event.target as HTMLElement | null;
      // Never steal keys from text entry (e.g. the "name this set" field).
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        actions.current.sort(false);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        actions.current.sort(true);
      } else if (event.key === ' ' || event.key === 'Enter') {
        // Focused buttons and links handle Space/Enter themselves.
        if (target?.closest('button, a')) return;
        event.preventDefault();
        actions.current.flip();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [done]);

  /** Mouse hover: the card leans toward the pointer and catches a little light. */
  function tiltTo(event: ReactPointerEvent<HTMLDivElement>) {
    const el = tilt.current;
    if (!el) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    el.dataset.active = 'true';
    el.style.setProperty('--ry', `${((px - 0.5) * 10).toFixed(2)}deg`);
    el.style.setProperty('--rx', `${(-(py - 0.5) * 8).toFixed(2)}deg`);
    el.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`);
    el.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`);
    el.style.setProperty('--glare', '1');
  }

  function tiltReset() {
    const el = tilt.current;
    if (!el) return;
    el.dataset.active = 'false';
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
    el.style.setProperty('--glare', '0');
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (exit || (event.pointerType === 'mouse' && event.button !== 0)) return;
    pointer.current = { id: event.pointerId, startX: event.clientX, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const current = pointer.current;
    if (!current) {
      if (event.pointerType === 'mouse' && !exit) tiltTo(event);
      return;
    }
    if (current.id !== event.pointerId) return;
    const delta = event.clientX - current.startX;
    if (!current.moved) {
      if (Math.abs(delta) < TAP_SLOP) return;
      current.moved = true;
      tiltReset(); // a drag is its own motion; don't stack a lean on top
      setDragging(true);
    }
    lastDragX.current = delta;
    setDragX(delta);
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const current = pointer.current;
    pointer.current = null;
    if (!current || current.id !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (!current.moved) {
      flip(); // a tap or click
      return;
    }

    setDragging(false);
    const delta = lastDragX.current;
    if (Math.abs(delta) >= SWIPE_THRESHOLD) {
      sort(delta < 0); // the exit animation continues from where the drag ended
    } else {
      setDragX(0); // snap back
      lastDragX.current = 0;
    }
  }

  function onPointerCancel() {
    pointer.current = null;
    lastDragX.current = 0;
    setDragging(false);
    setDragX(0);
    tiltReset();
  }

  /**
   * Normal layout renders `children` in place. Focus mode portals them
   * straight to `document.body` instead of just switching classes in place —
   * this component can be mounted anywhere (the generator result, or nested
   * inside a card on the dashboard), and a z-index only wins against the site
   * header if nothing between here and <body> quietly starts a new stacking
   * context. A portal sidesteps that entirely: the overlay becomes a sibling
   * of the header, not a descendant, so it always paints on top of it.
   * `focus` starts `false` and only ever flips to `true` from a click, so the
   * server-rendered and first client render always take the `children`
   * branch — `document` is never touched before it exists.
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

  if (done) {
    const remaining = repeat.length;
    return shell(
      <>
        {remaining === 0 ? <Confetti /> : null}
        <Card className="mx-auto w-full max-w-xl animate-reveal">
          <CardBody className="space-y-6 py-10 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-success/10 text-success">
              <CheckIcon className="size-6" />
            </div>
            <div>
              <h3 className="text-xl font-semibold tracking-tight">Round {round} finished</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                {remaining === 0
                  ? `You got through all ${total} ${total === 1 ? 'card' : 'cards'} without marking any for review.`
                  : `${total - remaining} of ${total} marked as known. ${remaining} left to review.`}
              </p>
            </div>

            {remaining > 0 ? (
              <div className="mx-auto max-w-md text-left">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Still to review</p>
                <ul className="divide-y rounded-lg border text-sm">
                  {repeat.slice(0, REVIEW_PREVIEW).map((index) => (
                    <li key={index} className="truncate px-3 py-2">
                      {items[index].front}
                    </li>
                  ))}
                </ul>
                {remaining > REVIEW_PREVIEW ? (
                  <p className="mt-2 text-xs text-muted-foreground">and {remaining - REVIEW_PREVIEW} more</p>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-wrap justify-center gap-2">
              {remaining > 0 ? <Button onClick={nextRound}>Review the {remaining} remaining</Button> : null}
              <Button variant="secondary" onClick={restart}>
                Start over
              </Button>
              {focus ? (
                <Button variant="ghost" onClick={() => setFocus(false)}>
                  Exit focus
                </Button>
              ) : null}
            </div>
          </CardBody>
        </Card>
      </>,
    );
  }

  const dragStyle =
    dragX !== 0 || dragging ? { transform: `translateX(${dragX}px) rotate(${dragX / 20}deg)` } : undefined;
  const knownStamp = exit === 'right' ? 1 : Math.min(Math.max(dragX / SWIPE_THRESHOLD, 0), 1);
  const againStamp = exit === 'left' ? 1 : Math.min(Math.max(-dragX / SWIPE_THRESHOLD, 0), 1);
  const hiddenSide = reversed ? 'prompt' : 'answer';

  return shell(
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
          aria-valuenow={progress}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {compact ? null : (
        <div className="-mx-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={shuffle}
              disabled={exit !== null || total - position < 2}
              aria-label="Shuffle the remaining cards"
            >
              <ShuffleIcon />
              <span className="hidden sm:inline">Shuffle</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleReversed}
              aria-pressed={reversed}
              aria-label="Show answers first"
              className={cn(reversed && 'bg-accent')}
            >
              <SwapIcon />
              <span className="hidden sm:inline">Answer first</span>
            </Button>
          </div>
          <div className="flex items-center gap-1">
            {canSpeak ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSpeak}
                aria-pressed={speaking}
                aria-label={speaking ? 'Stop reading aloud' : 'Read this side aloud'}
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
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onPointerLeave={tiltReset}
          >
            <div className="fc-tilt" ref={tilt}>
              <div className="fc-scene" data-lift={lift}>
                <div className="fc-flip" data-flipped={flipped}>
                  <Face
                    side="front"
                    label={frontLabel}
                    text={frontText}
                    count={`${position + 1} / ${total}`}
                    hint="Click to flip"
                    hidden={flipped}
                  />
                  <Face
                    side="back"
                    label={backLabel}
                    text={backText}
                    count={`${position + 1} / ${total}`}
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
    </div>,
  );
}

function Face({
  side,
  label,
  text,
  count,
  hint,
  hidden,
}: {
  side: 'front' | 'back';
  label: string;
  text: string;
  count: string;
  hint: string;
  hidden: boolean;
}) {
  return (
    <div className={`fc-face ${side === 'front' ? 'fc-front' : 'fc-back'}`} aria-hidden={hidden}>
      <div className="fc-head">
        <span>{label}</span>
        <span className="fc-head-count">{count}</span>
      </div>
      <div className="fc-body">
        <p className={`fc-text ${textSize(text)}`}>{text}</p>
      </div>
      <div className="fc-hint">
        <FlipIcon className="size-3" />
        {hint}
      </div>
    </div>
  );
}

/** Long answers shrink rather than overflow the card. */
function textSize(text: string): string {
  if (text.length <= 60) return 'text-2xl sm:text-3xl';
  if (text.length <= 140) return 'text-xl sm:text-2xl';
  if (text.length <= 260) return 'text-base sm:text-lg';
  return 'text-sm sm:text-base';
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border bg-muted px-1.5 py-0.5 font-sans text-[0.7rem] font-medium text-foreground">
      {children}
    </kbd>
  );
}