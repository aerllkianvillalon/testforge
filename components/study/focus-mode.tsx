'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Focus mode: locks page scroll while on, and lets Esc leave. */
export function useFocusMode() {
  const [focus, setFocus] = useState(false);

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

  const toggle = useCallback(() => setFocus((f) => !f), []);
  const exit = useCallback(() => setFocus(false), []);

  return { focus, toggle, exit };
}

/**
 * Renders `children` in place, or, in focus mode, as a full-screen overlay
 * portaled straight to `document.body`.
 *
 * A portal rather than a fixed-position class, because these components can be
 * mounted anywhere (the generator result, or nested inside a card on the
 * dashboard), and a z-index only beats the site header if nothing between here
 * and <body> quietly starts a new stacking context. A portal makes the overlay
 * a sibling of the header instead of a descendant, so it always paints on top.
 *
 * `active` starts `false` and only ever flips to `true` from a click, so the
 * server render and the first client render always take the in-place branch:
 * `document` is never touched before it exists.
 */
export function FocusShell({ active, children }: { active: boolean; children: ReactNode }) {
  if (!active) return <>{children}</>;
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
