'use client';

import { useEffect, useRef, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/field';
import { createClient } from '@/lib/supabase/client';

const RESEND_COOLDOWN = 60; // seconds; Supabase enforces its own server-side throttle too

/**
 * The only form in the app that sends an email. On submit it always shows the
 * same "check your email" message, whether or not that address has an
 * account — telling the two apart here would let this form be used to test
 * which emails are registered, which sign-up is allowed to reveal but this
 * isn't.
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearInterval(timer.current);
    };
  }, []);

  async function submit() {
    if (!email.trim() || pending || cooldown > 0) return;
    setPending(true);
    try {
      // Where the email link actually sends people is controlled by the
      // Recovery email template in the Supabase dashboard, not by a
      // redirectTo here — see the template note in app/auth/callback/route.ts.
      await createClient().auth.resetPasswordForEmail(email.trim());
    } catch {
      // Network failure: still show the generic message. Retrying costs
      // nothing and a specific error here would be one more way to fingerprint
      // whether the address exists (e.g. by comparing failure timing).
    } finally {
      setPending(false);
      setSent(true);
      setCooldown(RESEND_COOLDOWN);
      timer.current = window.setInterval(() => {
        setCooldown((c) => {
          if (c <= 1 && timer.current !== null) {
            window.clearInterval(timer.current);
            timer.current = null;
          }
          return Math.max(0, c - 1);
        });
      }, 1000);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <Alert tone="success" title="Check your email">
          If an account exists for {email.trim()}, we've sent a link to reset the password. It expires soon, so use
          it shortly after it arrives.
        </Alert>
        <Button variant="secondary" onClick={submit} disabled={pending || cooldown > 0} className="w-full">
          {cooldown > 0 ? `Send again in ${cooldown}s` : 'Send again'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
      <Button onClick={submit} disabled={pending || !email.trim()} className="w-full">
        {pending ? 'Sending…' : 'Send reset link'}
      </Button>
    </div>
  );
}
