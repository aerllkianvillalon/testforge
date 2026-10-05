'use client';

import { Button } from '@/components/ui/button';
import { MoonIcon, SunIcon } from '@/components/ui/icons';
import { useTheme } from '@/lib/use-theme';

/**
 * Compact icon button — used in the desktop header. For the mobile menu's
 * "Dark mode" row see ThemeSwitch instead (components/theme-switch.tsx),
 * which looks like an actual switch per the reference design.
 * Both icons are always rendered and swapped with the `dark:` variant, so
 * the button is correct on first paint with nothing to hydrate-mismatch.
 */
export function ThemeToggle() {
  const { toggle } = useTheme();

  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle light and dark theme">
      <SunIcon className="size-[1.1rem] dark:hidden" />
      <MoonIcon className="hidden size-[1.1rem] dark:block" />
    </Button>
  );
}