import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

export interface PDFPage {
  pageNumber: number
  text: string
}

export async function extractTextFromPDF(buffer: Uint8Array): Promise<PDFPage[]> {
  const pdf = await getDocument({ data: buffer }).promise
  const results: PDFPage[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const text = content.items
      .map((item) => (item as Record<string, unknown>).str as string)
      .join(' ')
      .trim()
    results.push({ pageNumber: i, text })
  }

  return results
}
