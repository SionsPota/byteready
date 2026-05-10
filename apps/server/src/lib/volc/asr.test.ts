import { afterEach, describe, expect, it, vi } from 'vitest'
import { EventEmitter } from 'node:events'
import type { WebSocket } from 'ws'
import { attachAsrWS, type AsrUpstreamFactory } from './asr.ts'
import {
  packMessage,
  unpackMessage,
  MSG_AUDIO_ONLY,
  MSG_FULL_CLIENT,
  MSG_FULL_SERVER,
  FLAG_LAST,
  FLAG_NONE,
  COMPRESS_GZIP,
  SERIALIZE_JSON,
} from './binary.ts'

class FakeSocket extends EventEmitter {
  readyState = 1
  sent: Array<string | Buffer> = []
  send(data: unknown): void {
    if (typeof data === 'string') this.sent.push(data)
    else if (Buffer.isBuffer(data)) this.sent.push(data)
    else if (data instanceof ArrayBuffer) this.sent.push(Buffer.from(data))
    else this.sent.push(Buffer.from(data as ArrayBufferLike))
  }
  close(): void {
    this.readyState = 3
    this.emit('close')
  }
}

const flush = async (): Promise<void> => {
  await new Promise((r) => setImmediate(r))
}

const factoryFor = (upstream: FakeSocket): AsrUpstreamFactory =>
  () => upstream as unknown as WebSocket

const setupAndOpen = async (): Promise<{ client: FakeSocket; upstream: FakeSocket }> => {
  const client = new FakeSocket()
  const upstream = new FakeSocket()
  upstream.readyState = 0
  attachAsrWS(client as unknown as WebSocket, { upstreamFactory: factoryFor(upstream) })
  client.emit('message', Buffer.from(JSON.stringify({ type: 'config' })), false)
  await flush()
  upstream.readyState = 1
  upstream.emit('open')
  await flush()
  return { client, upstream }
}

describe('attachAsrWS', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('binary 帧在 config 之前到达：返回 upstream_not_ready 错误', async () => {
    const client = new FakeSocket()
    attachAsrWS(client as unknown as WebSocket)
    client.emit('message', Buffer.alloc(100), true)
    await flush()
    expect(client.sent.length).toBeGreaterThan(0)
    const last = JSON.parse(client.sent[client.sent.length - 1] as string) as {
      type: string
      error?: string
    }
    expect(last.type).toBe('error')
    expect(last.error).toBe('upstream_not_ready')
  })

  it('config 后向 upstream 发送 MSG_FULL_CLIENT 配置帧', async () => {
    const { upstream } = await setupAndOpen()
    expect(upstream.sent.length).toBe(1)
    const frame = unpackMessage(upstream.sent[0] as Buffer)
    expect(frame.msgType).toBe(MSG_FULL_CLIENT)
    const payload = JSON.parse(frame.payload.toString('utf-8')) as {
      user: { uid: string }
      audio: { format: string; rate: number; channel: number }
    }
    expect(payload.user.uid).toBe('demo')
    expect(payload.audio.format).toBe('pcm')
    expect(payload.audio.channel).toBe(1)
  })

  it('upstream 返回 partial 文本：转给 client 标 partial', async () => {
    const { client, upstream } = await setupAndOpen()
    const upstreamFrame = packMessage({
      msgType: MSG_FULL_SERVER,
      flags: FLAG_NONE,
      serialize: SERIALIZE_JSON,
      compress: COMPRESS_GZIP,
      payload: Buffer.from(JSON.stringify({ result: { text: '你好' } })),
    })
    upstream.emit('message', upstreamFrame)
    await flush()
    const out = client.sent.map((s) => JSON.parse(s as string)) as Array<{
      type: string
      text?: string
    }>
    const partial = out.find((m) => m.type === 'partial')
    expect(partial?.text).toBe('你好')
  })

  it('upstream 返回 utterances.definite=true：转给 client 标 final', async () => {
    const { client, upstream } = await setupAndOpen()
    const upstreamFrame = packMessage({
      msgType: MSG_FULL_SERVER,
      flags: FLAG_NONE,
      serialize: SERIALIZE_JSON,
      compress: COMPRESS_GZIP,
      payload: Buffer.from(
        JSON.stringify({
          result: { text: '完成', utterances: [{ definite: true, text: '完成' }] },
        }),
      ),
    })
    upstream.emit('message', upstreamFrame)
    await flush()
    const out = client.sent.map((s) => JSON.parse(s as string)) as Array<{
      type: string
      text?: string
    }>
    expect(out.find((m) => m.type === 'final')?.text).toBe('完成')
  })

  it('binary 音频帧 → 转换为 MSG_AUDIO_ONLY 帧，flags=NONE', async () => {
    const { client, upstream } = await setupAndOpen()
    upstream.sent = []
    const audio = Buffer.from([1, 2, 3, 4, 5, 6])
    client.emit('message', audio, true)
    await flush()
    expect(upstream.sent.length).toBe(1)
    const frame = unpackMessage(upstream.sent[0] as Buffer)
    expect(frame.msgType).toBe(MSG_AUDIO_ONLY)
    expect(frame.flags).toBe(FLAG_NONE)
    expect(frame.payload.equals(audio)).toBe(true)
  })

  it('text frame {type:"end"} → 上游空 audio + FLAG_LAST', async () => {
    const { client, upstream } = await setupAndOpen()
    upstream.sent = []
    client.emit('message', Buffer.from(JSON.stringify({ type: 'end' })), false)
    await flush()
    expect(upstream.sent.length).toBe(1)
    const frame = unpackMessage(upstream.sent[0] as Buffer)
    expect(frame.msgType).toBe(MSG_AUDIO_ONLY)
    expect(frame.flags).toBe(FLAG_LAST)
    expect(frame.payload.length).toBe(0)
  })
})
