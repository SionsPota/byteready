import { Hono } from 'hono'
import { err, ok, projectCreateSchema, projectUpdateSchema } from '@byteready/shared'
import { requireAuth } from '../lib/auth/middleware.ts'
import { getDb } from '../lib/db/client.ts'
import { createProjectRepository } from '../lib/projects/repository.ts'
import { findRelatedByTags } from '../lib/explore/cross-ref.ts'

export const projectsRoute = new Hono()
projectsRoute.use('*', requireAuth)

const getRepo = () => createProjectRepository(getDb())

// GET /api/projects - 列表
projectsRoute.get('/', (c) => {
  const userId = c.get('userId' as never) as string
  const repo = getRepo()
  const rows = repo.listByOwner(userId)
  return c.json(ok(rows.map((r) => ({
    id: r.id,
    name: r.name,
    period: r.period,
    role: r.role,
    summary: r.summary,
    keywords: r.keywords ? JSON.parse(r.keywords) : [],
    source: r.source,
    sourceResumeId: r.source_resume_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }))))
})

// POST /api/projects - 创建
projectsRoute.post('/', async (c) => {
  const userId = c.get('userId' as never) as string
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json(err('VALIDATION', '请求体必须是 JSON'), 400)
  }

  const parsed = projectCreateSchema.safeParse(body)
  if (!parsed.success) {
    const messages = parsed.error.issues.map((i) => i.message).join('; ')
    return c.json(err('VALIDATION', messages), 400)
  }

  const { name, period, role, summary, keywords } = parsed.data
  const repo = getRepo()
  const project = repo.create({
    ownerId: userId,
    name,
    period,
    role,
    summary,
    keywords,
    source: 'manual',
  })

  return c.json(ok({
    id: project.id,
    name: project.name,
    period: project.period,
    role: project.role,
    summary: project.summary,
    keywords: project.keywords ? JSON.parse(project.keywords) : [],
    source: project.source,
    createdAt: project.created_at,
    updatedAt: project.updated_at,
  }), 201)
})

