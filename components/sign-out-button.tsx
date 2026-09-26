'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogOutIcon } from '@/components/ui/icons';
import { createClient } from '@/lib/supabase/client';

/**
 * `compact` collapses the button to an icon below 400px viewport width, so it
 * can sit in the header next to the wordmark without wrapping or crowding it.
 * Other usages (e.g. the profile page) are unaffected and keep the text.
 */
export function SignOutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={signOut}
      className={compact ? 'gap-1.5 px-2 min-[400px]:px-3' : undefined}
      aria-label={compact ? 'Sign out' : undefined}
      title={compact ? 'Sign out' : undefined}
    >
      {compact && <LogOutIcon className="min-[400px]:hidden" />}
      <span className={compact ? 'hidden min-[400px]:inline' : undefined}>Sign out</span>
    </Button>
  );
}