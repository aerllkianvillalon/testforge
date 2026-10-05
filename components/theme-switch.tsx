'use client';

import { cn } from '@/lib/utils';
import { useTheme } from '@/lib/use-theme';

/**
 * A real switch (track + sliding thumb) rather than an icon button — for the
 * mobile menu's "Dark mode" row, matching the reference screenshot. The
 * desktop header keeps the compact icon ThemeToggle; both share useTheme so
 * toggling one is reflected correctly if the other is re-rendered.
 */
export function ThemeSwitch({ className }: { className?: string }) {
  const { isDark, toggle } = useTheme();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Dark mode"
      onClick={toggle}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        isDark ? 'bg-primary' : 'bg-input',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'inline-block size-5 rounded-full bg-background shadow transition-transform',
          isDark ? 'translate-x-[22px]' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}