'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input, Label, PasswordInput } from '@/components/ui/field';
import { safeNextPath } from '@/lib/safe-redirect';
import { MIN_PASSWORD_LENGTH } from '@/lib/site';
import { createClient } from '@/lib/supabase/client';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const linkInvalid = mode === 'login' && params.get('error') === 'link_invalid';

  function goToNext() {
    router.push(safeNextPath(params.get('next')));
    router.refresh();
  }

  async function submit() {
    setError(null);

    if (mode === 'register' && password.length < MIN_PASSWORD_LENGTH) {
      setError(`Passwords need at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setPending(true);
    try {
      if (mode === 'register') {
        // Account creation happens server-side with the admin API, which marks
        // the address confirmed on the spot — no confirmation email, no wait.
        // See app/api/auth/register/route.ts for why.
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          setError(payload?.error ?? "We couldn't create that account. Try again.");
          return;
        }
        if (payload?.accountCreated && !payload?.ok) {
          // Created but the automatic sign-in failed; send them to log in manually.
          router.push('/login');
          return;
        }
      } else {
        const supabase = createClient();
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setError(
            signInError.message === 'Invalid login credentials'
              ? 'That email and password combination does not match an account.'
              : signInError.message,
          );
          return;
        }
      }

      goToNext();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      {linkInvalid && !error ? (
        <Alert tone="error" title="That reset link didn't work">
          It may have expired, already been used, or been opened by an email security scanner before you clicked
          it. Use "Forgot password?" below to request a new one.
        </Alert>
      ) : null}
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && submit()}
        />
      </div>
      <div>
        <div className="flex items-baseline justify-between">
          <Label htmlFor="password">Password</Label>
          {mode === 'login' ? (
            <Link
              href="/forgot-password"
              className="mb-2 text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Forgot password?
            </Link>
          ) : null}
        </div>
        <PasswordInput
          id="password"
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && submit()}
        />
        {mode === 'register' ? (
          <p className="mt-1.5 text-xs text-muted-foreground">At least {MIN_PASSWORD_LENGTH} characters.</p>
        ) : null}
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}

      <Button onClick={submit} disabled={pending || !email || !password} className="w-full">
        {pending ? 'Working…' : mode === 'register' ? 'Create account' : 'Sign in'}
      </Button>
    </div>
  );
}
