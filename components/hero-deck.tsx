'use client';

import { FlashcardReview } from '@/components/flashcards/flashcard-review';
import { SparklesIcon } from '@/components/ui/icons';
import type { Flashcard } from '@/lib/ai/schemas';

const SAMPLE_CARDS: Flashcard[] = [
  { front: 'What does the mitochondrion do?', back: 'Produces most of the cell’s ATP through respiration.' },
  {
    front: 'Why did the Berlin Wall fall in 1989?',
    back: 'Mass protest, and East Germany’s border policy collapsing under it.',
  },
  { front: 'What is the derivative of sin(x)?', back: 'cos(x)' },
];

/**
 * A live demo on the landing page: the first thing a visitor can touch is the
 * product's actual flashcard review, not a lookalike — same flip and
 * drag-to-sort you get from a real generated set. `trackStats` is off so
 * playing with it never touches this browser's real study streak, and
 * `compact` drops the secondary toolbar and keyboard hint to fit the hero's
 * narrower column.
 *
 * Flashcards only, on purpose: a visitor should be able to flip a card and
 * get it immediately, not be routed through a multi-question quiz just to
 * see what the product does.
 */
export function HeroDeck() {
  return (
    <div className="space-y-4">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <SparklesIcon className="size-3.5" />
        Example — try it with your own notes below
      </p>

      <FlashcardReview items={SAMPLE_CARDS} trackStats={false} compact />
    </div>
  );
}