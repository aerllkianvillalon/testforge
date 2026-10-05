import { indices } from '@/lib/shuffle';

/**
 * The scheduling model for flashcard review, as pure state.
 *
 * Review runs in rounds. Cards marked "Review again" come back in the next
 * round; cards marked "Got it" drop out. That is the whole model: honest about
 * being simple, rather than implying a spaced-repetition system that isn't
 * there. Nothing here knows about React, the DOM, or randomness (a shuffle is
 * passed in already shuffled), so it can be tested directly.
 */
export type RoundsState = {
  /** Card indices in this round, in the order they'll be shown. */
  queue: number[];
  /** Where in `queue` the current card is; `queue.length` means the round is over. */
  position: number;
  /** Cards sorted to "review again" so far this round: the next round's queue. */
  repeat: number[];
  round: number;
  /** Bumps each time a round is started or restarted, so a finished round is counted once. */
  run: number;
  /** Bumps on each shuffle, so the "rise from the deck" entrance replays. */
  shuffles: number;
};

export type RoundsAction =
  /** Sort the current card. `keep` sends it to the "review again" pile. */
  | { type: 'sort'; keep: boolean }
  /** Replace the cards from the current one onward with `upcoming`, already shuffled. Sorted cards stay put. */
  | { type: 'shuffle'; upcoming: number[] }
  /** Start the next round from the cards marked "review again". */
  | { type: 'nextRound' }
  | { type: 'restart'; count: number };

export function initRounds(count: number): RoundsState {
  return { queue: indices(count), position: 0, repeat: [], round: 1, run: 0, shuffles: 0 };
}

export function roundsReducer(state: RoundsState, action: RoundsAction): RoundsState {
  switch (action.type) {
    case 'sort':
      if (state.position >= state.queue.length) return state;
      return {
        ...state,
        repeat: action.keep ? [...state.repeat, state.queue[state.position]] : state.repeat,
        position: state.position + 1,
      };

    case 'shuffle':
      return {
        ...state,
        queue: [...state.queue.slice(0, state.position), ...action.upcoming],
        shuffles: state.shuffles + 1,
      };

    case 'nextRound':
      return { ...state, queue: state.repeat, repeat: [], position: 0, round: state.round + 1, run: state.run + 1 };

    case 'restart':
      return { ...initRounds(action.count), run: state.run + 1, shuffles: state.shuffles };
  }
}

export function summarizeRounds({ queue, position, repeat }: RoundsState) {
  const total = queue.length;
  const done = position >= total;
  return {
    total,
    done,
    /** The card being shown, as an index into the original items; null once the round is over. */
    current: done ? null : queue[position],
    known: position - repeat.length,
    progressPercent: total === 0 ? 0 : Math.round((position / total) * 100),
  };
}
