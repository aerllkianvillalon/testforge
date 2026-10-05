'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Tracks the `dark` class on <html> (set by the inline script in
 * layout.tsx before first paint) and flips it. `isDark` starts `false` and
 * is synced for real in an effect, so the first client render always
 * matches the server-rendered markup — same hydration-safe pattern as the
 * `mounted` guard in mobile-nav.tsx.
 */
export function useTheme() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggle = useCallback(() => {
    const root = document.documentElement;
    const next = root.classList.contains('dark') ? 'light' : 'dark';
    root.classList.toggle('dark', next === 'dark');
    setIsDark(next === 'dark');
    try {
      localStorage.setItem('theme', next);
    } catch {
      // Storage can be blocked; the cookie below still remembers the choice.
    }
    document.cookie = `theme=${next}; path=/; max-age=31536000; SameSite=Lax`;
  }, []);

  return { isDark, toggle };
}