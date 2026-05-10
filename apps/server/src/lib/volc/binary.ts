/**
 * 火山引擎 ASR / TTS 双向流式 WebSocket 二进制协议
 *
 * 帧格式（headerSize=1 即 4 字节 header）：
 *
 *   byte0:  proto_ver(4) | header_size(4)         // 0b0001_0001 = 0x11
 *   byte1:  msg_type(4)  | flags(4)
 *   byte2:  serialize(4) | compress(4)
 *   byte3:  reserved (0)
 *
 *   if flags == FLAG_SEQ (0b0001) or FLAG_LAST_SEQ (0b0011):
 *     uint32_be sequence
 *
 *   uint32_be payload_size
 *   bytes payload
 *
 * 错误响应额外格式：header(4) + error_code(4) + error_size(4) + error_msg(N)
 */
import { gzipSync, gunzipSync } from 'node:zlib'

export const PROTOCOL_VERSION = 0b0001
export const HEADER_SIZE = 0b0001

export const MSG_FULL_CLIENT = 0b0001
export const MSG_AUDIO_ONLY = 0b0010
export const MSG_FULL_SERVER = 0b1001
export const MSG_SERVER_AUDIO = 0b1011
export const MSG_ERROR = 0b1111

export const FLAG_NONE = 0b0000
export const FLAG_SEQ = 0b0001
export const FLAG_LAST = 0b0010
export const FLAG_LAST_SEQ = 0b0011

export const SERIALIZE_NONE = 0b0000
export const SERIALIZE_JSON = 0b0001

export const COMPRESS_NONE = 0b0000
export const COMPRESS_GZIP = 0b0001

export interface PackOptions {
  msgType: number
  flags: number
  serialize?: number
  compress?: number
  /** 仅当 flags 含 FLAG_SEQ/FLAG_LAST_SEQ 时使用 */
  sequence?: number
  /** 原始 payload；若 compress=COMPRESS_GZIP 函数会自动压缩 */
  payload: Buffer
}

export const packMessage = (opts: PackOptions): Buffer => {
  const {
    msgType,
    flags,
    serialize = SERIALIZE_JSON,
    compress = COMPRESS_GZIP,
    sequence,
    payload,
  } = opts

  const compressed = compress === COMPRESS_GZIP ? gzipSync(payload) : payload

  const header = Buffer.alloc(4)
  header[0] = (PROTOCOL_VERSION << 4) | HEADER_SIZE
  header[1] = (msgType << 4) | (flags & 0x0f)
  header[2] = (serialize << 4) | (compress & 0x0f)
  header[3] = 0x00

  const needSeq = flags === FLAG_SEQ || flags === FLAG_LAST_SEQ
  const seqBuf = needSeq ? Buffer.alloc(4) : Buffer.alloc(0)
  if (needSeq) {
    if (sequence == null) throw new Error('sequence required for FLAG_SEQ/FLAG_LAST_SEQ')
    seqBuf.writeUInt32BE(sequence >>> 0, 0)
  }

  const sizeBuf = Buffer.alloc(4)
  sizeBuf.writeUInt32BE(compressed.length >>> 0, 0)

  return Buffer.concat([header, seqBuf, sizeBuf, compressed])
}

export interface ParsedFrame {
  msgType: number
  flags: number
  serialize: number
  compress: number
  sequence?: number
  /** 已 gzip 解压的原始 payload */
  payload: Buffer
  /** 错误帧专用 */
  error?: { code: number; message: string }
}

export const unpackMessage = (buf: Buffer): ParsedFrame => {
  if (buf.length < 4) throw new Error('frame_too_short')

  const byte0 = buf[0]
  const byte1 = buf[1]
  const byte2 = buf[2]
  if (byte0 === undefined || byte1 === undefined || byte2 === undefined) {
    throw new Error('frame_too_short')
  }

  const headerSize = byte0 & 0x0f
  const headerBytes = headerSize * 4
  const msgType = (byte1 >> 4) & 0x0f
  const flags = byte1 & 0x0f
  const serialize = (byte2 >> 4) & 0x0f
  const compress = byte2 & 0x0f

  let offset = headerBytes

  if (msgType === MSG_ERROR) {
    if (buf.length < offset + 8) throw new Error('error_frame_too_short')
    const code = buf.readUInt32BE(offset)
    const size = buf.readUInt32BE(offset + 4)
    const message = buf.subarray(offset + 8, offset + 8 + size).toString('utf-8')
    return {
      msgType,
      flags,
      serialize,
      compress,
      payload: Buffer.alloc(0),
      error: { code, message },
    }
  }

  let sequence: number | undefined
  if (flags === FLAG_SEQ || flags === FLAG_LAST_SEQ) {
    if (buf.length < offset + 4) throw new Error('seq_missing')
    sequence = buf.readUInt32BE(offset)
    offset += 4
  }

  if (buf.length < offset + 4) throw new Error('size_missing')
  const payloadSize = buf.readUInt32BE(offset)
  offset += 4
  if (buf.length < offset + payloadSize) throw new Error('payload_truncated')

  let payload = buf.subarray(offset, offset + payloadSize)
  if (compress === COMPRESS_GZIP && payload.length > 0) {
    payload = gunzipSync(payload)
  }

  return { msgType, flags, serialize, compress, sequence, payload }
}
