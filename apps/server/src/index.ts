import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { err } from '@byteready/shared'
import { env } from './env'
import { healthRoute } from './routes/health'

const app = new Hono()

app.use('*', logger())
app.use('*', cors())

app.route('/api/health', healthRoute)

app.notFound((c) => c.json(err('NOT_FOUND', `Route not found: ${c.req.method} ${c.req.path}`), 404))

app.onError((error, c) => {
  console.error('[server] unhandled error:', error)
  return c.json(err('INTERNAL_ERROR', env.isDev ? error.message : 'Internal server error'), 500)
})

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`[server] running at http://localhost:${info.port}`)
})
