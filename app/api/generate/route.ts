import { NextResponse } from 'next/server';
import { generateStudySet, type FailureCode } from '@/lib/ai/generate-study-set';
import type { GenerateInput } from '@/lib/ai/generate-study-set';
import { createGeminiClient } from '@/lib/ai/gemini-client';
import { getCachedGeneration, setCachedGeneration } from '@/lib/ai/generation-cache';
import type { CachedGeneration } from '@/lib/ai/generation-cache';
import { clampSource, extractTextFromFile } from '@/lib/extract-text';
import {
  checkRateLimit,
  rateLimitIdentifier,
  rateLimitResponse,
  type RateLimitMessages,
} from '@/lib/rate-limit';
import { getSessionUser } from '@/lib/supabase/server';
import { generateRequestSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** Every failure gets a status that matches what actually went wrong. */
const STATUS: Record<FailureCode, number> = {
  empty_source: 400,
  model_unavailable: 502,
  rate_limited: 429,
  unparseable_output: 422,
  invalid_output: 422,
  short_output: 422,
};

const RATE_LIMIT_MESSAGES: RateLimitMessages = {
  daily: "You've hit the daily generation limit. It resets within 24 hours.",
  unconfigured: 'Generation is temporarily unavailable.',
  burst: (seconds) => `That's a few too many in a row. Try again in ${seconds} seconds.`,
};

function failure(error: string, reason: string, status: number) {
  return NextResponse.json({ error, reason }, { status });
}

type Source = { ok: true; text: string; truncated: boolean } | { ok: false; message: string };

/** The uploaded file wins over pasted text, as in the form. */
async function resolveSource(form: FormData, pasted: string | undefined): Promise<Source> {
  const file = form.get('file');
  if (file instanceof File && file.size > 0) {
    return extractTextFromFile(file);
  }
  if (pasted && pasted.trim()) {
    return { ok: true, ...clampSource(pasted) };
  }
  return { ok: false, message: 'Paste some notes or upload a file first.' };
}

export async function POST(request: Request) {
  const user = await getSessionUser();

  const verdict = await checkRateLimit(rateLimitIdentifier(request, user?.id ?? null));
  if (!verdict.allowed) {
    return rateLimitResponse(verdict, RATE_LIMIT_MESSAGES, {
      reason: `rate_limited_${verdict.scope}`,
    });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return failure('Malformed request.', 'bad_request', 400);
  }

  const parsedFields = generateRequestSchema.safeParse({
    type: form.get('type'),
    itemCount: form.get('itemCount'),
    difficulty: form.get('difficulty'),
    text: form.get('text') ?? undefined,
  });
  if (!parsedFields.success) {
    return failure('Those generation options are out of range.', 'bad_request', 400);
  }
  const { type, itemCount, difficulty, text } = parsedFields.data;

  const source = await resolveSource(form, text);
  if (!source.ok) {
    return failure(source.message, 'bad_input', 400);
  }
  const { text: sourceText, truncated } = source;
  const input: GenerateInput = { sourceText, type, itemCount, difficulty };

  /** The shape the client receives, whether the set was generated or cached. */
  const success = (generated: CachedGeneration, attempts: number, cached: boolean) =>
    NextResponse.json({
      type: generated.type,
      items: generated.items,
      modelVersion: generated.modelVersion,
      sourceExcerpt: sourceText.slice(0, 240),
      truncated,
      attempts,
      cached,
    });

  const cached = await getCachedGeneration(input);
  if (cached) return success(cached, 0, true);

  let client;
  try {
    client = createGeminiClient();
  } catch (err) {
    console.error('Gemini client could not be created:', err);
    return failure('Generation is temporarily unavailable.', 'misconfigured', 503);
  }

  const result = await generateStudySet(input, client);

  if (!result.ok) {
    // diagnostics stay server-side: they can contain fragments of model output.
    console.warn('generation failed', {
      reason: result.reason,
      attempts: result.attempts,
      diagnostics: result.diagnostics,
    });
    return failure(result.message, result.reason, STATUS[result.reason]);
  }

  const { ok: _ok, attempts, ...generated } = result;
  setCachedGeneration(input, generated);
  return success(generated, attempts, false);
}
