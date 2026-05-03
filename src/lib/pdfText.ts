import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore – Vite ?url import for the worker bundle
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerUrl;

/** Extract concatenated plain text from every page of a PDF File. */
export async function extractPdfText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const pdf = await (pdfjsLib as any).getDocument({ data: buf }).promise;
  const out: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    out.push(content.items.map((it: any) => it.str).join(" "));
  }
  return out.join("\n\n");
}
