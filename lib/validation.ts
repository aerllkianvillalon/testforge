import { z } from 'zod';
import { flashcardSchema, quizItemSchema } from '@/lib/ai/schemas';

export const MIN_ITEMS = 3;
export const MAX_ITEMS = 20;

export const generateRequestSchema = z.object({
  type: z.enum(['flashcards', 'quiz']),
  itemCount: z.coerce.number().int().min(MIN_ITEMS).max(MAX_ITEMS),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  text: z.string().optional(),
});

/**
 * The save payload is re-validated against the same item schemas used on
 * generation. The client is not trusted to send back what we handed it —
 * a saved set has to satisfy the contract independently, or the dashboard
 * becomes a way to store arbitrary JSON under someone's user id.
 */
export const saveSetSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('flashcards'),
    title: z.string().trim().max(120).optional(),
    sourceExcerpt: z.string().max(300),
    modelVersion: z.string().max(60),
    items: z.array(flashcardSchema).min(1).max(MAX_ITEMS),
  }),
  z.object({
    type: z.literal('quiz'),
    title: z.string().trim().max(120).optional(),
    sourceExcerpt: z.string().max(300),
    modelVersion: z.string().max(60),
    items: z.array(quizItemSchema).min(1).max(MAX_ITEMS),
  }),
]);

export type SaveSetPayload = z.infer<typeof saveSetSchema>;
