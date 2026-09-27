import 'server-only';
import type { ModelClient, ModelRequest } from './generate-study-set';

const MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const TIMEOUT_MS = 25_000;

// Free-tier Gemini keys hit Requests-Per-Minute / Requests-Per-Day quotas
// under fairly light use. A 429 there is routine, not exceptional, so it's
// worth a couple of backed-off retries before it becomes a user-facing
// failure. Anything else (4xx/5xx besides 429) fails immediately, same as
// before — those aren't the kind of error a retry fixes.
const RATE_LIMIT_RETRIES = 2;
const BASE_BACKOFF_MS = 1_500;

/** Thrown only after 429 retries are exhausted, so callers can show an accurate message. */
export class GeminiRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeminiRateLimitError';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Honors a numeric Retry-After header (seconds) when the API sends one, else exponential backoff. */
function retryDelayMs(response: Response, attempt: number): number {
  const retryAfter = Number(response.headers.get('retry-after'));
  if (Number.isFinite(retryAfter) && retryAfter > 0) return retryAfter * 1000;
  return BASE_BACKOFF_MS * 2 ** attempt;
}

/**
 * The only place that talks to Gemini. It does one job — turn a ModelRequest
 * into raw text — and deliberately does no parsing or validation, so that
 * generate-study-set.ts stays the single place where trust is granted.
 *
 * `server-only` at the top makes an accidental client import a build error
 * rather than a leaked API key.
 */
export function createGeminiClient(): ModelClient {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  return {
    modelVersion: MODEL,

    async generate(request: ModelRequest): Promise<string> {
      for (let attempt = 0; attempt <= RATE_LIMIT_RETRIES; attempt++) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

        let response: Response;
        try {
          response = await fetch(`${ENDPOINT}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: request.systemInstruction }] },
              contents: [{ role: 'user', parts: [{ text: request.userContent }] }],
              generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: request.responseSchema,
                temperature: 0.4,
                maxOutputTokens: 4096,
              },
            }),
          });
        } finally {
          clearTimeout(timeout);
        }

        if (response.status === 429) {
          if (attempt < RATE_LIMIT_RETRIES) {
            await sleep(retryDelayMs(response, attempt));
            continue;
          }
          const body = await response.text().catch(() => '');
          throw new GeminiRateLimitError(
            `Gemini rate limit hit after ${RATE_LIMIT_RETRIES} retries: ${body.slice(0, 200)}`,
          );
        }

        if (!response.ok) {
          // Body may carry a useful reason; it is logged upstream via
          // diagnostics, never shown to the user.
          const body = await response.text().catch(() => '');
          throw new Error(`Gemini responded ${response.status}: ${body.slice(0, 200)}`);
        }

        const payload = (await response.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
        };

        const candidate = payload.candidates?.[0];
        if (candidate?.finishReason === 'MAX_TOKENS') {
          // Truncated JSON would fail parsing anyway; say so plainly in the log.
          throw new Error('Gemini output was truncated at the token limit');
        }

        const text = candidate?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
        if (!text) throw new Error('Gemini returned no text content');
        return text;
      }

      // Unreachable: the loop above always returns or throws.
      throw new Error('Gemini request failed for an unknown reason');
    },
  };
}