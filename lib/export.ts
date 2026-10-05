import type { Flashcard, QuizItem, StudySetType } from '@/lib/ai/schemas';

/**
 * Export a set so it can leave the app.
 *  - Flashcards → tab-separated text, which Anki's File > Import reads directly
 *    (one note per line, first column front, second column back).
 *  - Quizzes → CSV that opens in Excel, Sheets or Numbers.
 */

/** Anki splits fields on tabs and notes on newlines, so neither may survive inside a field. */
function ankiField(value: string): string {
  return value.replace(/[\t\r\n]+/g, ' ').trim();
}

export function flashcardsToAnki(items: Flashcard[]): string {
  return items.map((item) => `${ankiField(item.front)}\t${ankiField(item.back)}`).join('\n') + '\n';
}

/**
 * Spreadsheets run cells that begin with = + - @ as formulas. The text here
 * comes from a language model summarising arbitrary notes, so it is untrusted:
 * a leading apostrophe keeps it as plain text.
 */
function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function quizToCsv(items: QuizItem[]): string {
  const header = ['Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct answer', 'Explanation'];
  const rows = items.map((item) => [
    item.question,
    ...item.options,
    String.fromCharCode(65 + item.correctIndex),
    item.explanation,
  ]);
  // The BOM makes Excel read the file as UTF-8 instead of guessing.
  return '\uFEFF' + [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export function exportFileName(type: StudySetType, title?: string | null, now: Date = new Date()): string {
  const slug = (title ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // drop the accents NFKD split off
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  const date = now.toISOString().slice(0, 10);
  const base = slug || `testforge-${type}-${date}`;
  return `${base}.${type === 'flashcards' ? 'txt' : 'csv'}`;
}

export type ExportableSet =
  | { type: 'flashcards'; items: Flashcard[] }
  | { type: 'quiz'; items: QuizItem[] };

export function buildExport(set: ExportableSet, title?: string | null): { fileName: string; mime: string; content: string } {
  return set.type === 'flashcards'
    ? { fileName: exportFileName('flashcards', title), mime: 'text/plain;charset=utf-8', content: flashcardsToAnki(set.items) }
    : { fileName: exportFileName('quiz', title), mime: 'text/csv;charset=utf-8', content: quizToCsv(set.items) };
}

/** Browser only: hands the file to the download manager. */
export function downloadSet(set: ExportableSet, title?: string | null): void {
  const { fileName, mime, content } = buildExport(set, title);
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
