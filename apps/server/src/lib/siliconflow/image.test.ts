import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateImage } from './image.ts'

describe('generateImage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('返回 url + size + model + seed', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          images: [{ url: 'https://example.test/img.png' }],
          seed: 12345,
        }),
        { status: 200 },
      ),
    )
    const r = await generateImage({ prompt: 'a cat', size: '768x768' })
    expect(r.url).toBe('https://example.test/img.png')
    expect(r.size).toBe('768x768')
    expect(r.seed).toBe(12345)
    expect(r.model).toBeTruthy()
  })

  it('默认 size 为 1024x1024，默认 steps=8', async () => {
    let observedBody: Record<string, unknown> | undefined
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (_url, init) => {
      observedBody = JSON.parse(init?.body as string) as Record<string, unknown>
      return new Response(
        JSON.stringify({ images: [{ url: 'https://x.test/i.png' }] }),
        { status: 200 },
      )
    })
    const r = await generateImage({ prompt: 'a dog' })
    expect(r.size).toBe('1024x1024')
    expect(observedBody?.image_size).toBe('1024x1024')
    expect(observedBody?.num_inference_steps).toBe(8)
    expect(observedBody?.batch_size).toBe(1)
  })

  it('上游不返回图时抛错', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ images: [] }), { status: 200 }),
    )
    await expect(generateImage({ prompt: 'x' })).rejects.toThrow(/no_image_returned/)
  })
})
