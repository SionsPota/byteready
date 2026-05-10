import { WebSocket } from 'ws'
import { randomUUID } from 'node:crypto'
import { env } from '../../env.ts'
import {
  packMessage,
  unpackMessage,
  MSG_AUDIO_ONLY,
  MSG_ERROR,
  MSG_FULL_CLIENT,
  MSG_FULL_SERVER,
  FLAG_LAST,
  FLAG_LAST_SEQ,
  FLAG_NONE,
  FLAG_SEQ,
  COMPRESS_GZIP,
  SERIALIZE_JSON,
  SERIALIZE_NONE,
} from './binary.ts'

const VOLC_ASR_URL = 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_async'

interface ClientConfigFrame {
  type: 'config'
  audio?: {
    sample_rate?: number
    language?: string
  }
}

interface ClientEndFrame {
  type: 'end'
}

type ClientCtrlFrame = ClientConfigFrame | ClientEndFrame

interface UpstreamPayload {
  result?: { text?: string; utterances?: { definite?: boolean; text?: string }[] }
  audio_info?: { duration?: number }
}

export interface AsrUpstreamFactory {
  (url: string, headers: Record<string, string>): WebSocket
}

const defaultUpstreamFactory: AsrUpstreamFactory = (url, headers) =>
  new WebSocket(url, { headers })

/**
 * 浏览器 ↔ /ws/asr ↔ 火山 ASR 双向流式
 *
 * 浏览器发送：
 *   1. text frame: {"type":"config", audio:{...}}
 *   2. binary frame: 16kHz mono Int16 PCM 块
 *   3. text frame: {"type":"end"} (或直接关闭也算结束)
 *
 * 服务端发送：
 *   text frame: {"type":"partial"|"final"|"error"|"end", text?, error?}
 */
export const attachAsrWS = (
  client: WebSocket,
  opts?: { upstreamFactory?: AsrUpstreamFactory },
): void => {
  let upstream: WebSocket | null = null
  let configured = false
  let sequence = 1
  let closed = false
  const factory = opts?.upstreamFactory ?? defaultUpstreamFactory

  const sendClient = (obj: unknown): void => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(obj))
    }
  }

  const closeBoth = (reason?: string): void => {
    if (closed) return
    closed = true
    try {
      upstream?.close(1000, reason ?? 'done')
    } catch {
      // noop
    }
    try {
      client.close(1000, reason ?? 'done')
    } catch {
      // noop
    }
  }

  client.on('message', (raw, isBinary) => {
    void (async () => {
      try {
        if (!isBinary) {
          const frame = JSON.parse(
            (raw as Buffer).toString('utf-8'),
          ) as ClientCtrlFrame
          if (frame.type === 'config') {
            if (configured) return
            configured = true
            await openUpstream(frame)
            return
          }
          if (frame.type === 'end') {
            sendUpstreamAudio(Buffer.alloc(0), true)
            return
          }
          return
        }

        if (!configured || !upstream || upstream.readyState !== WebSocket.OPEN) {
          sendClient({ type: 'error', error: 'upstream_not_ready' })
          return
        }
        const chunk = Buffer.isBuffer(raw) ? raw : Buffer.from(raw as ArrayBuffer)
        sendUpstreamAudio(chunk, false)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'frame_error'
        sendClient({ type: 'error', error: message })
        closeBoth(message)
      }
    })()
  })

  client.on('close', () => closeBoth('client_closed'))
  client.on('error', (err) => {
    console.error('[asr/client]', err)
    closeBoth('client_error')
  })

  const openUpstream = (cfg: ClientConfigFrame): Promise<void> =>
    new Promise<void>((resolve, reject) => {
      const requestId = randomUUID()
      upstream = factory(VOLC_ASR_URL, {
        'X-Api-Key': env.VOLCENGINE_API_KEY,
        'X-Api-Resource-Id': env.VOLCENGINE_ASR_RESOURCE_ID,
        'X-Api-Request-Id': requestId,
        'X-Api-Sequence': '-1',
      })

      upstream.on('open', () => {
        try {
          const config = {
            user: { uid: 'demo' },
            audio: {
              format: 'pcm',
              codec: 'raw',
              rate: cfg.audio?.sample_rate ?? env.VOLCENGINE_ASR_SAMPLE_RATE,
              bits: 16,
              channel: 1,
              language: cfg.audio?.language ?? env.VOLCENGINE_ASR_LANGUAGE,
            },
            request: {
              model_name: 'bigmodel',
              enable_itn: true,
              enable_punc: true,
              enable_ddc: false,
              enable_nonstream: false,
            },
          }
          const payload = Buffer.from(JSON.stringify(config), 'utf-8')
          upstream?.send(
            packMessage({
              msgType: MSG_FULL_CLIENT,
              flags: FLAG_SEQ,
              sequence: sequence++,
              serialize: SERIALIZE_JSON,
              compress: COMPRESS_GZIP,
              payload,
            }),
          )
          resolve()
        } catch (err) {
          reject(err instanceof Error ? err : new Error(String(err)))
        }
      })

      upstream.on('message', (data) => {
        try {
          const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer)
          const frame = unpackMessage(buf)

          if (frame.error || frame.msgType === MSG_ERROR) {
            const msg = frame.error?.message ?? 'upstream_error'
            sendClient({ type: 'error', error: `${frame.error?.code ?? '?'}: ${msg}` })
            closeBoth(msg)
            return
          }

          if (frame.msgType === MSG_FULL_SERVER) {
            const text = frame.payload.toString('utf-8')
            try {
              const obj = JSON.parse(text) as UpstreamPayload
              const recognized = obj.result?.text ?? ''
              const hasFinal = (obj.result?.utterances ?? []).some((u) => u.definite)
              if (recognized) {
                sendClient({ type: hasFinal ? 'final' : 'partial', text: recognized })
              }
            } catch {
              // 非 JSON 体，不处理
            }
            if (frame.flags === FLAG_LAST || frame.flags === FLAG_LAST_SEQ) {
              sendClient({ type: 'end' })
              closeBoth('done')
            }
          }
        } catch (err) {
          console.error('[asr/upstream-msg]', err)
        }
      })

      upstream.on('close', () => {
        sendClient({ type: 'end' })
        closeBoth('upstream_closed')
      })
      upstream.on('error', (err) => {
        console.error('[asr/upstream]', err)
        sendClient({ type: 'error', error: 'upstream_error' })
        closeBoth('upstream_error')
      })
    })

  const sendUpstreamAudio = (chunk: Buffer, isLast: boolean): void => {
    if (!upstream || upstream.readyState !== WebSocket.OPEN) return
    upstream.send(
      packMessage({
        msgType: MSG_AUDIO_ONLY,
        flags: isLast ? FLAG_LAST : FLAG_NONE,
        serialize: SERIALIZE_NONE,
        compress: COMPRESS_GZIP,
        payload: chunk,
      }),
    )
  }
}
