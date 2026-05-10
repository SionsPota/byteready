import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { extractTextFromPDF } from './pdf-parser.ts'
import { optimizeResumeText } from './resume-optimizer.ts'
import { env } from '../env.ts'

const TEST_PDF_PATH = 'C:/Users/ASUS/Downloads/张永康-北京大学-本科-人工智能方向.pdf'

describe('optimizeResumeText', () => {
  it('用 Kimi 清洗 PDF 提取的简历文本', async () => {
    if (process.env.BYTEREADY_LIVE_TESTS !== '1') {
      console.log('设置 BYTEREADY_LIVE_TESTS=1 跑真调，默认跳过（Kimi K2.6 推理慢，单次可能 >3min）')
      return
    }
    if (!env.KIMI_API_KEY) {
      console.log('KIMI_API_KEY not configured, skipping LLM optimization test')
      return
    }

    const buffer = readFileSync(TEST_PDF_PATH)
    const pages = await extractTextFromPDF(new Uint8Array(buffer))
    const rawText = pages.map((p) => p.text).join('\n\n')

    console.log('=== 原始文本（前 500 字）===')
    console.log(rawText.slice(0, 500))
    console.log('\n=== 正在调用 Kimi 优化... ===\n')

    let optimized: string
    try {
      optimized = await optimizeResumeText(rawText)
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      if (msg.includes('403') || msg.includes('balance') || msg.includes('insufficient')) {
        console.log('LLM API 暂不可用（基础设施未就绪），跳过断言：', msg)
        return
      }
      throw error
    }

    console.log('=== Kimi 优化后的文本 ===')
    console.log(optimized)

    expect(typeof optimized).toBe('string')
    expect(optimized.length).toBeGreaterThan(0)
    expect(optimized.includes('#')).toBe(true)
  }, 180000)
})
