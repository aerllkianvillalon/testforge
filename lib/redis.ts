import 'server-only';
import { Redis } from '@upstash/redis';

/**
 * The one Upstash client, shared by the rate limiter and the generation cache.
 * `null` when the environment isn't configured; each caller decides what that
 * means (the limiter fails closed in production, the cache just always misses).
 */
export const redis: Redis | null =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;
