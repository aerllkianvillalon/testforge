import { describe, expect, it } from 'vitest';
import {
  type GenerateInput,
  type ModelClient,
  type ModelRequest,
  generateStudySet,
} from './generate-study-set';

/**
 * Every test here feeds the module output a real model has produced at some
 * point: fenced JSON, a missing field, a stringified index, four identical
 * options, an apology instead of data. The happy path gets two tests; the rest
 * of the file is about what happens when the model misbehaves.
 */

/** Replays canned responses in order; the last one repeats if attempts run on. */
function stubClient(...replies: (string | Error)[]): ModelClient & { requests: ModelRequest[] } {
  const requests: ModelRequest[] = [];
  let i = 0;
  return {
    modelVersion: 'stub-model-1',
    requests,
    async generate(request) {
      requests.push(request);
      const reply = replies[Math.min(i, replies.length - 1)];
      i += 1;
      if (reply instanceof Error) throw reply;
      return reply;
    },
  };
}

const SOURCE = 'Mitochondria are organelles that generate ATP through oxidative phosphorylation. '.repeat(
  6,
);

const flashInput: GenerateInput = {
  sourceText: SOURCE,
  type: 'flashcards',
  itemCount: 2,
  difficulty: 'medium',
};

const quizInput: GenerateInput = {
  sourceText: SOURCE,
  type: 'quiz',
  itemCount: 1,
  difficulty: 'medium',
};

const validFlashcards = JSON.stringify({
  items: [
    { front: 'What do mitochondria produce?', back: 'ATP.' },
    { front: 'Via which process?', back: 'Oxidative phosphorylation.' },
  ],
});

const validQuiz = JSON.stringify({
  items: [
    {
      question: 'What do mitochondria produce?',
      options: ['ATP', 'DNA', 'Lipids', 'Cellulose'],
      correctIndex: 0,
      explanation: 'The notes state mitochondria generate ATP.',
    },
  ],
});

describe('happy path', () => {
  it('returns validated flashcards in one attempt', async () => {
    const client = stubClient(validFlashcards);
    const result = await generateStudySet(flashInput, client);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.type).toBe('flashcards');
    expect(result.items).toHaveLength(2);
    expect(result.attempts).toBe(1);
    expect(result.modelVersion).toBe('stub-model-1');
    expect(client.requests).toHaveLength(1);
  });

  it('returns validated quiz items', async () => {
    const result = await generateStudySet(quizInput, stubClient(validQuiz));
    expect(result.ok).toBe(true);
    if (!result.ok || result.type !== 'quiz') return;
    expect(result.items[0].correctIndex).toBe(0);
  });
});

describe('malformed output', () => {
  it('retries once with the specific validation error when a field is missing', async () => {
    const missingBack = JSON.stringify({
      items: [{ front: 'What do mitochondria produce?' }, { front: 'Via which process?' }],
    });
    const client = stubClient(missingBack, validFlashcards);
    const result = await generateStudySet(flashInput, client);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.attempts).toBe(2);
    expect(client.requests).toHaveLength(2);

    // The corrective message must name the offending field, not just say "retry".
    const retryPrompt = client.requests[1].userContent;
    expect(retryPrompt).toContain('REJECTED');
    expect(retryPrompt).toMatch(/items\.0\.back/);
  });

  it('rejects a wrong type on correctIndex and retries', async () => {
    const stringIndex = JSON.stringify({
      items: [
        {
          question: 'What do mitochondria produce?',
          options: ['ATP', 'DNA', 'Lipids', 'Cellulose'],
          correctIndex: '0',
          explanation: 'The notes state mitochondria generate ATP.',
        },
      ],
    });
    const client = stubClient(stringIndex, validQuiz);
    const result = await generateStudySet(quizInput, client);

    expect(result.ok).toBe(true);
    expect(client.requests[1].userContent).toMatch(/correctIndex/);
  });

  it('rejects an out-of-range correctIndex', async () => {
    const outOfRange = JSON.stringify({
      items: [
        {
          question: 'What do mitochondria produce?',
          options: ['ATP', 'DNA', 'Lipids', 'Cellulose'],
          correctIndex: 4,
          explanation: 'Off by one.',
        },
      ],
    });
    const result = await generateStudySet(quizInput, stubClient(outOfRange));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('invalid_output');
  });

  it('rejects duplicate options, which parse fine but are unanswerable', async () => {
    const duplicates = JSON.stringify({
      items: [
        {
          question: 'What do mitochondria produce?',
          options: ['ATP', 'ATP', 'Lipids', 'Cellulose'],
          correctIndex: 0,
          explanation: 'Two options are identical.',
        },
      ],
    });
    const client = stubClient(duplicates, validQuiz);
    const result = await generateStudySet(quizInput, client);

    expect(result.ok).toBe(true);
    expect(client.requests[1].userContent).toMatch(/options/);
  });

  it('rejects a whitespace-only field rather than rendering a blank card', async () => {
    const blank = JSON.stringify({
      items: [
        { front: 'What do mitochondria produce?', back: '   ' },
        { front: 'Via which process?', back: 'Oxidative phosphorylation.' },
      ],
    });
    const result = await generateStudySet(flashInput, stubClient(blank));
    expect(result.ok).toBe(false);
  });

  it('fails on an empty items array instead of rendering nothing', async () => {
    const result = await generateStudySet(flashInput, stubClient(JSON.stringify({ items: [] })));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('invalid_output');
    expect(result.attempts).toBe(2);
  });

  it('fails on a short set instead of silently returning fewer items', async () => {
    const short = JSON.stringify({ items: [{ front: 'Only one card', back: 'Not two.' }] });
    const client = stubClient(short);
    const result = await generateStudySet(flashInput, client);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('short_output');
    expect(client.requests[1].userContent).toMatch(/exactly 2/);
  });

  it('trims an over-long set rather than burning a retry on it', async () => {
    const extra = JSON.stringify({
      items: [
        { front: 'A', back: 'one' },
        { front: 'B', back: 'two' },
        { front: 'C', back: 'three' },
      ],
    });
    const client = stubClient(extra);
    const result = await generateStudySet(flashInput, client);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items).toHaveLength(2);
    expect(client.requests).toHaveLength(1);
  });
});

