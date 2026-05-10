import { Hono } from 'hono'
import { err, ok } from '@byteready/shared'
import { requireAuth } from '../lib/auth/middleware.ts'
import { synthesize } from '../lib/volc/tts.ts'

export const voiceRoute = new Hono()
voiceRoute.use('*', requireAuth)

voiceRoute.post('/tts', async (c) => {
  let body: { text?: string; speaker?: string; format?: 'mp3' | 'ogg_opus' | 'pcm' }
  try {
    body = await c.req.json()
  } catch {
    return c.json(err('VALIDATION', '请求体必须是 JSON'), 400)
  }

  const { text, speaker, format } = body
  if (!text || typeof text !== 'string') {
    return c.json(err('VALIDATION', 'text 必填'), 400)
  }

  try {
    const result = await synthesize(text, { speaker, format })
    const contentType = format === 'mp3' ? 'audio/mpeg' : format === 'ogg_opus' ? 'audio/ogg' : 'audio/pcm'
    return c.newResponse(result.audio as unknown as ArrayBuffer, 200, { 'Content-Type': contentType })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'tts_failed'
    return c.json(err('TTS_ERROR', message), 500)
  }
})