// GET /api/projects/:id - 详情
projectsRoute.get('/:id', (c) => {
  const userId = c.get('userId' as never) as string
  const id = c.req.param('id')
  const repo = getRepo()
  const row = repo.getById(id)

  if (!row || row.owner_id !== userId) {
    return c.json(err('NOT_FOUND', '项目不存在'), 404)
  }

  return c.json(ok({
    id: row.id,
    name: row.name,
    period: row.period,
    role: row.role,
    summary: row.summary,
    keywords: row.keywords ? JSON.parse(row.keywords) : [],
    source: row.source,
    sourceResumeId: row.source_resume_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
})

// PATCH /api/projects/:id - 编辑
projectsRoute.patch('/:id', async (c) => {
  const userId = c.get('userId' as never) as string
  const id = c.req.param('id')
  const repo = getRepo()

  const project = repo.getById(id)
  if (!project || project.owner_id !== userId) {
    return c.json(err('NOT_FOUND', '项目不存在'), 404)
  }

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json(err('VALIDATION', '请求体必须是 JSON'), 400)
  }

  const parsed = projectUpdateSchema.safeParse(body)
  if (!parsed.success) {
    const messages = parsed.error.issues.map((i) => i.message).join('; ')
    return c.json(err('VALIDATION', messages), 400)
  }

  const { name, period, role, summary, keywords } = parsed.data
  repo.update(id, {
    name,
    period: period ?? null,
    role: role ?? null,
    summary: summary ?? null,
    keywords: keywords ?? null,
  })

  const updated = repo.getById(id)
  return c.json(ok({
    id: updated!.id,
    name: updated!.name,
    period: updated!.period,
    role: updated!.role,
    summary: updated!.summary,
    keywords: updated!.keywords ? JSON.parse(updated!.keywords) : [],
    source: updated!.source,
    createdAt: updated!.created_at,
    updatedAt: updated!.updated_at,
  }))
})

// GET /api/projects/:id/related-training - 相关训练记录
projectsRoute.get('/:id/related-training', (c) => {
  const userId = c.get('userId' as never) as string
  const id = c.req.param('id')
  const repo = getRepo()

  const project = repo.getById(id)
  if (!project || project.owner_id !== userId) {
    return c.json(err('NOT_FOUND', '项目不存在'), 404)
  }

  const db = getDb()
  const rows = db.prepare(
    `SELECT DISTINCT ts.id, ts.type, ts.position, ts.target_company, ts.status, ts.created_at
     FROM training_sessions ts
     JOIN training_turns tt ON tt.session_id = ts.id
     WHERE tt.project_id = ? AND ts.owner_id = ?
     ORDER BY ts.created_at DESC
     LIMIT 10`
  ).all(id, userId) as Array<{
    id: string
    type: string
    position: string
    target_company: string | null
    status: string
    created_at: number
  }>

  return c.json(ok(rows.map((r) => ({
    id: r.id,
    type: r.type,
    position: r.position,
    targetCompany: r.target_company,
    status: r.status,
    createdAt: r.created_at,
  }))))
})

// GET /api/projects/:id/related-explore - 探索页相关学习项目
projectsRoute.get('/:id/related-explore', (c) => {
  const userId = c.get('userId' as never) as string
  const id = c.req.param('id')
  const repo = getRepo()

  const project = repo.getById(id)
  if (!project || project.owner_id !== userId) {
    return c.json(err('NOT_FOUND', '项目不存在'), 404)
  }

  const keywords = project.keywords ? JSON.parse(project.keywords) as string[] : []
  if (keywords.length === 0) {
    return c.json(ok({ items: [] }))
  }

  const db = getDb()
  // 用 keywords 匹配 learning_projects 的 tags / name / description / related_skills
  const conditions = keywords.map(() =>
    `(name LIKE ? OR description LIKE ? OR EXISTS (SELECT 1 FROM json_each(tags) WHERE value = ?) OR related_skills LIKE ?)`
  ).join(' OR ')
  const params: (string | number)[] = []
  for (const kw of keywords) {
    const like = `%${kw}%`
    params.push(like, like, kw, like)
  }

  const rows = db.prepare(
    `SELECT * FROM learning_projects WHERE ${conditions} ORDER BY impact_score DESC, COALESCE(stars,0) DESC LIMIT 6`
  ).all(...params) as Array<{
    id: string
    name: string
    description: string
    language: string | null
    category: string | null
    stars: number | null
    impact_score: number
    tags: string | null
  }>

  return c.json(ok({
    items: rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      language: r.language,
      category: r.category,
      stars: r.stars,
      impactScore: r.impact_score,
      tags: r.tags ? JSON.parse(r.tags) : [],
    })),
  }))
})

// GET /api/projects/:id/cross-ref - 跨类型相关条目（面经 / 趋势 / 学习项目 / 题库）
// 把简历项目的 keywords 当作 tag 名传给 findRelatedByTags：tag 命中得分高的优先返回
projectsRoute.get('/:id/cross-ref', (c) => {
  const userId = c.get('userId' as never) as string
  const id = c.req.param('id')
  const repo = getRepo()

  const project = repo.getById(id)
  if (!project || project.owner_id !== userId) {
    return c.json(err('NOT_FOUND', '项目不存在'), 404)
  }

  const keywords = project.keywords ? (JSON.parse(project.keywords) as string[]) : []
  if (keywords.length === 0) {
    return c.json(ok({ experiences: [], trends: [], projects: [], questions: [] }))
  }

  // exclude.id 用一个不存在的 id，等同于"不排除任何 explore 学习项目"
  const result = findRelatedByTags(getDb(), keywords, { type: 'project', id: '__none__' })
  return c.json(ok(result))
})

// DELETE /api/projects/:id - 删除
projectsRoute.delete('/:id', (c) => {
  const userId = c.get('userId' as never) as string
  const id = c.req.param('id')
  const repo = getRepo()

  const project = repo.getById(id)
  if (!project || project.owner_id !== userId) {
    return c.json(err('NOT_FOUND', '项目不存在'), 404)
  }

  repo.delete(id)
  return c.json(ok({ message: '已删除' }))
})