describe('unparseable output', () => {
  it('salvages JSON wrapped in markdown fences and prose', async () => {
    const wrapped = `Sure! Here are your flashcards:\n\n\`\`\`json\n${validFlashcards}\n\`\`\`\n\nLet me know if you want more.`;
    const client = stubClient(wrapped);
    const result = await generateStudySet(flashInput, client);

    expect(result.ok).toBe(true);
    // Salvaging must not cost an extra API call.
    expect(client.requests).toHaveLength(1);
  });

  it('retries when the model replies with prose only', async () => {
    const client = stubClient("I'm sorry, I can't help with that.", validFlashcards);
    const result = await generateStudySet(flashInput, client);

    expect(result.ok).toBe(true);
    expect(client.requests[1].userContent).toMatch(/could not be parsed as JSON/);
  });

  it('fails with unparseable_output after two bad attempts', async () => {
    const result = await generateStudySet(flashInput, stubClient('{ items: [broken'));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('unparseable_output');
    expect(result.attempts).toBe(2);
  });

  it('fails on an empty response', async () => {
    const result = await generateStudySet(flashInput, stubClient(''));
    expect(result.ok).toBe(false);
  });
});

describe('failure contract', () => {
  it('never throws when the model client throws', async () => {
    const client = stubClient(new Error('503 Service Unavailable'));
    const result = await generateStudySet(flashInput, client);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('model_unavailable');
    // A transport error is not a correctable one — don't spend a second call.
    expect(client.requests).toHaveLength(1);
    expect(result.diagnostics.join(' ')).toContain('503');
  });

  it('rejects source text that is too short without calling the model at all', async () => {
    const client = stubClient(validFlashcards);
    const result = await generateStudySet({ ...flashInput, sourceText: 'photosynthesis' }, client);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('empty_source');
    expect(client.requests).toHaveLength(0);
  });

  it('keeps raw model output out of the user-facing message', async () => {
    const leaky = 'INTERNAL_DEBUG_TOKEN_12345 is not valid JSON';
    const result = await generateStudySet(flashInput, stubClient(leaky));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).not.toContain('INTERNAL_DEBUG_TOKEN_12345');
    expect(result.diagnostics.join(' ')).toContain('INTERNAL_DEBUG_TOKEN_12345');
  });

  it('writes honest error copy, not apology-emoji copy', async () => {
    const result = await generateStudySet(flashInput, stubClient('nope'));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).not.toMatch(/oops|something went wrong|🙈/i);
    expect(result.message.length).toBeGreaterThan(20);
  });

  it('stops after MAX_ATTEMPTS even when the model keeps failing', async () => {
    const client = stubClient('garbage');
    await generateStudySet(flashInput, client);
    expect(client.requests).toHaveLength(2);
  });
});
