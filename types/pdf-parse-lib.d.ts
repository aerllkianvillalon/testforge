/**
 * @types/pdf-parse only declares the package root. We import the lib file
 * directly (see lib/extract-text.ts for why), so it needs its own declaration.
 */
declare module 'pdf-parse/lib/pdf-parse.js' {
  interface PdfParseResult {
    text: string;
    numpages: number;
    info: Record<string, unknown>;
  }
  function pdfParse(data: Buffer | Uint8Array): Promise<PdfParseResult>;
  export default pdfParse;
}
