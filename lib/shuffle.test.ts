import { describe, expect, it } from 'vitest';
import { indices, shuffled } from './shuffle';

/** Deterministic stand-in for Math.random. */
function sequence(...values: number[]) {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('shuffled', () => {
  it('returns a permutation: same items, same count', () => {
    const out = shuffled([1, 2, 3, 4, 5, 6], sequence(0.1, 0.9, 0.5, 0.3, 0.7));
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('never mutates its input', () => {
    const input = [1, 2, 3, 4];
    shuffled(input, sequence(0.2, 0.8));
    expect(input).toEqual([1, 2, 3, 4]);
  });

  it('is fully determined by the random source', () => {
    const a = shuffled(indices(8), sequence(0.31, 0.62, 0.93, 0.14));
    const b = shuffled(indices(8), sequence(0.31, 0.62, 0.93, 0.14));
    expect(a).toEqual(b);
  });

  it('leaves order unchanged when every pick is the last slot, and reverses it when every pick is the first', () => {
    expect(shuffled([1, 2, 3, 4], () => 0.999)).toEqual([1, 2, 3, 4]);
    expect(shuffled([1, 2, 3, 4], () => 0)).toEqual([2, 3, 4, 1]);
  });

  it('copes with empty and single-item lists, consuming no randomness', () => {
    const never = () => {
      throw new Error('should not be called');
    };
    expect(shuffled([], never)).toEqual([]);
    expect(shuffled(['only'], never)).toEqual(['only']);
  });

  it('can produce every ordering of three items', () => {
    const seen = new Set<string>();
    for (const a of [0, 0.5, 0.99]) for (const b of [0, 0.99]) seen.add(shuffled([1, 2, 3], sequence(a, b)).join(''));
    expect(seen.size).toBe(6);
  });
});

describe('indices', () => {
  it('counts from zero', () => {
    expect(indices(4)).toEqual([0, 1, 2, 3]);
    expect(indices(0)).toEqual([]);
  });
});
