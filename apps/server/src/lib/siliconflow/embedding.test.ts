import { afterEach, describe, expect, it, vi } from 'vitest'
import { embedTexts } from './embedding.ts'

describe('embedTexts', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('返回 vectors / dim / model / usage', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          object: 'list',
          data: [
            { object: 'embedding', embedding: [0.1, 0.2, 0.3], index: 0 },
            { object: 'embedding', embedding: [0.4, 0.5, 0.6], index: 1 },
          ],
          model: 'BAAI/bge-large-zh-v1.5',
          usage: { total_tokens: 10, prompt_tokens: 10 },
        }),
        { status: 200 },
      ),
    )
    const r = await embedTexts(['a', 'b'])
    expect(r.vectors).toEqual([
      [0.1, 0.2, 0.3],
      [0.4, 0.5, 0.6],
    ])
    expect(r.dim).toBe(3)
    expect(r.model).toBe('BAAI/bge-large-zh-v1.5')
    expect(r.usage.total_tokens).toBe(10)
  })

  it('空数组直接抛错', async () => {
    await expect(embedTexts([])).rejects.toThrow(/embed_texts_empty/)
  })

  it('请求体含 model 与 input', async () => {
    let observedBody: Record<string, unknown> | undefined
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (_url, init) => {
      observedBody = JSON.parse(init?.body as string) as Record<string, unknown>
      return new Response(
        JSON.stringify({
          object: 'list',
          data: [{ object: 'embedding', embedding: [0], index: 0 }],
          model: 'm',
          usage: { total_tokens: 1 },
        }),
        { status: 200 },
      )
    })
    await embedTexts(['x'], { model: 'override-m' })
    expect(observedBody?.model).toBe('override-m')
    expect(observedBody?.input).toEqual(['x'])
  })
})
