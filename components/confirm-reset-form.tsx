'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/alert';
import { Button, buttonVariants } from '@/components/ui/button';
import { NETWORK_ERROR } from '@/lib/api-client';
import { createClient } from '@/lib/supabase/client';

type Status = 'checking' | 'ready' | 'verifying' | 'error' | 'missing';

/**
 * The recovery email links here with `token_hash`/`type` in the URL
 * *fragment* (after `#`), not the query string — e.g.
 * `/reset-password/confirm#token_hash=...&type=recovery`.
 *
 * Fragments are never sent as part of the HTTP request, so an email-security
 * scanner or link-prefetcher that visits this URL only ever requests
 * `/reset-password/confirm` with nothing after the `#` to consume. The token
 * is invisible to it.
 *
 * On top of that, we don't call `verifyOtp` (which spends the single-use
 * token) until the person clicks the button below. A prefetcher fetches the
 * page; it doesn't click buttons. Between the two, the token can only be
 * spent by an actual person, in an actual browser, on purpose.
 */
export function ConfirmResetForm() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('checking');
  const [error, setError] = useState<string | null>(null);
  const [tokenHash, setTokenHash] = useState<string | null>(null);

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const token = fragment.get('token_hash');
    const type = fragment.get('type');

    if (token && type === 'recovery') {
      setTokenHash(token);
      setStatus('ready');
    } else {
      setStatus('missing');
    }
  }, []);

  async function confirm() {
    if (!tokenHash) return;
    setStatus('verifying');
    setError(null);
    try {
      const { error: verifyError } = await createClient().auth.verifyOtp({
        token_hash: tokenHash,
        type: 'recovery',
      });
      if (verifyError) {
        setError("This link has expired or was already used. Request a new one below.");
        setStatus('error');
        return;
      }
      router.push('/reset-password');
      router.refresh();
    } catch {
      setError(NETWORK_ERROR);
      setStatus('error');
    }
  }

  if (status === 'checking') {
    // Fragment isn't available until we're in the browser; avoid a flash of
    // the wrong state during the split second before the effect above runs.
    return null;
  }

  if (status === 'missing') {
    return (
      <div className="space-y-4">
        <Alert tone="error" title="Open this from your email">
          This page only works when opened from the link in your password reset email.
        </Alert>
        <Link href="/forgot-password" className={buttonVariants('secondary', 'md', 'w-full')}>
          Request a new link
        </Link>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="space-y-4">
        <Alert tone="error">{error}</Alert>
        <Link href="/forgot-password" className={buttonVariants('secondary', 'md', 'w-full')}>
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Click below to continue. This confirms it's really you clicking, not an automated link scanner in your
        email provider — that's also why this needs a click rather than happening automatically.
      </p>
      <Button onClick={confirm} disabled={status === 'verifying'} className="w-full">
        {status === 'verifying' ? 'Confirming…' : 'Reset my password'}
      </Button>
    </div>
  );
}
