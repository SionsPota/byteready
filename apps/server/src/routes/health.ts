import { Hono } from 'hono'
import { ok } from '@byteready/shared'

export const healthRoute = new Hono()

healthRoute.get('/', (c) =>
  c.json(
    ok({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    }),
  ),
)
