import { z } from 'zod';

export type StudySetType = 'flashcards' | 'quiz';
export type Difficulty = 'easy' | 'medium' | 'hard';

/**
 * Trimmed, non-empty, length-capped text.
 *
 * `.trim()` runs before `.min(1)` because Zod applies string checks in chain
 * order, so a field containing only whitespace is rejected rather than silently
 * becoming an empty flashcard back.
 */
const text = (max: number) => z.string().trim().min(1).max(max);

export const flashcardSchema = z.object({
  front: text(300),
  back: text(800),
});
export type Flashcard = z.infer<typeof flashcardSchema>;

export const quizItemSchema = z
  .object({
    question: text(500),
    options: z.array(text(200)).length(4),
    correctIndex: z.number().int().min(0).max(3),
    explanation: text(800),
  })
  // A question with two identical options is unanswerable but structurally
  // valid, so the type system can't catch it. Models produce these regularly
  // on short source material.
  .refine((item) => new Set(item.options.map((o) => o.trim().toLowerCase())).size === 4, {
    message: 'options must be four distinct strings',
    path: ['options'],
  });
export type QuizItem = z.infer<typeof quizItemSchema>;

export const flashcardSetSchema = z.object({ items: z.array(flashcardSchema).min(1) });
export const quizSetSchema = z.object({ items: z.array(quizItemSchema).min(1) });

export function setSchemaFor(type: StudySetType) {
  return type === 'flashcards' ? flashcardSetSchema : quizSetSchema;
}

/**
 * The same contract in the shape Gemini's `responseSchema` wants.
 *
 * This duplicates the Zod schemas above, which is deliberate: they live in one
 * file so that any drift between what we ask for and what we accept shows up in
 * a single diff. Schema enforcement at the API is a hint, not a guarantee —
 * Zod is still the authority on what reaches application code.
 */
export function geminiResponseSchemaFor(type: StudySetType) {
  const item =
    type === 'flashcards'
      ? {
          type: 'OBJECT',
          properties: { front: { type: 'STRING' }, back: { type: 'STRING' } },
          required: ['front', 'back'],
        }
      : {
          type: 'OBJECT',
          properties: {
            question: { type: 'STRING' },
            options: { type: 'ARRAY', items: { type: 'STRING' }, minItems: 4, maxItems: 4 },
            correctIndex: { type: 'INTEGER' },
            explanation: { type: 'STRING' },
          },
          required: ['question', 'options', 'correctIndex', 'explanation'],
        };

  return {
    type: 'OBJECT',
    properties: { items: { type: 'ARRAY', items: item } },
    required: ['items'],
  };
}
