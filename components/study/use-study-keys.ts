'use client';

import { useEffect, useRef } from 'react';

/**
 * Window-level keyboard shortcuts for a study session.
 *
 * Filters out what should never count as a shortcut (modifier combos, key
 * repeat, and anything typed into a text field, such as the "name this set"
 * input), then hands the key to `onKey`. The listener is registered once per
 * `enabled` change and calls the latest `onKey` through a ref, so it never acts
 * on a stale closure.
 */
export function useStudyKeys(
  enabled: boolean,
  onKey: (event: KeyboardEvent, target: HTMLElement | null) => void,
) {
  const latest = useRef(onKey);
  latest.current = onKey;

  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      latest.current(event, target);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
