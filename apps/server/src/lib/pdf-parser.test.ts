import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { extractTextFromPDF } from './pdf-parser.ts'

const TEST_PDF_PATH = 'C:/Users/ASUS/Downloads/张永康-北京大学-本科-人工智能方向.pdf'

describe('extractTextFromPDF', () => {
  it('从指定 PDF 提取文本', async () => {
    if (!existsSync(TEST_PDF_PATH)) {
      console.log(`本地测试 PDF 不存在 (${TEST_PDF_PATH})，跳过`)
      return
    }
    const buffer = readFileSync(TEST_PDF_PATH)
    const pages = await extractTextFromPDF(new Uint8Array(buffer))

    expect(pages.length).toBeGreaterThan(0)
    console.log('共提取', pages.length, '页')

    for (const page of pages) {
      expect(page.pageNumber).toBeGreaterThan(0)
      expect(typeof page.text).toBe('string')
      console.log(`--- 第 ${page.pageNumber} 页 ---`)
      console.log(page.text.slice(0, 500))
    }
  })
})
