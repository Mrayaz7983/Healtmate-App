  import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Robust PDF.js loader that tries multiple builds
async function loadPdfJs(): Promise<any> {
  const paths = [
    'pdfjs-dist',
    'pdfjs-dist/build/pdf.mjs',
    'pdfjs-dist/legacy/build/pdf.js',
  ];
  const errors: any[] = [];
  for (const p of paths) {
    try {
      const m: any = await import(p);
      return m?.default ?? m;
    } catch (e: any) {
      errors.push(`${p}: ${e?.message || e}`);
    }
  }
  throw new Error(`Failed to load pdfjs-dist. Tried: ${errors.join(' | ')}`);
}

// Use PDF.js in Node runtime to extract text (no external binaries)
async function extractTextFromPdf(input: Buffer | Uint8Array): Promise<string> {
  const pdfjsLib: any = await loadPdfJs();
  const getDocument = pdfjsLib?.getDocument ?? pdfjsLib?.default?.getDocument;
  if (typeof getDocument !== 'function') {
    throw new Error('PDF.js failed to load. Please reinstall pdfjs-dist.');
  }
  const data = input instanceof Buffer ? new Uint8Array(input) : input;
  const loadingTask = getDocument({ data, verbosity: 0, stopAtErrors: false, disableWorker: true });
  const pdf = await loadingTask.promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    try {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const items = (content.items as any[]).filter((it) => it.str && it.str.trim());
      const lines: Record<number, string[]> = {};
      for (const it of items) {
        const y = Math.round((it as any).transform?.[5] ?? 0);
        if (!lines[y]) lines[y] = [];
        lines[y].push((it as any).str.trim());
      }
      const sorted = Object.keys(lines)
        .map((y) => parseInt(y))
        .sort((a, b) => b - a)
        .map((y) => lines[y].join(' ').trim())
        .filter((l) => l.length > 0);
      if (sorted.length > 0) fullText += sorted.join('\n') + '\n\n';
    } catch {
      // continue
    }
  }
  return fullText.trim();
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // Prefer multipart/form-data (FormData with File)
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!file || !(file as any).arrayBuffer) {
        return NextResponse.json({ error: "Missing file in form-data under key 'file'" }, { status: 400 });
      }
      const ab = await (file as File).arrayBuffer();
      const buffer = Buffer.from(ab);
      const text = await extractTextFromPdf(buffer);
      return NextResponse.json({ text });
    }

    // Fallback: JSON with base64 data or a direct URL
    if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      const url = (body?.url || "").toString();
      const base64 = (body?.base64 || "").toString();

      if (url) {
        try {
          const res = await fetch(url);
          if (!res.ok) return NextResponse.json({ error: `Failed to fetch URL: ${res.status}` }, { status: 400 });
          const ab = await res.arrayBuffer();
          const buffer = Buffer.from(ab);
          const text = await extractTextFromPdf(buffer);
          return NextResponse.json({ text });
        } catch (e: any) {
          return NextResponse.json({ error: e?.message || "Failed to download or parse URL" }, { status: 400 });
        }
      }

      if (!base64) {
        return NextResponse.json({ error: "Missing 'url' or 'base64' in JSON body or invalid content-type" }, { status: 400 });
      }
      try {
        const buffer = Buffer.from(base64, "base64");
        const text = await extractTextFromPdf(buffer);
        return NextResponse.json({ text });
      } catch (e: any) {
        return NextResponse.json({ error: e?.message || "Failed to parse base64 PDF" }, { status: 400 });
      }
    }

    return NextResponse.json({ error: "Unsupported content-type. Use multipart/form-data with 'file' or JSON with 'base64'" }, { status: 415 });
  } catch (e: any) {
    const msg = e?.message || e?.toString?.() || "Unknown error";
    return NextResponse.json({ error: `PDF parse failed: ${msg}` }, { status: 500 });
  }
}
