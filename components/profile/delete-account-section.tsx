'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/field';
import { NETWORK_ERROR, readErrorMessage } from '@/lib/api-client';
import { createClient } from '@/lib/supabase/client';

const CONFIRM_WORD = 'DELETE';

/**
 * Two steps on purpose: the first click only reveals the confirmation, it
 * doesn't delete anything. The second, destructive action stays disabled
 * until the person types the confirm word, so it can't be reached by a stray
 * double-click or a misplaced tap.
 */
export function DeleteAccountSection({ itemNoun }: { itemNoun: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete() {
    if (typed !== CONFIRM_WORD || pending) return;
    setError(null);
    setPending(true);
    try {
      const response = await fetch('/api/account', { method: 'DELETE' });
      if (!response.ok && response.status !== 204) {
        setError(await readErrorMessage(response, "We couldn't delete your account. Try again."));
        return;
      }
      // Belt and braces: the server already cleared the session cookie.
      await createClient().auth.signOut();
      router.push('/');
      router.refresh();
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-muted-foreground">
        This permanently deletes your account and every saved {itemNoun}. This can&apos;t be undone.
      </p>

      {error ? <Alert tone="error">{error}</Alert> : null}

      {!confirming ? (
        <Button variant="danger" onClick={() => setConfirming(true)}>
          Delete account
        </Button>
      ) : (
        <div className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
          <div>
            <Label htmlFor="confirm-delete">
              Type <span className="font-mono font-semibold">{CONFIRM_WORD}</span> to confirm
            </Label>
            <Input
              id="confirm-delete"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          {/* Stays on one line at any zoom level: both buttons use the
              compact "sm" size, and the destructive label shortens below
              420px so "Permanently delete account" + "Cancel" never has to
              wrap or spill out of the card. */}
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={confirmDelete}
              disabled={typed !== CONFIRM_WORD || pending}
            >
              {pending ? (
                'Deleting…'
              ) : (
                <>
                  <span className="max-[419px]:hidden">Permanently delete account</span>
                  <span className="hidden max-[419px]:inline">Delete account</span>
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setConfirming(false);
                setTyped('');
                setError(null);
              }}
              disabled={pending}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}