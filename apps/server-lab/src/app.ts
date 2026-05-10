import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { err } from '@byteready/shared'
import { labEnv } from './env.ts'
import { healthRoute } from './routes/health.ts'
import { llmRoute } from './routes/llm.ts'
import { voiceRoute } from './routes/voice.ts'

export const createLabApp = (): Hono => {
  const app = new Hono()

  app.use('*', logger())
  app.use('*', cors())

  app.route('/api/health', healthRoute)
  app.route('/api/llm', llmRoute)
  app.route('/api/voice', voiceRoute)

  app.notFound((c) =>
    c.json(err('NOT_FOUND', `Route not found: ${c.req.method} ${c.req.path}`), 404),
  )

  app.onError((error, c) => {
    console.error('[server-lab] unhandled error:', error)
    return c.json(
      err('INTERNAL_ERROR', labEnv.isDev ? error.message : 'Internal server error'),
      500,
    )
  })

  return app
}
