'use client';

import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

export const SWIPE_THRESHOLD = 110; // px of horizontal drag that commits a sort
const TAP_SLOP = 6; // px of movement that still counts as a tap

/**
 * Pointer handling for the card: a tap flips it, a horizontal drag sorts it
 * (left = review again, right = got it), and a mouse hovering over it makes it
 * lean toward the pointer and catch a little light.
 *
 * Returns the handlers to spread on the card, `tiltRef` for the element that
 * leans, and `dragX`/`dragging` so the caller can draw the drag. After a
 * committed swipe the drag offset is left where it ended, so the exit
 * animation continues from there; the caller calls `resetDrag` when the next
 * card arrives.
 */
export function useCardGestures({
  locked,
  onTap,
  onSwipe,
}: {
  /** True while the card is animating out; input is ignored. */
  locked: boolean;
  onTap: () => void;
  /** `toLeft` is true for a swipe to "review again". */
  onSwipe: (toLeft: boolean) => void;
}) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const pointer = useRef<{ id: number; startX: number; moved: boolean } | null>(null);
  const lastDragX = useRef(0);
  const tiltRef = useRef<HTMLDivElement>(null);

  const resetDrag = useCallback(() => {
    setDragX(0);
    lastDragX.current = 0;
  }, []);

  function tiltTo(event: ReactPointerEvent<HTMLDivElement>) {
    const el = tiltRef.current;
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
    const el = tiltRef.current;
    if (!el) return;
    el.dataset.active = 'false';
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
    el.style.setProperty('--glare', '0');
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (locked || (event.pointerType === 'mouse' && event.button !== 0)) return;
    pointer.current = { id: event.pointerId, startX: event.clientX, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const current = pointer.current;
    if (!current) {
      if (event.pointerType === 'mouse' && !locked) tiltTo(event);
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
      onTap();
      return;
    }

    setDragging(false);
    const delta = lastDragX.current;
    if (Math.abs(delta) >= SWIPE_THRESHOLD) {
      onSwipe(delta < 0); // the exit animation continues from where the drag ended
    } else {
      resetDrag(); // snap back
    }
  }

  function onPointerCancel() {
    pointer.current = null;
    lastDragX.current = 0;
    setDragging(false);
    setDragX(0);
    tiltReset();
  }

  return {
    tiltRef,
    dragX,
    dragging,
    resetDrag,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onPointerLeave: tiltReset },
  };
}
