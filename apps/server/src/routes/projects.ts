import { Hono } from 'hono'
import { err, ok, projectCreateSchema, projectUpdateSchema } from '@byteready/shared'
import { requireAuth } from '../lib/auth/middleware.ts'
import { getDb } from '../lib/db/client.ts'
import { createProjectRepository } from '../lib/projects/repository.ts'

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
