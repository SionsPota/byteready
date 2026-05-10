import { describe, expect, it } from 'vitest'
import {
  packMessage,
  unpackMessage,
  COMPRESS_GZIP,
  COMPRESS_NONE,
  FLAG_LAST,
  FLAG_LAST_SEQ,
  FLAG_NONE,
  FLAG_SEQ,
  MSG_AUDIO_ONLY,
  MSG_ERROR,
  MSG_FULL_CLIENT,
  MSG_FULL_SERVER,
  SERIALIZE_JSON,
  SERIALIZE_NONE,
} from './binary.ts'

describe('packMessage / unpackMessage', () => {
  it('roundtrip: MSG_FULL_CLIENT + FLAG_SEQ + JSON + gzip', () => {
    const json = JSON.stringify({ user: { uid: 'demo' }, audio: { rate: 16000 } })
    const buf = packMessage({
      msgType: MSG_FULL_CLIENT,
      flags: FLAG_SEQ,
      serialize: SERIALIZE_JSON,
      compress: COMPRESS_GZIP,
      sequence: 1,
      payload: Buffer.from(json, 'utf-8'),
    })
    const parsed = unpackMessage(buf)
    expect(parsed.msgType).toBe(MSG_FULL_CLIENT)
    expect(parsed.flags).toBe(FLAG_SEQ)
    expect(parsed.serialize).toBe(SERIALIZE_JSON)
    expect(parsed.compress).toBe(COMPRESS_GZIP)
    expect(parsed.sequence).toBe(1)
    expect(parsed.payload.toString('utf-8')).toBe(json)
  })

  it('roundtrip: MSG_AUDIO_ONLY + FLAG_LAST + raw + gzip', () => {
    const audio = Buffer.alloc(4096)
    for (let i = 0; i < audio.length; i++) audio[i] = i & 0xff
    const buf = packMessage({
      msgType: MSG_AUDIO_ONLY,
      flags: FLAG_LAST,
      serialize: SERIALIZE_NONE,
      compress: COMPRESS_GZIP,
      payload: audio,
    })
    const parsed = unpackMessage(buf)
    expect(parsed.msgType).toBe(MSG_AUDIO_ONLY)
    expect(parsed.flags).toBe(FLAG_LAST)
    expect(parsed.serialize).toBe(SERIALIZE_NONE)
    expect(parsed.payload.equals(audio)).toBe(true)
  })

  it('roundtrip: 不压缩也能跑通', () => {
    const data = Buffer.from('hello world', 'utf-8')
    const buf = packMessage({
      msgType: MSG_FULL_SERVER,
      flags: FLAG_NONE,
      serialize: SERIALIZE_JSON,
      compress: COMPRESS_NONE,
      payload: data,
    })
    const parsed = unpackMessage(buf)
    expect(parsed.compress).toBe(COMPRESS_NONE)
    expect(parsed.payload.equals(data)).toBe(true)
  })

  it('roundtrip: FLAG_LAST_SEQ 也带 sequence', () => {
    const buf = packMessage({
      msgType: MSG_FULL_CLIENT,
      flags: FLAG_LAST_SEQ,
      sequence: 42,
      payload: Buffer.from('{}'),
    })
    const parsed = unpackMessage(buf)
    expect(parsed.flags).toBe(FLAG_LAST_SEQ)
    expect(parsed.sequence).toBe(42)
  })

  it('解析 MSG_ERROR 错误帧：携带 code 与 message', () => {
    const code = 4001
    const message = 'invalid_param'
    const messageBuf = Buffer.from(message, 'utf-8')
    const header = Buffer.alloc(4)
    header[0] = (0b0001 << 4) | 0b0001
    header[1] = (MSG_ERROR << 4) | FLAG_NONE
    header[2] = (SERIALIZE_NONE << 4) | COMPRESS_NONE
    header[3] = 0
    const codeBuf = Buffer.alloc(4)
    codeBuf.writeUInt32BE(code, 0)
    const sizeBuf = Buffer.alloc(4)
    sizeBuf.writeUInt32BE(messageBuf.length, 0)
    const buf = Buffer.concat([header, codeBuf, sizeBuf, messageBuf])

    const parsed = unpackMessage(buf)
    expect(parsed.msgType).toBe(MSG_ERROR)
    expect(parsed.error?.code).toBe(code)
    expect(parsed.error?.message).toBe(message)
  })

  it('FLAG_SEQ 缺 sequence 时抛错', () => {
    expect(() =>
      packMessage({
        msgType: MSG_FULL_CLIENT,
        flags: FLAG_SEQ,
        payload: Buffer.from('x'),
      }),
    ).toThrow(/sequence required/)
  })

  it('帧长度不足 4 字节时抛错', () => {
    expect(() => unpackMessage(Buffer.from([0x11]))).toThrow(/frame_too_short/)
  })

  it('payload 被截断时抛错', () => {
    const fullBuf = packMessage({
      msgType: MSG_FULL_CLIENT,
      flags: FLAG_NONE,
      compress: COMPRESS_NONE,
      payload: Buffer.from('hello'),
    })
    const truncated = fullBuf.subarray(0, fullBuf.length - 2)
    expect(() => unpackMessage(truncated)).toThrow(/payload_truncated/)
  })
})
