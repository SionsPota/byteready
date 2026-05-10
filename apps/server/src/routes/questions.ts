import { Hono } from 'hono'
import { err, ok } from '@byteready/shared'
import { requireAuth } from '../lib/auth/middleware.ts'
import { getDb } from '../lib/db/client.ts'
import { createQuestionRepository } from '../lib/questions/repository.ts'
import { searchInterviewQa, getInterviewQaById } from '../lib/questions/search.ts'

export const questionsRoute = new Hono()
questionsRoute.use('*', requireAuth)

// 原有题库列表（手动种子数据）
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

// 大数据集关键词搜索
questionsRoute.get('/search', (c) => {
  const q = c.req.query('q') ?? ''
  const page = Math.max(1, parseInt(c.req.query('page') ?? '1', 10))
  const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit') ?? '20', 10)))
  const mode = (c.req.query('mode') ?? 'OR') as 'AND' | 'OR'

  if (!q.trim()) {
    return c.json(err('VALIDATION', '搜索关键词不能为空'), 400)
  }

  const result = searchInterviewQa(getDb(), { q, page, limit, mode })

  return c.json(ok(
    result.rows.map((r) => ({
      id: r.id,
      question: r.question,
      answer: r.answer.length > 300 ? r.answer.slice(0, 300) + '...' : r.answer,
      source: r.source,
    })),
    { total: result.total, page, limit }
  ))
})

// 大数据集单条详情
questionsRoute.get('/search/:id', (c) => {
  const id = parseInt(c.req.param('id'), 10)
  if (Number.isNaN(id)) {
    return c.json(err('VALIDATION', '无效的 ID'), 400)
  }

  const row = getInterviewQaById(getDb(), id)
  if (!row) {
    return c.json(err('NOT_FOUND', '题目不存在'), 404)
  }

  return c.json(ok({
    id: row.id,
    question: row.question,
    answer: row.answer,
    source: row.source,
  }))
})
