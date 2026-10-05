import type { Flashcard, QuizItem, StudySetType } from '@/lib/ai/schemas';

export type StudySetRow = {
  id: string;
  user_id: string;
  title: string | null;
  type: StudySetType;
  source_excerpt: string;
  items: Flashcard[] | QuizItem[];
  model_version: string;
  created_at: string;
};

export type GeneratedSet =
  | { type: 'flashcards'; items: Flashcard[]; modelVersion: string; sourceExcerpt: string }
  | { type: 'quiz'; items: QuizItem[]; modelVersion: string; sourceExcerpt: string };
