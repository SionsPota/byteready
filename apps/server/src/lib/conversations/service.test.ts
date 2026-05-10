import { describe, expect, it } from 'vitest'
import { openDbInMemory } from '../db/client.ts'
import { createRepository } from './repository.ts'
import { createConversationService, type ChatEvent } from './service.ts'
import type { ChatMessage, ChatStreamer, RawStreamChunk } from '../llm/stream.ts'

const makeStreamer = (
  fn: (args: { messages: ChatMessage[]; signal?: AbortSignal }) => AsyncIterable<RawStreamChunk>,
): ChatStreamer => ({
  stream: ({ messages, signal }) => fn({ messages, signal }),
})

const okStreamer = makeStreamer(async function* () {
  yield { reasoning: 'thinking ' }
  yield { reasoning: 'more ' }
  yield { delta: 'Hello' }
  yield { delta: ', world' }
  yield { done: true }
})

const failStreamer = makeStreamer(async function* () {
  yield { delta: 'Partial ' }
  yield { delta: 'response' }
  throw new Error('mid-stream-failure')
})

const setup = () => {
  const db = openDbInMemory()
  const repo = createRepository(db)
  return { db, repo }
}

describe('createConversationService', () => {
  it('happy path: 流式 reasoning + content，落库为 completed', async () => {
    const { db, repo } = setup()
    const service = createConversationService({
      repo,
      streamer: okStreamer,
      defaultModel: 'test-m',
    })
    const conv = repo.createConversation({ title: 't' })

    const events: ChatEvent[] = []
    for await (const e of service.streamChat(conv.id, 'hi')) {
      events.push(e)
    }

    const reasoning = events
      .filter((e): e is Extract<ChatEvent, { kind: 'reasoning' }> => e.kind === 'reasoning')
      .map((e) => e.text)
      .join('')
    const deltas = events
      .filter((e): e is Extract<ChatEvent, { kind: 'delta' }> => e.kind === 'delta')
      .map((e) => e.text)
      .join('')
    expect(reasoning).toBe('thinking more ')
    expect(deltas).toBe('Hello, world')

    const done = events.find((e) => e.kind === 'done')
    expect(done).toBeDefined()

    const msgs = repo.listMessages(conv.id)
    expect(msgs.length).toBe(2)
    expect(msgs[0]!.role).toBe('user')
    expect(msgs[0]!.content).toBe('hi')
    expect(msgs[0]!.status).toBe('completed')
    expect(msgs[1]!.role).toBe('assistant')
    expect(msgs[1]!.content).toBe('Hello, world')
    expect(msgs[1]!.reasoningContent).toBe('thinking more ')
    expect(msgs[1]!.status).toBe('completed')
    db.close()
  })

  it('★ 流中途抛错：assistant 标 error，保留已 yield 的部分内容', async () => {
    const { db, repo } = setup()
    const service = createConversationService({
      repo,
      streamer: failStreamer,
      defaultModel: 'test-m',
    })
    const conv = repo.createConversation({})

    const events: ChatEvent[] = []
    for await (const e of service.streamChat(conv.id, 'hi')) {
      events.push(e)
    }

    const errEvt = events.find(
      (e): e is Extract<ChatEvent, { kind: 'error' }> => e.kind === 'error',
    )
    expect(errEvt).toBeDefined()
    expect(errEvt?.error).toContain('mid-stream-failure')

    const msgs = repo.listMessages(conv.id)
    expect(msgs.length).toBe(2)
    expect(msgs[1]!.role).toBe('assistant')
    expect(msgs[1]!.status).toBe('error')
    expect(msgs[1]!.content).toBe('Partial response')
    db.close()
  })

  it('AbortError 标记为 aborted，不是 error', async () => {
    const { db, repo } = setup()
    const abortStreamer = makeStreamer(async function* () {
      yield { delta: 'A' }
      const err = new Error('aborted')
      err.name = 'AbortError'
      throw err
    })
    const service = createConversationService({
      repo,
      streamer: abortStreamer,
      defaultModel: 'm',
    })
    const conv = repo.createConversation({})

    for await (const _e of service.streamChat(conv.id, 'hi')) {
      void _e
    }

    const msgs = repo.listMessages(conv.id)
    expect(msgs[1]!.status).toBe('aborted')
    expect(msgs[1]!.content).toBe('A')
    db.close()
  })

  it('chatOnce 返回最终 persisted message', async () => {
    const { db, repo } = setup()
    const service = createConversationService({
      repo,
      streamer: okStreamer,
      defaultModel: 'test-m',
    })
    const conv = repo.createConversation({})
    const msg = await service.chatOnce(conv.id, 'hi')
    expect(msg.role).toBe('assistant')
    expect(msg.content).toBe('Hello, world')
    expect(msg.status).toBe('completed')
    db.close()
  })

  it('systemPrompt 注入到 LLM 调用消息列表头', async () => {
    const { db, repo } = setup()
    let observed: ChatMessage[] = []
    const captureStreamer = makeStreamer(async function* ({ messages }) {
      observed = messages
      yield { delta: 'ok' }
      yield { done: true }
    })
    const service = createConversationService({
      repo,
      streamer: captureStreamer,
      defaultModel: 'm',
    })
    const conv = repo.createConversation({ systemPrompt: 'be polite' })
    await service.chatOnce(conv.id, 'hi')
    expect(observed[0]).toEqual({ role: 'system', content: 'be polite' })
    expect(observed.at(-1)).toEqual({ role: 'user', content: 'hi' })
    db.close()
  })

  it('历史消息按顺序拼接到 LLM 入参', async () => {
    const { db, repo } = setup()
    let observed: ChatMessage[] = []
    const captureStreamer = makeStreamer(async function* ({ messages }) {
      observed = messages
      yield { delta: 'ok' }
      yield { done: true }
    })
    const service = createConversationService({
      repo,
      streamer: captureStreamer,
      defaultModel: 'm',
    })
    const conv = repo.createConversation({})
    await service.chatOnce(conv.id, 'first')
    await service.chatOnce(conv.id, 'second')
    expect(observed.map((m) => m.role)).toEqual(['user', 'assistant', 'user'])
    expect(observed[0]!.content).toBe('first')
    expect(observed[2]!.content).toBe('second')
    db.close()
  })

  it('opts.model 优先于 conv.model 优先于 defaultModel', async () => {
    const { db, repo } = setup()
    let observedModel = ''
    const captureStreamer: ChatStreamer = {
      stream: async function* (args) {
        observedModel = args.model
        yield { done: true }
      },
    }
    const service = createConversationService({
      repo,
      streamer: captureStreamer,
      defaultModel: 'default-m',
    })
    const c1 = repo.createConversation({})
    await service.chatOnce(c1.id, 'a')
    expect(observedModel).toBe('default-m')

    const c2 = repo.createConversation({ model: 'conv-m' })
    await service.chatOnce(c2.id, 'a')
    expect(observedModel).toBe('conv-m')

    await service.chatOnce(c2.id, 'a', { model: 'opts-m' })
    expect(observedModel).toBe('opts-m')
    db.close()
  })

  it('找不到 conversation 时立即抛错', async () => {
    const { db, repo } = setup()
    const service = createConversationService({
      repo,
      streamer: okStreamer,
      defaultModel: 'm',
    })
    await expect(async () => {
      for await (const _e of service.streamChat('nonexistent', 'hi')) {
        void _e
      }
    }).rejects.toThrow(/conversation_not_found/)
    db.close()
  })

  it('没有任何 model 配置时抛错并把 assistant 标记为 error', async () => {
    const { db, repo } = setup()
    const service = createConversationService({ repo, streamer: okStreamer })
    const conv = repo.createConversation({})
    await expect(async () => {
      for await (const _e of service.streamChat(conv.id, 'hi')) {
        void _e
      }
    }).rejects.toThrow(/no_model_configured/)
    const msgs = repo.listMessages(conv.id)
    expect(msgs[1]!.status).toBe('error')
    db.close()
  })
})
