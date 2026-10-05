import 'server-only';

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_SOURCE_CHARS = 8_000;

export type ExtractionResult =
  | { ok: true; text: string; truncated: boolean }
  | { ok: false; message: string };

const ACCEPTED = new Set(['application/pdf', 'text/plain', '']);

/**
 * Turns an uploaded file into plain text.
 *
 * Every limit here is enforced on the server. The client enforces the same
 * ones for a faster error message, but that copy is a convenience — this one
 * is the actual boundary.
 */
export async function extractTextFromFile(file: File): Promise<ExtractionResult> {
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, message: `That file is ${formatMb(file.size)}. The limit is 5MB.` };
  }
  if (file.size === 0) {
    return { ok: false, message: 'That file is empty.' };
  }

  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const isTxt = file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt');

  if (!isPdf && !isTxt && !ACCEPTED.has(file.type)) {
    return { ok: false, message: 'Only .pdf and .txt files are supported.' };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (isPdf) {
    try {
      // Import the implementation directly: pdf-parse's index.js runs a debug
      // block that reads a sample file from disk when require.main is unset,
      // which throws under Next's server runtime.
      const { default: pdfParse } = await import('pdf-parse/lib/pdf-parse.js');
      const parsed = await pdfParse(buffer);
      return finalize(parsed.text, 'That PDF has no selectable text. If it is a scan, paste the text instead.');
    } catch (err) {
      console.error('pdf-parse failed:', err);
      return { ok: false, message: "We couldn't read that PDF. Try a different file, or paste the text." };
    }
  }

  return finalize(buffer.toString('utf8'), 'That file had no readable text in it.');
}

export function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    // Collapse the runs of blank lines and stray spacing that PDF extraction
    // produces; they waste input tokens without carrying meaning.
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function finalize(raw: string, emptyMessage: string): ExtractionResult {
  const text = normalizeText(raw);
  if (!text) return { ok: false, message: emptyMessage };

  const truncated = text.length > MAX_SOURCE_CHARS;
  return { ok: true, text: truncated ? text.slice(0, MAX_SOURCE_CHARS) : text, truncated };
}

function formatMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
