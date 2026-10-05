import { describe, expect, it } from 'vitest';
import { cacheKey } from './generation-cache';

// sha256("hello"), so the expected keys below are written out by hand rather
// than computed with the code under test.
const HELLO = '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824';

describe('cacheKey', () => {
  it('keeps the format that is already in Redis, so a refactor never orphans warm entries', () => {
    expect(cacheKey({ sourceText: 'hello', type: 'quiz', itemCount: 5, difficulty: 'hard' })).toBe(
      `testforge:gen-cache:quiz:5:hard:${HELLO}`,
    );
  });

  it('ignores surrounding whitespace in the notes', () => {
    const a = cacheKey({ sourceText: '  hello\n', type: 'flashcards', itemCount: 8, difficulty: 'medium' });
    const b = cacheKey({ sourceText: 'hello', type: 'flashcards', itemCount: 8, difficulty: 'medium' });
    expect(a).toBe(b);
  });

  it('separates requests that would produce different output', () => {
    const base = { sourceText: 'hello', type: 'quiz', itemCount: 5, difficulty: 'hard' } as const;
    const keys = new Set([
      cacheKey(base),
      cacheKey({ ...base, type: 'flashcards' }),
      cacheKey({ ...base, itemCount: 6 }),
      cacheKey({ ...base, difficulty: 'easy' }),
      cacheKey({ ...base, sourceText: 'hello!' }),
    ]);
    expect(keys.size).toBe(5);
  });
});
