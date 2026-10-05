/**
 * Input limits, in one place and importable from both sides.
 *
 * The server enforces them (lib/extract-text.ts, app/api/generate) and the
 * browser mirrors them for a faster error message. This file has no
 * `server-only` import precisely so the client can share the numbers instead
 * of keeping its own copy that could drift.
 */
export const MAX_SOURCE_CHARS = 8_000;
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

const BYTES_PER_MB = 1024 * 1024;
export const MAX_FILE_MB = MAX_FILE_BYTES / BYTES_PER_MB;

export function fileTooLargeMessage(bytes: number): string {
  return `That file is ${(bytes / BYTES_PER_MB).toFixed(1)}MB. The limit is ${MAX_FILE_MB}MB.`;
}
