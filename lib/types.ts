import type { StudySetContent } from '@/lib/ai/schemas';

/** A saved set as stored in `study_sets`. */
export type StudySetRow = {
  id: string;
  user_id: string;
  title: string | null;
  source_excerpt: string;
  model_version: string;
  created_at: string;
} & StudySetContent;

/** A freshly generated set, before it has been saved. */
export type GeneratedSet = StudySetContent & { modelVersion: string; sourceExcerpt: string };
