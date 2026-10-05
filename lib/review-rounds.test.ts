import { describe, expect, it } from 'vitest';
import { initRounds, roundsReducer, summarizeRounds, type RoundsAction, type RoundsState } from './review-rounds';

const run = (state: RoundsState, ...actions: RoundsAction[]) => actions.reduce(roundsReducer, state);
const got = { type: 'sort', keep: false } as const;
const again = { type: 'sort', keep: true } as const;

describe('a round of review', () => {
  it('starts with every card, in order, at the first one', () => {
    expect(initRounds(4)).toEqual({ queue: [0, 1, 2, 3], position: 0, repeat: [], round: 1, run: 0, shuffles: 0 });
  });

  it('advances on either sort, remembering only the "review again" cards', () => {
    const s = run(initRounds(4), got, again, got, again);
    expect(s.position).toBe(4);
    expect(s.repeat).toEqual([1, 3]);
  });

  it('reports progress, known count and the current card', () => {
    const s = run(initRounds(4), got, again);
    expect(summarizeRounds(s)).toEqual({ total: 4, done: false, current: 2, known: 1, progressPercent: 50 });
  });

  it('is done once every card is sorted, with no current card', () => {
    const s = run(initRounds(2), got, got);
    expect(summarizeRounds(s)).toMatchObject({ done: true, current: null, known: 2, progressPercent: 100 });
  });

  it('ignores a sort after the round is over', () => {
    const done = run(initRounds(1), again);
    expect(roundsReducer(done, again)).toBe(done);
  });

  it('handles an empty deck without dividing by zero', () => {
    expect(summarizeRounds(initRounds(0))).toMatchObject({ total: 0, done: true, progressPercent: 0 });
  });
});

describe('shuffle', () => {
  it('replaces only the cards from the current one onward; sorted cards stay put', () => {
    const s = run(initRounds(5), got, again, { type: 'shuffle', upcoming: [4, 2, 3] });
    expect(s.queue).toEqual([0, 1, 4, 2, 3]);
    expect(s.position).toBe(2);
    expect(s.repeat).toEqual([1]);
  });

  it('bumps the counter that replays the entrance animation', () => {
    expect(run(initRounds(3), { type: 'shuffle', upcoming: [2, 1, 0] }).shuffles).toBe(1);
  });
});

describe('next round and restart', () => {
  it('next round is exactly the cards marked "review again"', () => {
    const s = run(initRounds(4), got, again, got, again, { type: 'nextRound' });
    expect(s).toMatchObject({ queue: [1, 3], position: 0, repeat: [], round: 2 });
    expect(summarizeRounds(s)).toMatchObject({ total: 2, done: false, current: 1 });
  });

  it('a clean round followed by next round is an empty, finished round', () => {
    expect(summarizeRounds(run(initRounds(2), got, got, { type: 'nextRound' })).done).toBe(true);
  });

  it('each new round gets a new run id, so stats count it once', () => {
    const first = run(initRounds(2), again, again);
    const second = run(first, { type: 'nextRound' });
    const third = run(second, { type: 'restart', count: 2 });
    expect([first.run, second.run, third.run]).toEqual([0, 1, 2]);
  });

  it('restart returns to round one with the full deck', () => {
    const s = run(initRounds(3), got, again, { type: 'shuffle', upcoming: [2, 1] }, { type: 'restart', count: 3 });
    expect(s).toMatchObject({ queue: [0, 1, 2], position: 0, repeat: [], round: 1 });
  });
});
