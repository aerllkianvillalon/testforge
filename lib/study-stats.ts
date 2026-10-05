import { useSyncExternalStore } from 'react';

/**
 * Study activity, kept in this browser's localStorage and nowhere else.
 *
 * That is a deliberate scope choice: it needs no schema change, works for
 * guests, and the UI says plainly that it's stored on this device. The catch is
 * that it doesn't follow someone to a second device.
 */

export type DayStats = { cards: number; known: number; questions: number; correct: number };
export type StudyStats = { days: Record<string, DayStats> };

const KEY = 'testforge:stats:v1';
const EVENT = 'testforge:stats';
const KEEP_DAYS = 120;
const EMPTY: StudyStats = { days: {} };
const ZERO: DayStats = { cards: 0, known: 0, questions: 0, correct: 0 };

/** Local calendar day, YYYY-MM-DD. Streaks follow the person's own midnight. */
export function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function addDays(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
}

export function dayTotal(day: DayStats | undefined): number {
  return day ? day.cards + day.questions : 0;
}

/**
 * Consecutive days with activity. A streak is still alive if today is empty
 * but yesterday isn't — the day isn't over, so it shouldn't read as broken.
 */
export function computeStreak(stats: StudyStats, today: Date = new Date()): number {
  let cursor = today;
  if (dayTotal(stats.days[dayKey(cursor)]) === 0) cursor = addDays(cursor, -1);

  let streak = 0;
  while (dayTotal(stats.days[dayKey(cursor)]) > 0) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export type DayBar = { key: string; label: string; total: number; isToday: boolean; stats: DayStats };

/** The last `count` days, oldest first, for the activity chart. */
export function lastDays(stats: StudyStats, count: number, today: Date = new Date()): DayBar[] {
  const bars: DayBar[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = addDays(today, -i);
    const key = dayKey(date);
    const day = stats.days[key] ?? ZERO;
    bars.push({
      key,
      label: date.toLocaleDateString(undefined, { weekday: 'short' }),
      total: dayTotal(day),
      isToday: i === 0,
      stats: day,
    });
  }
  return bars;
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/** Storage is untrusted input: anything malformed is dropped, never thrown on. */
export function parseStats(raw: string | null): StudyStats {
  if (!raw) return EMPTY;
  try {
    const parsed = JSON.parse(raw) as { days?: Record<string, Partial<DayStats>> };
    const days: Record<string, DayStats> = {};
    for (const [key, value] of Object.entries(parsed?.days ?? {})) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || typeof value !== 'object' || value === null) continue;
      days[key] = {
        cards: isCount(value.cards) ? value.cards : 0,
        known: isCount(value.known) ? value.known : 0,
        questions: isCount(value.questions) ? value.questions : 0,
        correct: isCount(value.correct) ? value.correct : 0,
      };
    }
    return { days };
  } catch {
    return EMPTY;
  }
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function recordActivity(delta: Partial<DayStats>): void {
  if (typeof window === 'undefined') return;

  const stats = { days: { ...parseStats(readRaw()).days } };
  const key = dayKey(new Date());
  const current = stats.days[key] ?? ZERO;
  stats.days[key] = {
    cards: current.cards + (delta.cards ?? 0),
    known: current.known + (delta.known ?? 0),
    questions: current.questions + (delta.questions ?? 0),
    correct: current.correct + (delta.correct ?? 0),
  };

  // Keep the newest KEEP_DAYS days so the stored blob can't grow forever.
  const kept = Object.keys(stats.days).sort().slice(-KEEP_DAYS);
  stats.days = Object.fromEntries(kept.map((k) => [k, stats.days[k]]));

  try {
    window.localStorage.setItem(KEY, JSON.stringify(stats));
  } catch {
    // Storage full or blocked: studying still works, it just isn't remembered.
  }
  window.dispatchEvent(new Event(EVENT));
}

// useSyncExternalStore needs getSnapshot to return the *same object* until the
// data changes, so the parsed value is cached against the raw string.
let cachedRaw: string | null | undefined;
let cachedValue: StudyStats = EMPTY;

function getSnapshot(): StudyStats {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedValue = parseStats(raw);
  }
  return cachedValue;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener('storage', onChange); // other tabs
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

/** Empty on the server and during hydration, real data right after. */
export function useStudyStats(): StudyStats {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}
