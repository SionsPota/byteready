import { randomUUID } from 'node:crypto'
import { env } from '../../env.ts'

const TTS_URL = 'https://openspeech.bytedance.com/api/v3/tts/unidirectional'

export type TTSFormat = 'mp3' | 'ogg_opus' | 'pcm'

export interface SynthesizeOptions {
  speaker?: string
  speechRate?: number
  loudnessRate?: number
  format?: TTSFormat
  sampleRate?: number
}

export interface SynthesizeResult {
  audio: Buffer
  format: TTSFormat
  sampleRate: number
}

interface TTSEvent {
  code?: number
  message?: string
  data?: string | null
}

interface TTSEventError {
  code: number
  message: string
}

const parseLine = (line: string): TTSEvent | null => {
  const trimmed = line.trim()
  if (!trimmed) return null
  try {
    return JSON.parse(trimmed) as TTSEvent
  } catch {
    return null
  }
}

export const synthesize = async (
  text: string,
  opts?: SynthesizeOptions,
): Promise<SynthesizeResult> => {
  if (!env.VOLCENGINE_API_KEY) {
    throw new Error('VOLCENGINE_API_KEY is not configured')
  }
  if (!text) throw new Error('tts_text_empty')

  const speaker = opts?.speaker ?? env.VOLCENGINE_TTS_SPEAKER
  const speechRate = opts?.speechRate ?? env.VOLCENGINE_TTS_SPEECH_RATE
  const loudnessRate = opts?.loudnessRate ?? env.VOLCENGINE_TTS_LOUDNESS_RATE
  const format: TTSFormat = (opts?.format ?? env.VOLCENGINE_TTS_AUDIO_FORMAT) as TTSFormat
  const sampleRate = opts?.sampleRate ?? env.VOLCENGINE_TTS_SAMPLE_RATE

  const upstream = await fetch(TTS_URL, {
    method: 'POST',
    headers: {
      'X-Api-Key': env.VOLCENGINE_API_KEY,
      'X-Api-Resource-Id': env.VOLCENGINE_TTS_RESOURCE_ID,
      'X-Api-Connect-Id': randomUUID(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user: { uid: 'demo' },
      req_params: {
        text,
        speaker,
        audio_params: {
          format,
          sample_rate: sampleRate,
          speech_rate: speechRate,
          loudness_rate: loudnessRate,
        },
      },
    }),
  })

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text().catch(() => upstream.statusText)
    throw new Error(`volc_tts upstream ${upstream.status}: ${errText}`)
  }

  const chunks: Buffer[] = []
  let lastError: TTSEventError | null = null
  const reader = upstream.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  const handleLine = (line: string): void => {
    const evt = parseLine(line)
    if (!evt) return
    if (evt.code != null && evt.code !== 0 && evt.code !== 20000000) {
      lastError = { code: evt.code, message: evt.message ?? 'tts_error' }
    }
    if (evt.data) {
      chunks.push(Buffer.from(evt.data, 'base64'))
    }
  }

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) handleLine(line)
  }
  if (buffer.trim()) handleLine(buffer)

  if (chunks.length === 0) {
    const captured = lastError as TTSEventError | null
    if (captured) {
      throw new Error(`volc_tts code=${captured.code} ${captured.message}`)
    }
    throw new Error('volc_tts_empty_audio')
  }

  return {
    audio: Buffer.concat(chunks),
    format,
    sampleRate,
  }
}
