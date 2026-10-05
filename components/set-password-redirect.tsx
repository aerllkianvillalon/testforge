'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/alert';
import { SetPasswordForm } from '@/components/set-password-form';

/** SetPasswordForm plus "now go somewhere" — the one part that differs by page. */
export function SetPasswordRedirect({ submitLabel, redirectTo }: { submitLabel: string; redirectTo: string }) {
  const router = useRouter();
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <Alert tone="success" title="Password updated">
        Taking you there now…
      </Alert>
    );
  }

  return (
    <SetPasswordForm
      submitLabel={submitLabel}
      onSuccess={() => {
        setDone(true);
        router.push(redirectTo);
        router.refresh();
      }}
    />
  );
}
