import type { ZodError } from 'zod';
import { GeminiRateLimitError } from './gemini-client';
import {
  type Difficulty,
  type Flashcard,
  type QuizItem,
  type StudySetType,
  geminiResponseSchemaFor,
  setSchemaFor,
} from './schemas';

/**
 * Generation with validation and one corrective retry.
 *
 * The contract this module holds up for every caller:
 *   - it never throws; every failure comes back as a typed result
 *   - nothing reaches the caller that hasn't passed Zod
 *   - raw model output never escapes into `message` (it goes in `diagnostics`,
 *     which is for logs, not for the client)
 *
 * The model client is injected rather than imported so the failure paths can be
 * tested against deliberately malformed responses. See generate-study-set.test.ts.
 */

export const MAX_ATTEMPTS = 2;
export const MIN_SOURCE_CHARS = 200;

export type GenerateInput = {
  sourceText: string;
  type: StudySetType;
  itemCount: number;
  difficulty: Difficulty;
};

export type ModelRequest = {
  systemInstruction: string;
  userContent: string;
  responseSchema: unknown;
};

export interface ModelClient {
  readonly modelVersion: string;
  generate(request: ModelRequest): Promise<string>;
}

export type FailureCode =
  | 'empty_source'
  | 'model_unavailable'
  | 'rate_limited'
  | 'unparseable_output'
  | 'invalid_output'
  | 'short_output';

export type GenerationSuccess =
  | { ok: true; type: 'flashcards'; items: Flashcard[]; modelVersion: string; attempts: number }
  | { ok: true; type: 'quiz'; items: QuizItem[]; modelVersion: string; attempts: number };

export type GenerationFailure = {
  ok: false;
  reason: FailureCode;
  /** Safe to show a user: specific about what to do, vague about our internals. */
  message: string;
  /** Safe to log, never to render: may contain fragments of model output. */
  diagnostics: string[];
  attempts: number;
};

export type GenerationResult = GenerationSuccess | GenerationFailure;

export async function generateStudySet(
  input: GenerateInput,
  client: ModelClient,
): Promise<GenerationResult> {
  const source = input.sourceText.trim();
  const diagnostics: string[] = [];

  if (source.length < MIN_SOURCE_CHARS) {
    return fail('empty_source', input, diagnostics, 0, [
      `source was ${source.length} chars, minimum is ${MIN_SOURCE_CHARS}`,
    ]);
  }

  const schema = setSchemaFor(input.type);
  const responseSchema = geminiResponseSchemaFor(input.type);
  const systemInstruction = buildSystemInstruction(input);

  let correction: string | null = null;
  let lastCode: FailureCode = 'invalid_output';

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let raw: string;
    try {
      raw = await client.generate({
        systemInstruction,
        userContent: buildUserContent(source, correction),
        responseSchema,
      });
    } catch (err) {
      // The request never landed, so there is nothing to correct. Retrying the
      // same call on a transport error is a separate concern and belongs in the
      // client, not in the validation loop. (429s are already retried with
      // backoff inside the client — reaching here means those retries ran out.)
      diagnostics.push(`attempt ${attempt}: model call failed: ${describeError(err)}`);
      if (err instanceof GeminiRateLimitError) {
        return fail('rate_limited', input, diagnostics, attempt);
      }
      return fail('model_unavailable', input, diagnostics, attempt);
    }

    const parsed = extractJson(raw);
    if (!parsed.ok) {
      lastCode = 'unparseable_output';
      diagnostics.push(`attempt ${attempt}: ${parsed.detail} :: ${preview(raw)}`);
      correction =
        `Your previous reply could not be parsed as JSON (${parsed.detail}). ` +
        `Reply with the JSON object and nothing else — no prose, no markdown fences.`;
      continue;
    }

    const validated = schema.safeParse(parsed.value);
    if (!validated.success) {
      lastCode = 'invalid_output';
      const summary = summarizeZodError(validated.error);
      diagnostics.push(`attempt ${attempt}: schema validation failed: ${summary}`);
      correction =
        `Your previous reply parsed as JSON but did not match the schema. ` +
        `These fields were wrong: ${summary}. Fix exactly those and return the whole object again.`;
      continue;
    }

    const items = validated.data.items;

    if (items.length < input.itemCount) {
      // A short set is a failure, not a partial success. Rendering 4 cards when
      // the user asked for 10 is a silent bug that looks like a working feature.
      lastCode = 'short_output';
      diagnostics.push(
        `attempt ${attempt}: returned ${items.length} items, requested ${input.itemCount}`,
      );
      correction =
        `Your previous reply contained ${items.length} items but exactly ` +
        `${input.itemCount} were requested. Return ${input.itemCount} items.`;
      continue;
    }

    if (items.length > input.itemCount) {
      // Over-generation is harmless and a retry costs a real API call, so trim.
      diagnostics.push(
        `attempt ${attempt}: returned ${items.length} items, trimmed to ${input.itemCount}`,
      );
    }

    const trimmed = items.slice(0, input.itemCount);
    return input.type === 'flashcards'
      ? {
          ok: true,
          type: 'flashcards',
          items: trimmed as Flashcard[],
          modelVersion: client.modelVersion,
          attempts: attempt,
        }
      : {
          ok: true,
          type: 'quiz',
          items: trimmed as QuizItem[],
          modelVersion: client.modelVersion,
          attempts: attempt,
        };
  }

  return fail(lastCode, input, diagnostics, MAX_ATTEMPTS);
}

