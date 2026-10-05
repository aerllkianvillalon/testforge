import { describe, expect, it } from 'vitest';
import { clampSource, extractTextFromFile, normalizeText } from './extract-text';
import { MAX_FILE_BYTES, MAX_SOURCE_CHARS, fileTooLargeMessage } from './limits';

describe('normalizeText', () => {
  it('unifies line endings and collapses stray spacing and blank-line runs', () => {
    expect(normalizeText('a \t b\r\n\r\n\r\n\r\nc\r')).toBe('a b\n\nc');
  });
});

describe('clampSource', () => {
  it('passes short text through, normalized', () => {
    expect(clampSource('  hi  there \n')).toEqual({ text: 'hi there', truncated: false });
  });

  it('caps long text and says so', () => {
    const { text, truncated } = clampSource('x'.repeat(MAX_SOURCE_CHARS + 50));
    expect(text).toHaveLength(MAX_SOURCE_CHARS);
    expect(truncated).toBe(true);
  });

  it('does not call text of exactly the limit truncated', () => {
    expect(clampSource('x'.repeat(MAX_SOURCE_CHARS)).truncated).toBe(false);
  });
});

describe('extractTextFromFile', () => {
  const txt = (body: string, name = 'notes.txt', type = 'text/plain') => new File([body], name, { type });

  it('reads a plain-text file and applies the same cap as pasted text', async () => {
    const result = await extractTextFromFile(txt('x'.repeat(MAX_SOURCE_CHARS + 1)));
    expect(result).toMatchObject({ ok: true, truncated: true });
    expect(result.ok && result.text).toHaveLength(MAX_SOURCE_CHARS);
  });

  it('accepts a .txt that arrives with no content type', async () => {
    expect(await extractTextFromFile(txt('hello', 'notes.txt', ''))).toMatchObject({ ok: true, text: 'hello' });
  });

  it('rejects an empty file', async () => {
    expect(await extractTextFromFile(txt(''))).toEqual({ ok: false, message: 'That file is empty.' });
  });

  it('rejects a file with only whitespace in it', async () => {
    expect(await extractTextFromFile(txt(' \n\t '))).toEqual({
      ok: false,
      message: 'That file had no readable text in it.',
    });
  });

  it('rejects other file types', async () => {
    const result = await extractTextFromFile(txt('x', 'photo.png', 'image/png'));
    expect(result).toEqual({ ok: false, message: 'Only .pdf and .txt files are supported.' });
  });

  it('rejects oversized files with the shared message', async () => {
    const big = new File([new Uint8Array(MAX_FILE_BYTES + 1)], 'big.txt', { type: 'text/plain' });
    expect(await extractTextFromFile(big)).toEqual({ ok: false, message: fileTooLargeMessage(big.size) });
  });
});

describe('fileTooLargeMessage', () => {
  it('reports the size to one decimal and the limit', () => {
    expect(fileTooLargeMessage(6.25 * 1024 * 1024)).toBe('That file is 6.3MB. The limit is 5MB.');
  });
});
