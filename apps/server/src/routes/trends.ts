import { Hono } from 'hono'
import { ok } from '@byteready/shared'
import { requireAuth } from '../lib/auth/middleware.ts'
import { getDb } from '../lib/db/client.ts'
import { createTrendRepository } from '../lib/trends/repository.ts'

export const trendsRoute = new Hono()
trendsRoute.use('*', requireAuth)

// GET /api/trends?t=avg|series
// avg: 返回各轴最近 N 场平均
// series: 返回各轴时间序列（用于折线图）
trendsRoute.get('/', (c) => {
  const userId = c.get('userId' as never) as string
  const t = c.req.query('t') ?? 'series'
  const since = c.req.query('since') ? parseInt(c.req.query('since')!, 10) : undefined
  const repo = createTrendRepository(getDb())

  if (t === 'avg') {
    const rows = repo.getAveragesByAxis(userId, { since })
    return c.json(ok(rows.map((r) => ({
      axis: r.axis,
      avg: Math.round(r.avg * 10) / 10,
      count: r.count,
    }))))
  }

  // series
  const rows = repo.listByOwner(userId, { since, limit: 500 })
  // 按 axis 分组
  const byAxis = new Map<string, { sessionId: string; value: number; createdAt: number }[]>()
  for (const r of rows) {
    const list = byAxis.get(r.axis) ?? []
    list.push({ sessionId: r.session_id, value: r.value, createdAt: r.created_at })
    byAxis.set(r.axis, list)
  }

  const result: Record<string, { sessionId: string; value: number; createdAt: number }[]> = {}
  for (const [axis, list] of byAxis) {
    result[axis] = list.reverse() // 按时间正序
  }

  return c.json(ok(result))
})
