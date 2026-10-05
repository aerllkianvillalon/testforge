import { afterEach, describe, expect, it, vi } from 'vitest';
import { clientIp, enforce, rateLimitIdentifier, type Limiter, type Policy } from './rate-limit';

/** A limiter that replays canned results, one per call. */
function limiter(...results: { success: boolean; reset?: number; remaining?: number }[]): Limiter & {
  calls: string[];
} {
  const calls: string[] = [];
  let i = 0;
  return {
    calls,
    async limit(identifier) {
      calls.push(identifier);
      const r = results[Math.min(i++, results.length - 1)];
      return { success: r.success, reset: r.reset ?? Date.now() + 30_000, remaining: r.remaining ?? 0 };
    },
  };
}

const ok = { success: true, remaining: 7 };

afterEach(() => vi.unstubAllEnvs());

describe('enforce', () => {
  it('allows when both windows have room, reporting the daily remainder', async () => {
    const policy: Policy = { burst: limiter(ok), daily: limiter(ok) };
    expect(await enforce(policy, 'user:1', 'x')).toEqual({ allowed: true, remaining: 7 });
  });

  it('denies on the burst window without spending a daily token', async () => {
    const daily = limiter(ok);
    const policy: Policy = { burst: limiter({ success: false, reset: Date.now() + 12_000 }), daily };
    const verdict = await enforce(policy, 'user:1', 'x');

    expect(verdict).toMatchObject({ allowed: false, scope: 'burst' });
    expect(verdict.allowed === false && verdict.retryAfterSeconds).toBeGreaterThanOrEqual(11);
    expect(daily.calls).toEqual([]);
  });

  it('denies on the daily window', async () => {
    const policy: Policy = { burst: limiter(ok), daily: limiter({ success: false }) };
    expect(await enforce(policy, 'user:1', 'x')).toMatchObject({ allowed: false, scope: 'daily' });
  });

  it('never tells a caller to retry in under a second', async () => {
    const policy: Policy = { burst: limiter({ success: false, reset: Date.now() - 5_000 }), daily: limiter(ok) };
    const verdict = await enforce(policy, 'user:1', 'x');
    expect(verdict.allowed === false && verdict.retryAfterSeconds).toBe(1);
  });

  it('keys both windows by the identifier it was given', async () => {
    const burst = limiter(ok);
    const daily = limiter(ok);
    await enforce({ burst, daily }, 'ip:1.2.3.4', 'x');
    expect(burst.calls).toEqual(['ip:1.2.3.4']);
    expect(daily.calls).toEqual(['ip:1.2.3.4']);
  });

  it('fails closed in production when no limiter is configured', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await enforce(null, 'ip:1', 'account creation')).toEqual({
      allowed: false,
      retryAfterSeconds: 60,
      scope: 'unconfigured',
    });
    expect(error).toHaveBeenCalledWith('Rate limiter is not configured; refusing account creation.');
    error.mockRestore();
  });

  it('steps aside in development when no limiter is configured', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(await enforce(null, 'ip:1', 'x')).toMatchObject({ allowed: true });
  });
});

describe('caller identity', () => {
  const req = (headers: Record<string, string>) => new Request('http://x.test', { headers });

  it('prefers the first forwarded address', () => {
    expect(clientIp(req({ 'x-forwarded-for': ' 9.9.9.9 , 10.0.0.1' }))).toBe('9.9.9.9');
  });

  it('falls back to x-real-ip, then to a fixed placeholder', () => {
    expect(clientIp(req({ 'x-real-ip': '8.8.8.8' }))).toBe('8.8.8.8');
    expect(clientIp(req({}))).toBe('unknown');
  });

  it('keys signed-in users by id and guests by address', () => {
    expect(rateLimitIdentifier(req({ 'x-forwarded-for': '9.9.9.9' }), 'abc')).toBe('user:abc');
    expect(rateLimitIdentifier(req({ 'x-forwarded-for': '9.9.9.9' }), null)).toBe('ip:9.9.9.9');
  });
});
