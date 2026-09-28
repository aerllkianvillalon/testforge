'use client';

import { Button } from '@/components/ui/button';
import { MoonIcon, SunIcon } from '@/components/ui/icons';

/**
 * Both icons are always rendered and swapped with the `dark:` variant, so the
 * button is correct on first paint and there is nothing to hydrate-mismatch.
 */
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = root.classList.contains('dark') ? 'light' : 'dark';
    root.classList.toggle('dark', next === 'dark');
    try {
      localStorage.setItem('theme', next);
    } catch {
      // Storage can be blocked; the cookie below still remembers the choice.
    }
    document.cookie = `theme=${next}; path=/; max-age=31536000; SameSite=Lax`;
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle light and dark theme">
      <SunIcon className="size-[1.1rem] dark:hidden" />
      <MoonIcon className="hidden size-[1.1rem] dark:block" />
    </Button>
  );
}