/* ---------------------------------------------------------------- prompting */

function buildSystemInstruction(input: GenerateInput): string {
  const lines = [
    "You turn a student's own study notes into practice material.",
    'Use only information present in the notes. Do not introduce outside facts.',
    `Pitch the difficulty at: ${input.difficulty}.`,
    `Return exactly ${input.itemCount} items.`,
    'Return a single JSON object matching the provided schema. No prose, no markdown fences.',
  ];

  if (input.type === 'flashcards') {
    lines.push(
      '"front" is a short prompt or term. "back" is the answer in one or two sentences.',
      'Do not repeat the same fact across cards.',
    );
  } else {
    lines.push(
      'Each item is one multiple-choice question with exactly four options.',
      'The three wrong options must be plausible and distinct from each other and from the answer.',
      '"correctIndex" is the zero-based index of the correct option.',
      '"explanation" says why that option is right, in one or two sentences.',
    );
  }

  return lines.join('\n');
}

function buildUserContent(source: string, correction: string | null): string {
  if (!correction) return `NOTES:\n${source}`;
  return `NOTES:\n${source}\n\nYOUR PREVIOUS REPLY WAS REJECTED.\n${correction}`;
}

/* ------------------------------------------------------------------ parsing */

type ParseOutcome = { ok: true; value: unknown } | { ok: false; detail: string };

/**
 * Models wrap JSON in fences or a sentence of preamble often enough that a
 * narrow salvage is worth it — a retry costs a paid call and several seconds.
 * The salvage is deliberately dumb: strip one fence, or take the outermost
 * braces. Anything cleverer starts guessing at meaning, and a wrong guess is
 * worse than an honest retry.
 */
export function extractJson(raw: string): ParseOutcome {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, detail: 'empty response' };

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  let candidate = fenced ? fenced[1].trim() : trimmed;

  if (!candidate.startsWith('{')) {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start === -1 || end <= start) return { ok: false, detail: 'no JSON object found' };
    candidate = candidate.slice(start, end + 1);
  }

  try {
    const value = JSON.parse(candidate);
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      return { ok: false, detail: 'parsed value was not an object' };
    }
    return { ok: true, value };
  } catch (err) {
    return { ok: false, detail: `JSON.parse failed: ${describeError(err)}` };
  }
}

/* ----------------------------------------------------------------- failures */

const MESSAGES: Record<Exclude<FailureCode, 'short_output'>, string> = {
  empty_source:
    "There wasn't enough text to work with. Paste at least a few paragraphs, or upload a file with selectable text.",
  model_unavailable:
    "The generation service didn't respond. That's on our side — try again in a moment.",
  rate_limited:
    "The generation service is rate-limited right now — this happens on the free API tier under repeated use. Wait a minute and try again.",
  unparseable_output:
    "We couldn't generate reliable questions from that text. Try shorter or more structured notes.",
  invalid_output:
    "We couldn't generate reliable questions from that text. Try shorter or more structured notes.",
};

function fail(
  reason: FailureCode,
  input: GenerateInput,
  diagnostics: string[],
  attempts: number,
  extraDiagnostics: string[] = [],
): GenerationFailure {
  const message =
    reason === 'short_output'
      ? `We could only get a few usable items out of those notes, not ${input.itemCount}. Try asking for fewer, or adding more detail.`
      : MESSAGES[reason];

  return { ok: false, reason, message, diagnostics: [...diagnostics, ...extraDiagnostics], attempts };
}

export function summarizeZodError(error: ZodError, maxIssues = 5): string {
  const issues = error.issues.slice(0, maxIssues).map((issue) => {
    const path = issue.path.length ? issue.path.join('.') : '(root)';
    return `${path}: ${issue.message}`;
  });
  const extra = error.issues.length - issues.length;
  return issues.join('; ') + (extra > 0 ? ` (and ${extra} more)` : '');
}

function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function preview(raw: string, max = 160): string {
  const flat = raw.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}