import { Hono } from 'hono'
import { err } from '@byteready/shared'
import { synthesize, type TTSFormat } from '../../../server/src/lib/volc/tts.ts'

export const voiceRoute = new Hono()

const VALID_FORMATS: readonly TTSFormat[] = ['mp3', 'ogg_opus', 'pcm']

interface TtsBody {
  text?: string
  speaker?: string
  format?: TTSFormat
  speechRate?: number
  loudnessRate?: number
  sampleRate?: number
}

voiceRoute.post('/tts', async (c) => {
  let body: TtsBody
  try {
    body = (await c.req.json()) as TtsBody
  } catch {
    return c.json(err('VALIDATION', '请求体必须是合法 JSON'), 400)
  }

  const text = typeof body.text === 'string' ? body.text.trim() : ''
  if (!text) return c.json(err('VALIDATION', 'text 必填'), 400)
  if (text.length > 1000) return c.json(err('VALIDATION', 'text 最长 1000 字符'), 400)

  const format = body.format ?? 'mp3'
  if (!VALID_FORMATS.includes(format)) {
    return c.json(err('VALIDATION', `format 必须是 ${VALID_FORMATS.join(' / ')}`), 400)
  }

  try {
    const result = await synthesize(text, {
      speaker: body.speaker,
      format,
      speechRate: body.speechRate,
      loudnessRate: body.loudnessRate,
      sampleRate: body.sampleRate,
    })
    const contentType =
      format === 'mp3' ? 'audio/mpeg' : format === 'ogg_opus' ? 'audio/ogg' : 'audio/pcm'
    return c.newResponse(result.audio as unknown as ArrayBuffer, 200, {
      'Content-Type': contentType,
      'X-Audio-Format': result.format,
      'X-Audio-Sample-Rate': String(result.sampleRate),
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'tts_failed'
    console.error('[lab/voice/tts]', e)
    return c.json(err('TTS_ERROR', message), 500)
  }
})
