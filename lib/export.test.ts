import { describe, expect, it } from 'vitest';
import { exportFileName, flashcardsToAnki, quizToCsv } from '@/lib/export';

describe('flashcardsToAnki', () => {
  it('writes one tab-separated note per line', () => {
    expect(flashcardsToAnki([{ front: 'Q1', back: 'A1' }, { front: 'Q2', back: 'A2' }])).toBe('Q1\tA1\nQ2\tA2\n');
  });

  it('removes tabs and newlines that would split a field or a note', () => {
    expect(flashcardsToAnki([{ front: 'a\tb', back: 'line1\nline2\r\nline3' }])).toBe('a b\tline1 line2 line3\n');
  });
});

describe('quizToCsv', () => {
  const item = {
    question: 'Which, if any, is right?',
    options: ['One', 'Two "quoted"', 'Three', 'Four'],
    correctIndex: 1,
    explanation: 'Because.',
  };

  it('starts with a BOM and a header, and letters the correct answer', () => {
    const lines = quizToCsv([item]).replace('\uFEFF', '').split('\r\n');
    expect(quizToCsv([item]).startsWith('\uFEFF')).toBe(true);
    expect(lines[0]).toBe('Question,Option A,Option B,Option C,Option D,Correct answer,Explanation');
    expect(lines[1]).toBe('"Which, if any, is right?",One,"Two ""quoted""",Three,Four,B,Because.');
  });

  it('neutralises spreadsheet formulas', () => {
    const csv = quizToCsv([{ ...item, question: '=HYPERLINK("http://evil")', explanation: '-2+3' }]);
    expect(csv).toContain(`"'=HYPERLINK(""http://evil"")"`);
    expect(csv).toContain(`'-2+3`);
  });
});

describe('exportFileName', () => {
  const now = new Date('2026-09-21T10:00:00Z');

  it('slugs a title and picks the extension by type', () => {
    expect(exportFileName('flashcards', 'Cell Biology: Week 3!', now)).toBe('cell-biology-week-3.txt');
    expect(exportFileName('quiz', 'Café Économie', now)).toBe('cafe-economie.csv');
  });

  it('falls back to a dated name', () => {
    expect(exportFileName('quiz', '', now)).toBe('testforge-quiz-2026-09-21.csv');
    expect(exportFileName('flashcards', '!!!', now)).toBe('testforge-flashcards-2026-09-21.txt');
  });
});
