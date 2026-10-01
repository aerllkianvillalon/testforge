'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { FlashcardReview } from '@/components/flashcards/flashcard-review';
import { QuizRunner } from '@/components/quiz/quiz-runner';
import { DownloadIcon, LayersIcon, ListChecksIcon, UndoIcon } from '@/components/ui/icons';
import { downloadSet } from '@/lib/export';
import type { GeneratedSet } from '@/lib/types';

export function ResultPanel({
  set,
  signedIn,
  onReset,
}: {
  set: GeneratedSet;
  signedIn: boolean;
  onReset: () => void;
}) {
  const isCards = set.type === 'flashcards';
  const Icon = isCards ? LayersIcon : ListChecksIcon;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex shrink-0 items-center gap-2.5 whitespace-nowrap text-lg font-semibold tracking-tight">
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-secondary text-secondary-foreground">
            <Icon />
          </span>
          {isCards ? `${set.items.length} flashcards` : `${set.items.length} questions`}
        </h2>
        <div className="flex shrink-0 items-center gap-2">
          {/* Three states as the viewport (or zoom level) shrinks:
              icon-only below 420px, a short label from 420px up, and the
              full label from md (768px) up. The accessible name always
              comes from aria-label, so screen readers get it regardless
              of which text is visually shown. */}
          <Button
            variant="secondary"
            size="sm"
            className="max-[419px]:!w-8 max-[419px]:!px-0"
            onClick={() => downloadSet(set)}
            title={isCards ? 'Download as a tab-separated file that Anki can import' : 'Download as a CSV spreadsheet'}
            aria-label={isCards ? 'Export for Anki' : 'Export CSV'}
          >
            <DownloadIcon />
            <span className="hidden min-[420px]:inline md:hidden">{isCards ? 'Export' : 'Export CSV'}</span>
            <span className="hidden md:inline">{isCards ? 'Export for Anki' : 'Export CSV'}</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="max-[419px]:!w-8 max-[419px]:!px-0"
            onClick={onReset}
            title="Start over"
            aria-label="Start over"
          >
            <UndoIcon />
            <span className="hidden min-[420px]:inline">Start over</span>
          </Button>
        </div>
      </div>

      {set.type === 'flashcards' ? <FlashcardReview items={set.items} /> : <QuizRunner items={set.items} />}

      <SavePrompt set={set} signedIn={signedIn} />
    </div>
  );
}

function SavePrompt({ set, signedIn }: { set: GeneratedSet; signedIn: boolean }) {
  const [title, setTitle] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState<string | null>(null);

  if (!signedIn) {
    return (
      <p className="mx-auto max-w-xl border-t pt-5 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
          Sign in
        </Link>{' '}
        to save this set and come back to it later.
      </p>
    );
  }

  if (state === 'saved') {
    return (
      <Alert tone="success" className="mx-auto max-w-xl">
        Saved.{' '}
        <Link href="/dashboard" className="font-medium underline underline-offset-4">
          Open your dashboard
        </Link>
        .
      </Alert>
    );
  }

  async function save() {
    setError(null);
    setState('saving');
    try {
      const response = await fetch('/api/sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: set.type,
          title: title.trim() || undefined,
          items: set.items,
          sourceExcerpt: set.sourceExcerpt,
          modelVersion: set.modelVersion,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(payload?.error ?? "We couldn't save that set.");
        setState('idle');
        return;
      }
      setState('saved');
    } catch {
      setError('The request never reached us. Check your connection and try again.');
      setState('idle');
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-3 border-t pt-5">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Name this set (optional)"
          aria-label="Set name"
          maxLength={120}
          className="max-w-xs"
        />
        <Button onClick={save} disabled={state === 'saving'}>
          {state === 'saving' ? 'Saving…' : 'Save set'}
        </Button>
      </div>
      {error ? <Alert tone="error">{error}</Alert> : null}
    </div>
  );
}