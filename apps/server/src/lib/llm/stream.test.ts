import { describe, expect, it } from 'vitest'
import type OpenAI from 'openai'
import { createKimiStreamer, type RawStreamChunk } from './stream.ts'

describe('createKimiStreamer', () => {
  it('翻译 OpenAI 流到 reasoning/delta/done 事件', async () => {
    const fakeStream = (async function* () {
      yield { choices: [{ delta: { reasoning_content: 'thinking ' } }] }
      yield { choices: [{ delta: { content: 'hello ' } }] }
      yield { choices: [{ delta: { content: 'world' } }] }
      yield { choices: [{ delta: {}, finish_reason: 'stop' }] }
    })()
    const fakeClient = {
      chat: {
        completions: {
          create: async () => fakeStream,
        },
      },
    } as unknown as OpenAI

    const streamer = createKimiStreamer(fakeClient)
    const out: RawStreamChunk[] = []
    for await (const c of streamer.stream({ messages: [], model: 'm' })) {
      out.push(c)
    }
    expect(out).toEqual([
      { reasoning: 'thinking ' },
      { delta: 'hello ' },
      { delta: 'world' },
      { done: true },
    ])
  })

  it('把 AbortSignal 透传给 OpenAI client', async () => {
    let observedSignal: AbortSignal | undefined
    const emptyStream = (async function* () {})()
    const fakeClient = {
      chat: {
        completions: {
          create: async (_body: unknown, options?: { signal?: AbortSignal }) => {
            observedSignal = options?.signal
            return emptyStream
          },
        },
      },
    } as unknown as OpenAI
    const streamer = createKimiStreamer(fakeClient)
    const ctrl = new AbortController()
    const iter = streamer
      .stream({ messages: [], model: 'm', signal: ctrl.signal })
      [Symbol.asyncIterator]()
    await iter.next()
    expect(observedSignal).toBe(ctrl.signal)
  })

  it('在 finish_reason 出现时 break，不再消费后续 chunk', async () => {
    let consumedAfterFinish = false
    const fakeStream = (async function* () {
      yield { choices: [{ delta: { content: 'a' }, finish_reason: 'stop' }] }
      consumedAfterFinish = true
      yield { choices: [{ delta: { content: 'b' } }] }
    })()
    const fakeClient = {
      chat: { completions: { create: async () => fakeStream } },
    } as unknown as OpenAI
    const streamer = createKimiStreamer(fakeClient)
    const out: RawStreamChunk[] = []
    for await (const c of streamer.stream({ messages: [], model: 'm' })) {
      out.push(c)
    }
    expect(out).toEqual([{ delta: 'a' }, { done: true }])
    expect(consumedAfterFinish).toBe(false)
  })
})
