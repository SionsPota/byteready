import { Hono } from 'hono'
import { ok, err } from '@byteready/shared'
import { getDb } from '../../lib/db/client.ts'
import {
  createExperienceRepository,
  type ExperienceResult,
} from '../../lib/explore/experiences.repository.ts'
import {
  createIndustryTrendRepository,
  decodeIndustryTrend,
} from '../../lib/explore/trends.repository.ts'
import {
  createLearningProjectRepository,
  decodeLearningProject,
} from '../../lib/explore/projects.repository.ts'

export const experiencesRoute = new Hono()

const RESULTS: ExperienceResult[] = ['passed', 'failed', 'pending', 'ghosted']

const parseTagIds = (raw: string | undefined): string[] | undefined => {
  if (!raw) return undefined
  const ids = raw.split(',').map((s) => s.trim()).filter(Boolean)
  return ids.length > 0 ? ids : undefined
}

// GET /api/explore/experiences?companyId=&tagIds=a,b,c&result=&search=&page=&limit=
experiencesRoute.get('/', (c) => {
  const repo = createExperienceRepository(getDb())
  const companyId = c.req.query('companyId')
  const result = c.req.query('result') as ExperienceResult | undefined
  const search = c.req.query('search')
  const tagIds = parseTagIds(c.req.query('tagIds'))
  const page = Math.max(1, parseInt(c.req.query('page') ?? '1', 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') ?? '20', 10) || 20))

  const validResult = result && RESULTS.includes(result) ? result : undefined

  const { items, total } = repo.list({
    companyId: companyId || undefined,
    tagIds,
    result: validResult,
    search: search || undefined,
    page,
    limit,
  })

  return c.json(
    ok(
      {
        total,
        page,
        limit,
        items: items.map((it) => ({
          id: it.id,
          companyId: it.company_id,
          companyName: it.company_name ?? it.company,
          companyColor: it.company_color,
          title: it.title,
          position: it.position,
          contentPreview: (it.content ?? '').slice(0, 220),
          sourceUrl: it.source_url,
          difficulty: it.difficulty,
          result: it.result,
          interviewDate: it.interview_date,
          viewCount: it.view_count,
          interviewRound: it.interview_round,
          interviewType: it.interview_type,
          createdAt: it.created_at,
          tags: it.tags.map((t) => ({
            id: t.id,
            name: t.name,
            color: t.color,
            category: t.category,
          })),
        })),
      },
      { total, page, limit },
    ),
  )
})

// GET /api/explore/experiences/:id
experiencesRoute.get('/:id', (c) => {
  const id = c.req.param('id')
  const repo = createExperienceRepository(getDb())
  const row = repo.getById(id)
  if (!row) return c.json(err('NOT_FOUND', '面经不存在'), 404)

  // 自增浏览量
  repo.incrementViews(id)

  // 加载关联的趋势和项目
  const trendRepo = createIndustryTrendRepository(getDb())
  const projectRepo = createLearningProjectRepository(getDb())
  const relatedTrends = trendRepo
    .listByIds(row.relatedTrendIds)
    .map(decodeIndustryTrend)
    .map((t) => ({
      id: t.id,
      title: t.title,
      category: t.category,
      description: t.description,
      relevanceBase: t.relevanceBase,
    }))
  const relatedProjects = projectRepo
    .listByIds(row.relatedProjectIds)
    .map(decodeLearningProject)
    .map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      githubUrl: p.githubUrl,
      stars: p.stars,
      language: p.language,
      impactScore: p.impactScore,
    }))

  return c.json(
    ok({
      id: row.id,
      companyId: row.company_id,
      companyName: row.company_name ?? row.company,
      companyColor: row.company_color,
      title: row.title,
      position: row.position,
      content: row.content,
      sourceUrl: row.source_url,
      difficulty: row.difficulty,
      result: row.result,
      interviewDate: row.interview_date,
      viewCount: row.view_count + 1,
      interviewRound: row.interview_round,
      interviewType: row.interview_type,
      answerKeyPoints: row.answer_key_points,
      createdAt: row.created_at,
      tags: row.tags.map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color,
        category: t.category,
      })),
      relatedTrends,
      relatedProjects,
    }),
  )
})
