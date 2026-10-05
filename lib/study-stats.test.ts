import { describe, expect, it } from 'vitest';
import { computeStreak, dayKey, lastDays, parseStats, type StudyStats } from '@/lib/study-stats';

const day = (cards = 1) => ({ cards, known: 0, questions: 0, correct: 0 });
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 15, 0, 0);

function statsFor(...dates: Date[]): StudyStats {
  return { days: Object.fromEntries(dates.map((d) => [dayKey(d), day()])) };
}

describe('computeStreak', () => {
  const today = at(2026, 9, 21);

  it('is 0 with no activity', () => {
    expect(computeStreak({ days: {} }, today)).toBe(0);
  });

  it('counts consecutive days ending today', () => {
    expect(computeStreak(statsFor(at(2026, 9, 21), at(2026, 9, 20), at(2026, 9, 19)), today)).toBe(3);
  });

  it('stays alive when only today is still empty', () => {
    expect(computeStreak(statsFor(at(2026, 9, 20), at(2026, 9, 19)), today)).toBe(2);
  });

  it('breaks after a missed day', () => {
    expect(computeStreak(statsFor(at(2026, 9, 21), at(2026, 9, 19)), today)).toBe(1);
    expect(computeStreak(statsFor(at(2026, 9, 18)), today)).toBe(0);
  });

  it('crosses month and year boundaries', () => {
    expect(computeStreak(statsFor(at(2026, 1, 1), at(2025, 12, 31), at(2025, 12, 30)), at(2026, 1, 1))).toBe(3);
  });
});

describe('lastDays', () => {
  it('returns the requested window oldest first, ending today', () => {
    const bars = lastDays(statsFor(at(2026, 9, 21)), 7, at(2026, 9, 21));
    expect(bars).toHaveLength(7);
    expect(bars[0].key).toBe('2026-09-15');
    expect(bars[6].key).toBe('2026-09-21');
    expect(bars[6].isToday).toBe(true);
    expect(bars[6].total).toBe(1);
    expect(bars[5].total).toBe(0);
  });
});

describe('parseStats', () => {
  it('treats missing or malformed storage as empty', () => {
    expect(parseStats(null).days).toEqual({});
    expect(parseStats('not json').days).toEqual({});
    expect(parseStats('{"days": 5}').days).toEqual({});
  });

  it('drops bad keys and coerces bad numbers to zero', () => {
    const parsed = parseStats(JSON.stringify({ days: { 'yesterday': { cards: 5 }, '2026-09-20': { cards: -3, known: 'x', questions: 4 } } }));
    expect(Object.keys(parsed.days)).toEqual(['2026-09-20']);
    expect(parsed.days['2026-09-20']).toEqual({ cards: 0, known: 0, questions: 4, correct: 0 });
  });
});
