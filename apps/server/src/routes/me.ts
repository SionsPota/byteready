import { Hono } from 'hono'
import { ok, err } from '@byteready/shared'
import { requireAuth } from '../lib/auth/middleware.ts'
import { getDb } from '../lib/db/client.ts'

export const meRoute = new Hono()

meRoute.use('*', requireAuth)

meRoute.get('/', (c) => {
  const userId = (c.get('userId' as never) as string)
  const db = getDb()

  const row = db.prepare('SELECT id, email, name, created_at FROM users WHERE id = ?').get(userId) as
    | { id: string; email: string; name: string | null; created_at: number }
    | undefined

  if (!row) {
    return c.json(err('NOT_FOUND', '用户不存在'), 404)
  }

  return c.json(ok({
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: row.created_at,
  }))
})
