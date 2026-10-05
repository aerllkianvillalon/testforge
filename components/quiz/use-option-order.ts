'use client';

import { useEffect, useState } from 'react';
import { indices, shuffled } from '@/lib/shuffle';

const arrange = (count: number, shuffle: boolean) => (shuffle ? shuffled(indices(count)) : indices(count));

/**
 * The order in which the current question's options are displayed, as indices
 * into its `options`.
 *
 * It is re-arranged when the question changes, and when the "shuffle options"
 * toggle flips *before* the question is answered. Flipping it after answering
 * never reorders the options you're already looking at; it takes effect from
 * the next question. Seeded synchronously (not via an effect) so the first
 * question's options are present on the very first paint.
 */
export function useOptionOrder({
  questionId,
  optionCount,
  shuffle,
  locked,
}: {
  /** Identity of the current question; a change means "a new question is showing". */
  questionId: number | undefined;
  optionCount: number;
  shuffle: boolean;
  /** True once the question is answered. */
  locked: boolean;
}): number[] {
  const [order, setOrder] = useState<number[]>(() => indices(optionCount));

  // Deliberately keyed on a single trigger each: `shuffle`, `optionCount` and
  // `locked` are read as of the moment that trigger fires, not subscribed to.
  useEffect(() => {
    setOrder(arrange(optionCount, shuffle));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionId]);

  useEffect(() => {
    if (locked) return;
    setOrder(arrange(optionCount, shuffle));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shuffle]);

  return order;
}
