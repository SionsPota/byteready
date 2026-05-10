import { Hono } from 'hono'
import { ok } from '@byteready/shared'
import { env as serverEnv } from '../../../server/src/env.ts'

export const healthRoute = new Hono()

healthRoute.get('/', (c) =>
  c.json(
    ok({
      ok: true,
      service: 'byteready-lab',
      kimi: Boolean(serverEnv.KIMI_API_KEY),
      volc: Boolean(serverEnv.VOLCENGINE_API_KEY),
      kimiModel: serverEnv.KIMI_MODEL,
      ttsSpeaker: serverEnv.VOLCENGINE_TTS_SPEAKER,
      ttsResource: serverEnv.VOLCENGINE_TTS_RESOURCE_ID,
      asrResource: serverEnv.VOLCENGINE_ASR_RESOURCE_ID,
    }),
  ),
)
