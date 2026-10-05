'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/field';
import { EyeIcon, EyeOffIcon, LockIcon, MailIcon } from '@/components/ui/icons';
import { safeNextPath } from '@/lib/safe-redirect';
import { MIN_PASSWORD_LENGTH } from '@/lib/site';
import { createClient } from '@/lib/supabase/client';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

    if (mode === 'register' && password !== confirmPassword) {
      setError("Those passwords don't match.");
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
        <div className="relative">
          <MailIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            autoComplete="email"
            className="pl-9"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && submit()}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <LockIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            className="pl-9 pr-9"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && submit()}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
          >
            {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
          </button>
        </div>
        {mode === 'register' ? (
          <p className="mt-1.5 text-xs text-muted-foreground">At least {MIN_PASSWORD_LENGTH} characters.</p>
        ) : null}
      </div>

      {mode === 'register' ? (
        <div>
          <Label htmlFor="confirm-password">Confirm password</Label>
          <div className="relative">
            <LockIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              className="pl-9 pr-9"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && submit()}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showConfirmPassword}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            >
              {showConfirmPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
            </button>
          </div>
          {confirmPassword && confirmPassword !== password ? (
            <p className="mt-1.5 text-xs text-destructive">Passwords don't match yet.</p>
          ) : null}
        </div>
      ) : null}

      {error ? <Alert tone="error">{error}</Alert> : null}

      <Button
        onClick={submit}
        disabled={pending || !email || !password || (mode === 'register' && !confirmPassword)}
        className="w-full"
      >
        {pending ? 'Working…' : mode === 'register' ? 'Create account' : 'Sign in'}
      </Button>

      {mode === 'login' ? (
        <p className="text-center">
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Forgot password?
          </Link>
        </p>
      ) : null}
    </div>
  );
}