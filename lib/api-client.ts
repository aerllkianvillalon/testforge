/** Shown when `fetch` itself rejects, i.e. the request never got a response. */
export const NETWORK_ERROR = 'The request never reached us. Check your connection and try again.';

/**
 * Pulls the `error` string our API routes put in their JSON failure bodies,
 * falling back to a message the caller supplies when the body isn't JSON or
 * has no usable `error`.
 */
export async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  const payload = await response.json().catch(() => null);
  return payload?.error ?? fallback;
}
