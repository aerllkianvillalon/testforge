/**
 * `?next=` values come from the URL, so they're attacker-controlled. Only a
 * same-site path is allowed through; everything else falls back.
 *
 * Rejected on purpose:
 *   - "//evil.com" and "/\evil.com": browsers read these as another host
 *   - "@evil.com", "https://evil.com", "evil.com": not a path at all. Naively
 *     gluing one onto the origin ("https://site" + "@evil.com") is a redirect
 *     to evil.com.
 */
export function safeNextPath(next: string | null | undefined, fallback = '/dashboard'): string {
  if (!next) return fallback;
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(next)) return fallback;
  return next;
}
