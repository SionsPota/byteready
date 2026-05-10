import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { err } from '@byteready/shared'
import { env } from './env.ts'
import { healthRoute } from './routes/health.ts'

export const createApp = () => {
  const app = new Hono()

  app.use('*', logger())
  app.use('*', cors())

  app.route('/api/health', healthRoute)

  app.notFound((c) =>
    c.json(err('NOT_FOUND', `Route not found: ${c.req.method} ${c.req.path}`), 404),
  )

  app.onError((error, c) => {
    console.error('[server] unhandled error:', error)
    return c.json(err('INTERNAL_ERROR', env.isDev ? error.message : 'Internal server error'), 500)
  })

  return app
}
