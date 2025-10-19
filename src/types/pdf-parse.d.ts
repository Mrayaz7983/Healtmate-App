declare module 'pdf-parse' {
  export interface PDFParseResult {
    text: string;
    numpages?: number;
    numrender?: number;
    info?: any;
    metadata?: any;
    version?: string;
  }

  // Minimal type for our usage; pdf-parse accepts Buffer/Uint8Array and resolves with text and some metadata
  function pdfParse(data: Buffer | Uint8Array): Promise<PDFParseResult>;
  export default pdfParse;
}
