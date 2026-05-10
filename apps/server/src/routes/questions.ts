import { Hono } from 'hono'
import { err, ok } from '@byteready/shared'
import { requireAuth } from '../lib/auth/middleware.ts'
import { getDb } from '../lib/db/client.ts'
import { createQuestionRepository } from '../lib/questions/repository.ts'

export const questionsRoute = new Hono()
questionsRoute.use('*', requireAuth)

questionsRoute.get('/', (c) => {
  const position = c.req.query('position')
  const level = c.req.query('level')
  const category = c.req.query('category')
  const page = Math.max(1, parseInt(c.req.query('page') ?? '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') ?? '20', 10)))
  const offset = (page - 1) * limit

  const repo = createQuestionRepository(getDb())
  const result = repo.list({ position, level, category, limit, offset })

  return c.json(ok(
    result.rows.map((r) => ({
      id: r.id,
      position: r.position,
      level: r.level,
      category: r.category,
      mainText: r.main_text,
      expectedPoints: r.expected_points,
    })),
    { total: result.total, page, limit }
  ))
})
