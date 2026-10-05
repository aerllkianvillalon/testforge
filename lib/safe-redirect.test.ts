import { describe, expect, it } from 'vitest';
import { safeNextPath } from '@/lib/safe-redirect';

describe('safeNextPath', () => {
  it('keeps same-site paths, including query strings', () => {
    expect(safeNextPath('/dashboard')).toBe('/dashboard');
    expect(safeNextPath('/profile?tab=security')).toBe('/profile?tab=security');
    expect(safeNextPath('/reset-password')).toBe('/reset-password');
  });

  it('falls back when missing', () => {
    expect(safeNextPath(null)).toBe('/dashboard');
    expect(safeNextPath('')).toBe('/dashboard');
    expect(safeNextPath(undefined, '/x')).toBe('/x');
  });

  it('rejects anything that could leave the site', () => {
    for (const bad of ['//evil.com', '/\\evil.com', '@evil.com', 'https://evil.com', 'evil.com', 'javascript:alert(1)', '.evil.com']) {
      expect(safeNextPath(bad)).toBe('/dashboard');
    }
  });

  it('rejects control characters used for header smuggling', () => {
    expect(safeNextPath('/ok\r\nSet-Cookie: a=b')).toBe('/dashboard');
    expect(safeNextPath('/ok\u0000')).toBe('/dashboard');
  });
});
