import 'server-only';
import { Ratelimit } from '@upstash/ratelimit';
import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

/**
 * Rate limiting is here from day one because /api/generate has real marginal
 * cost: every request is a paid model call. Unlike the GWA calculator's
 * client-side arithmetic, an unthrottled loop against this endpoint spends
 * money, not just CPU.
 *
 * Every policy is two windows, both enforced:
 *   - a short burst window, so a stuck retry loop stops quickly
 *   - a daily window, so a patient scraper can't drain the quota overnight
 */

export type RateLimitVerdict =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterSeconds: number; scope: 'burst' | 'daily' }
  | { allowed: false; retryAfterSeconds: number; scope: 'unconfigured' };

export type DeniedVerdict = Extract<RateLimitVerdict, { allowed: false }>;

type Window = Parameters<typeof Ratelimit.slidingWindow>;

/** The slice of an Upstash limiter that we use; narrow so tests can stub it. */
export interface Limiter {
  limit(identifier: string): Promise<{ success: boolean; reset: number; remaining: number }>;
}

export type Policy = { burst: Limiter; daily: Limiter };

/** `null` when Redis isn't configured. Prefixes are the live Redis keys: don't rename. */
function createPolicy(prefix: string, burst: Window, daily: Window): Policy | null {
  const client = redis;
  if (!client) return null;
  const make = (suffix: string, [tokens, window]: Window) =>
    new Ratelimit({
      redis: client,
      limiter: Ratelimit.slidingWindow(tokens, window),
      prefix: `${prefix}:${suffix}`,
      analytics: false,
    });
  return { burst: make('burst', burst), daily: make('daily', daily) };
}

const generation = createPolicy('testforge', [5, '60 s'], [40, '24 h']);

/**
 * Account creation skips Supabase's own email-confirmation step (see
 * app/api/auth/register/route.ts), which removes the throttle that sending a
 * real email otherwise provides for free. This policy stands in its place, so
 * it is deliberately tighter than generation. It is keyed by IP alone, since a
 * request with no session yet has no user id to key on.
 */
const signup = createPolicy('testforge:signup', [3, '10 m'], [8, '24 h']);

function secondsUntil(resetMs: number): number {
  return Math.max(1, Math.ceil((resetMs - Date.now()) / 1000));
}

/**
 * Fails closed in production. An unconfigured limiter in a deployed
 * environment is a misconfiguration, not a reason to hand out free calls (or
 * let account creation through unthrottled), so it refuses rather than
 * silently disabling itself.
 */
export async function enforce(
  policy: Policy | null,
  identifier: string,
  refusing: string,
): Promise<RateLimitVerdict> {
  if (!policy) {
    if (process.env.NODE_ENV === 'production') {
      console.error(`Rate limiter is not configured; refusing ${refusing}.`);
      return { allowed: false, retryAfterSeconds: 60, scope: 'unconfigured' };
    }
    return { allowed: true, remaining: Number.POSITIVE_INFINITY };
  }

  const burst = await policy.burst.limit(identifier);
  if (!burst.success) {
    return { allowed: false, retryAfterSeconds: secondsUntil(burst.reset), scope: 'burst' };
  }

  const daily = await policy.daily.limit(identifier);
  if (!daily.success) {
    return { allowed: false, retryAfterSeconds: secondsUntil(daily.reset), scope: 'daily' };
  }

  return { allowed: true, remaining: daily.remaining };
}

export function checkRateLimit(identifier: string): Promise<RateLimitVerdict> {
  return enforce(generation, identifier, 'generation requests');
}

export function checkSignupRateLimit(ip: string): Promise<RateLimitVerdict> {
  return enforce(signup, ip, 'account creation');
}

/**
 * The caller's address as set by the proxy. Spoofable in general, but Vercel
 * sets it in deployment.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

/**
 * Identifies the caller for rate-limiting purposes. A logged-in user is keyed
 * by user id so that a shared campus NAT doesn't lock out a whole building.
 */
export function rateLimitIdentifier(request: Request, userId: string | null): string {
  return userId ? `user:${userId}` : `ip:${clientIp(request)}`;
}

/** What to tell the person for each way a request can be refused. */
export type RateLimitMessages = {
  daily: string;
  unconfigured: string;
  burst: (retryAfterSeconds: number) => string;
};

export function rateLimitResponse(
  verdict: DeniedVerdict,
  messages: RateLimitMessages,
  extra: Record<string, unknown> = {},
): NextResponse {
  const error =
    verdict.scope === 'daily'
      ? messages.daily
      : verdict.scope === 'unconfigured'
        ? messages.unconfigured
        : messages.burst(verdict.retryAfterSeconds);

  return NextResponse.json(
    { error, ...extra },
    { status: 429, headers: { 'Retry-After': String(verdict.retryAfterSeconds) } },
  );
}
