import { afterEach, describe, expect, it, vi } from 'vitest'
import { rerankDocs } from './rerank.ts'

describe('rerankDocs', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('返回带 index/score/text 的 top_n 结果', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'r1',
          results: [
            { index: 2, relevance_score: 0.95 },
            { index: 0, relevance_score: 0.7 },
          ],
        }),
        { status: 200 },
      ),
    )
    const r = await rerankDocs('查询', ['doc-a', 'doc-b', 'doc-c'])
    expect(r.results).toEqual([
      { index: 2, score: 0.95, text: 'doc-c' },
      { index: 0, score: 0.7, text: 'doc-a' },
    ])
    expect(r.model).toBeTruthy()
  })

  it('空 docs 直接抛错', async () => {
    await expect(rerankDocs('q', [])).rejects.toThrow(/rerank_docs_empty/)
  })

  it('默认 top_n = min(docs.length, 5)', async () => {
    let observedBody: Record<string, unknown> | undefined
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (_url, init) => {
      observedBody = JSON.parse(init?.body as string) as Record<string, unknown>
      return new Response(JSON.stringify({ id: 'x', results: [] }), { status: 200 })
    })
    await rerankDocs('q', ['a', 'b', 'c'])
    expect(observedBody?.top_n).toBe(3)
  })

  it('top_n 上限为 docs.length 与 5 的较小值', async () => {
    let observedBody: Record<string, unknown> | undefined
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (_url, init) => {
      observedBody = JSON.parse(init?.body as string) as Record<string, unknown>
      return new Response(JSON.stringify({ id: 'x', results: [] }), { status: 200 })
    })
    await rerankDocs('q', new Array(10).fill('doc'))
    expect(observedBody?.top_n).toBe(5)
  })

  it('显式 topN 覆盖默认', async () => {
    let observedBody: Record<string, unknown> | undefined
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (_url, init) => {
      observedBody = JSON.parse(init?.body as string) as Record<string, unknown>
      return new Response(JSON.stringify({ id: 'x', results: [] }), { status: 200 })
    })
    await rerankDocs('q', ['a', 'b', 'c'], { topN: 1 })
    expect(observedBody?.top_n).toBe(1)
  })
})
