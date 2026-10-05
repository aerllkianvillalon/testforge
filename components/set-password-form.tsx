'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/field';
import { describePasswordError } from '@/lib/password-errors';
import { MIN_PASSWORD_LENGTH } from '@/lib/site';
import { createClient } from '@/lib/supabase/client';

/**
 * `supabase.auth.updateUser({ password })` is what both flows call underneath:
 *  - the profile page, for a person who knows their current password and
 *    wants a new one (protected by their normal session)
 *  - /reset-password, for a person who clicked a recovery-email link (a
 *    session that link itself created)
 * Supabase treats both the same way — "the current session may set a new
 * password" — so one form covers both, parameterised by copy and what happens
 * after success.
 */
export function SetPasswordForm({
  submitLabel,
  onSuccess,
}: {
  submitLabel: string;
  onSuccess: () => void;
}) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const mismatched = confirm.length > 0 && password !== confirm;
  const canSubmit = password.length >= MIN_PASSWORD_LENGTH && password === confirm && !pending;

  async function submit() {
    if (!canSubmit) return;
    setError(null);
    setPending(true);
    try {
      const { error: updateError } = await createClient().auth.updateUser({ password });
      if (updateError) {
        setError(describePasswordError(updateError));
        return;
      }
      setPassword('');
      setConfirm('');
      onSuccess();
    } catch {
      setError('The request never reached us. Check your connection and try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && submit()}
        />
        <p className={`mt-1.5 text-xs ${tooShort ? 'text-destructive' : 'text-muted-foreground'}`}>
          At least {MIN_PASSWORD_LENGTH} characters.
        </p>
      </div>
      <div>
        <Label htmlFor="confirm-password">Confirm new password</Label>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && submit()}
        />
        {mismatched ? <p className="mt-1.5 text-xs text-destructive">Passwords don't match.</p> : null}
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}

      <Button onClick={submit} disabled={!canSubmit} className="w-full">
        {pending ? 'Updating…' : submitLabel}
      </Button>
    </div>
  );
}
