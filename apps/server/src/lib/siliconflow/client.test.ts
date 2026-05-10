import { afterEach, describe, expect, it, vi } from 'vitest'
import { siliconflowFetch } from './client.ts'

describe('siliconflowFetch', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('成功响应：返回 JSON body', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, value: 42 }), { status: 200 }),
    )
    const r = await siliconflowFetch<{ ok: boolean; value: number }>('/x', {})
    expect(r.ok).toBe(true)
    expect(r.value).toBe(42)
  })

  it('附带 Authorization Bearer 与 Content-Type', async () => {
    let observedHeaders: Headers | undefined
    let observedUrl: string | undefined
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (url, init) => {
      observedUrl = String(url)
      observedHeaders = new Headers(init?.headers)
      return new Response('{}', { status: 200 })
    })
    await siliconflowFetch('/embeddings', { foo: 'bar' })
    expect(observedUrl).toMatch(/\/embeddings$/)
    expect(observedHeaders?.get('Authorization')).toMatch(/^Bearer /)
    expect(observedHeaders?.get('Content-Type')).toBe('application/json')
  })

  it('非 2xx 响应：抛带 status 与 path 的错误', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('rate limited', { status: 429 }),
    )
    await expect(siliconflowFetch('/x', {})).rejects.toThrow(/siliconflow \/x 429/)
  })

  it('body 序列化为 JSON', async () => {
    let observedBody: string | undefined
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (_url, init) => {
      observedBody = init?.body as string
      return new Response('{}', { status: 200 })
    })
    await siliconflowFetch('/x', { hello: 'world', n: 1 })
    expect(observedBody).toBe(JSON.stringify({ hello: 'world', n: 1 }))
  })
})
