import 'server-only';
import { createHash } from 'node:crypto';
import { Redis } from '@upstash/redis';
import type { Difficulty, Flashcard, QuizItem, StudySetType } from './schemas';

/**
 * Generation is the one paid, rate-limited call in this app. Identical
 * inputs are common enough to be worth caching for real, not just for
 * latency: the "Try sample notes" button sends the exact same text for
 * every visitor, and a user who nudges Items or Difficulty and then nudges
 * it back submits the same request twice. Keying by a hash of the actual
 * source text (plus the settings that change the output) means only
 * genuinely new content ever reaches Gemini.
 *
 * Reuses the same Upstash Redis instance as lib/rate-limit.ts — no new
 * infrastructure to configure. Skips silently when Redis isn't configured:
 * unlike the rate limiter, this isn't a cost-control that must fail closed,
 * it's a pure optimization, so an unconfigured cache just means "always
 * miss," same as before this existed. A read or write failure degrades the
 * same way — generation should never be blocked by a cache outage.
 */

const configured = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
);
const redis = configured ? Redis.fromEnv() : null;

// A week: long enough that the sample notes and any popular pasted text stay
// warm, short enough that a prompt/schema change ships without a manual flush.
const TTL_SECONDS = 60 * 60 * 24 * 7;
const PREFIX = 'testforge:gen-cache';

export type CachedGeneration =
  | { type: 'flashcards'; items: Flashcard[]; modelVersion: string }
  | { type: 'quiz'; items: QuizItem[]; modelVersion: string };

function cacheKey(sourceText: string, type: StudySetType, itemCount: number, difficulty: Difficulty): string {
  const hash = createHash('sha256').update(sourceText.trim()).digest('hex');
  return `${PREFIX}:${type}:${itemCount}:${difficulty}:${hash}`;
}

export async function getCachedGeneration(
  sourceText: string,
  type: StudySetType,
  itemCount: number,
  difficulty: Difficulty,
): Promise<CachedGeneration | null> {
  if (!redis) return null;
  try {
    const value = await redis.get<CachedGeneration>(cacheKey(sourceText, type, itemCount, difficulty));
    return value ?? null;
  } catch (err) {
    // A cache outage should degrade to "generate normally," never break generation.
    console.warn('generation cache read failed, continuing without it:', err);
    return null;
  }
}

/**
 * Fire-and-forget by design: a cache write failing or running slow should
 * never delay or break the response the user is already looking at.
 */
export function setCachedGeneration(
  sourceText: string,
  type: StudySetType,
  itemCount: number,
  difficulty: Difficulty,
  result: CachedGeneration,
): void {
  if (!redis) return;
  redis
    .set(cacheKey(sourceText, type, itemCount, difficulty), result, { ex: TTL_SECONDS })
    .catch((err) => console.warn('generation cache write failed, continuing without it:', err));
}