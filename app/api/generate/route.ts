import { NextResponse } from 'next/server';
import { generateStudySet } from '@/lib/ai/generate-study-set';
import { createGeminiClient } from '@/lib/ai/gemini-client';
import { extractTextFromFile, MAX_SOURCE_CHARS, normalizeText } from '@/lib/extract-text';
import { getCachedGeneration, setCachedGeneration } from '@/lib/ai/generation-cache';
import { checkRateLimit, rateLimitIdentifier } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';
import { generateRequestSchema } from '@/lib/validation';
import type { FailureCode } from '@/lib/ai/generate-study-set';
import type { CachedGeneration } from '@/lib/ai/generation-cache';

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

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const verdict = await checkRateLimit(rateLimitIdentifier(request, user?.id ?? null));
  if (!verdict.allowed) {
    const message =
      verdict.scope === 'daily'
        ? "You've hit the daily generation limit. It resets within 24 hours."
        : verdict.scope === 'unconfigured'
          ? 'Generation is temporarily unavailable.'
          : `That's a few too many in a row. Try again in ${verdict.retryAfterSeconds} seconds.`;

    return NextResponse.json(
      { error: message, reason: `rate_limited_${verdict.scope}` },
      { status: 429, headers: { 'Retry-After': String(verdict.retryAfterSeconds) } },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Malformed request.', reason: 'bad_request' }, { status: 400 });
  }

  const parsedFields = generateRequestSchema.safeParse({
    type: form.get('type'),
    itemCount: form.get('itemCount'),
    difficulty: form.get('difficulty'),
    text: form.get('text') ?? undefined,
  });

  if (!parsedFields.success) {
    return NextResponse.json(
      { error: 'Those generation options are out of range.', reason: 'bad_request' },
      { status: 400 },
    );
  }

  const { type, itemCount, difficulty, text } = parsedFields.data;

  const file = form.get('file');
  let sourceText: string;
  let truncated = false;

  if (file instanceof File && file.size > 0) {
    const extracted = await extractTextFromFile(file);
    if (!extracted.ok) {
      return NextResponse.json({ error: extracted.message, reason: 'bad_input' }, { status: 400 });
    }
    sourceText = extracted.text;
    truncated = extracted.truncated;
  } else if (text && text.trim()) {
    const normalized = normalizeText(text);
    truncated = normalized.length > MAX_SOURCE_CHARS;
    sourceText = truncated ? normalized.slice(0, MAX_SOURCE_CHARS) : normalized;
  } else {
    return NextResponse.json(
      { error: 'Paste some notes or upload a file first.', reason: 'bad_input' },
      { status: 400 },
    );
  }

  const cached = await getCachedGeneration(sourceText, type, itemCount, difficulty);
  if (cached) {
    return NextResponse.json({
      type: cached.type,
      items: cached.items,
      modelVersion: cached.modelVersion,
      sourceExcerpt: sourceText.slice(0, 240),
      truncated,
      attempts: 0,
      cached: true,
    });
  }

  let client;
  try {
    client = createGeminiClient();
  } catch (err) {
    console.error('Gemini client could not be created:', err);
    return NextResponse.json(
      { error: 'Generation is temporarily unavailable.', reason: 'misconfigured' },
      { status: 503 },
    );
  }

  const result = await generateStudySet({ sourceText, type, itemCount, difficulty }, client);

  if (!result.ok) {
    // diagnostics stay server-side: they can contain fragments of model output.
    console.warn('generation failed', {
      reason: result.reason,
      attempts: result.attempts,
      diagnostics: result.diagnostics,
    });
    return NextResponse.json(
      { error: result.message, reason: result.reason },
      { status: STATUS[result.reason] },
    );
  }

  setCachedGeneration(sourceText, type, itemCount, difficulty, {
    type: result.type,
    items: result.items,
    modelVersion: result.modelVersion,
  } as CachedGeneration);

  return NextResponse.json({
    type: result.type,
    items: result.items,
    modelVersion: result.modelVersion,
    sourceExcerpt: sourceText.slice(0, 240),
    truncated,
    attempts: result.attempts,
    cached: false,
  });
}