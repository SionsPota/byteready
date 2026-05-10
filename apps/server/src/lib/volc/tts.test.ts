import { afterEach, describe, expect, it, vi } from 'vitest'
import { synthesize } from './tts.ts'

const makeNdjsonResponse = (events: Array<Record<string, unknown>>): Response => {
  const ndjson = events.map((e) => JSON.stringify(e)).join('\n')
  return new Response(ndjson, {
    status: 200,
    headers: { 'Content-Type': 'application/x-ndjson' },
  })
}

describe('synthesize', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('NDJSON 流：拼接所有 base64 audio chunk', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      makeNdjsonResponse([
        { code: 0, message: '', data: Buffer.from('AAAA').toString('base64') },
        { code: 0, message: '', data: Buffer.from('BBBB').toString('base64') },
        { code: 20000000, message: 'OK', data: null },
      ]),
    )
    const r = await synthesize('hello')
    expect(r.audio.toString('utf-8')).toBe('AAAABBBB')
    expect(r.format).toBeTruthy()
    expect(r.sampleRate).toBeGreaterThan(0)
  })

  it('上游非 2xx：抛带 status 的错误', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('forbidden', { status: 403 }),
    )
    await expect(synthesize('hi')).rejects.toThrow(/volc_tts upstream 403/)
  })

  it('NDJSON 内非零 error code：抛错', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      makeNdjsonResponse([{ code: 5000, message: 'internal' }]),
    )
    await expect(synthesize('hi')).rejects.toThrow(/code=5000/)
  })

  it('空文本立即抛错，不发起请求', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    await expect(synthesize('')).rejects.toThrow(/tts_text_empty/)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('请求附带 X-Api-Key / X-Api-Resource-Id / X-Api-Connect-Id', async () => {
    let observedHeaders: Headers | undefined
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (_url, init) => {
      observedHeaders = new Headers(init?.headers)
      return makeNdjsonResponse([
        { code: 0, data: Buffer.from('X').toString('base64') },
        { code: 20000000, data: null },
      ])
    })
    await synthesize('hi')
    expect(observedHeaders?.get('X-Api-Key')).toBeTruthy()
    expect(observedHeaders?.get('X-Api-Resource-Id')).toBeTruthy()
    expect(observedHeaders?.get('X-Api-Connect-Id')).toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/,
    )
  })

  it('请求体携带 text + speaker + audio_params', async () => {
    let observedBody: { req_params: { text: string; speaker: string; audio_params: Record<string, unknown> } } | undefined
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (_url, init) => {
      observedBody = JSON.parse(init?.body as string) as typeof observedBody
      return makeNdjsonResponse([
        { code: 0, data: Buffer.from('X').toString('base64') },
        { code: 20000000, data: null },
      ])
    })
    await synthesize('你好', { speaker: 'override-speaker', speechRate: 10 })
    expect(observedBody?.req_params.text).toBe('你好')
    expect(observedBody?.req_params.speaker).toBe('override-speaker')
    expect(observedBody?.req_params.audio_params.speech_rate).toBe(10)
  })

  it('NDJSON 跨 chunk 不丢行（行尾被截断时缓冲）', async () => {
    const eventsRaw =
      JSON.stringify({ code: 0, data: Buffer.from('A').toString('base64') }) +
      '\n' +
      JSON.stringify({ code: 0, data: Buffer.from('B').toString('base64') }) +
      '\n' +
      JSON.stringify({ code: 20000000, data: null })
    const enc = new TextEncoder()
    const bytes = enc.encode(eventsRaw)
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const mid = Math.floor(bytes.length / 2)
        controller.enqueue(bytes.slice(0, mid))
        controller.enqueue(bytes.slice(mid))
        controller.close()
      },
    })
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(stream, { status: 200 }),
    )
    const r = await synthesize('x')
    expect(r.audio.toString('utf-8')).toBe('AB')
  })
})
