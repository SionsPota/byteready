import { Hono } from 'hono'
import { ok, err } from '@byteready/shared'
import { getDb } from '../../lib/db/client.ts'
import {
  createIndustryTrendRepository,
  decodeIndustryTrend,
} from '../../lib/explore/trends.repository.ts'
import {
  createLearningProjectRepository,
  decodeLearningProject,
} from '../../lib/explore/projects.repository.ts'
import { createResumeRepository } from '../../lib/resume/repository.ts'
import {
  detectRole,
  identifyGaps,
  recommendTrends,
  type TrendForRecommend,
} from '../../lib/explore/recommender.ts'
import { findRelatedByTags } from '../../lib/explore/cross-ref.ts'

export const trendsRoute = new Hono()

const extractSkillsFromResume = (skillsJson: string | null): string[] => {
  if (!skillsJson) return []
  try {
    const parsed = JSON.parse(skillsJson)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((s: unknown) => {
        if (typeof s === 'string') return s
        if (s && typeof s === 'object' && 'name' in s && typeof (s as { name: unknown }).name === 'string') {
          return (s as { name: string }).name
        }
        return ''
      })
      .filter(Boolean)
  } catch {
    return []
  }
}

// GET /api/explore/trends/recommend?resumeId=xxx
// 必须放在 /:id 之前以避免被参数路由捕获
trendsRoute.get('/recommend', (c) => {
  const userId = c.get('userId' as never) as string
  const resumeId = c.req.query('resumeId')
  const trendRepo = createIndustryTrendRepository(getDb())
  const allTrends = trendRepo.list().map(decodeIndustryTrend)

  if (!resumeId) {
    // 无简历时返回热度排序
    return c.json(
      ok({
        items: allTrends.map((t) => ({ ...t, score: t.relevanceBase })),
        role: null,
        gaps: [],
      }),
    )
  }

  const resumeRepo = createResumeRepository(getDb())
  const resume = resumeRepo.getById(resumeId)
  if (!resume) return c.json(err('NOT_FOUND', '简历不存在'), 404)
  if (resume.owner_id !== userId) return c.json(err('FORBIDDEN', '无权访问该简历'), 403)

  const skills = extractSkillsFromResume(resume.skills)
  const role = detectRole(skills)
  const gaps = identifyGaps(skills, role)

  const trendsForRecommend: TrendForRecommend[] = allTrends.map((t) => ({
    id: t.id,
    related_role: t.relatedRole,
    related_skills: t.relatedSkills,
    relevance_base: t.relevanceBase,
  }))
  const scored = recommendTrends(skills, role, trendsForRecommend)
  const trendMap = new Map(allTrends.map((t) => [t.id, t]))
  const items = scored
    .map((s) => {
      const trend = trendMap.get(s.item.id)
      return trend ? { ...trend, score: s.score } : null
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  return c.json(
    ok({
      items,
      role,
      gaps: gaps.map((g) => g.skill),
    }),
  )
})

// GET /api/explore/trends
trendsRoute.get('/', (c) => {
  const repo = createIndustryTrendRepository(getDb())
  const rows = repo.list().map(decodeIndustryTrend)
  return c.json(ok(rows))
})

// GET /api/explore/trends/:id
trendsRoute.get('/:id', (c) => {
  const id = c.req.param('id')
  const trendRepo = createIndustryTrendRepository(getDb())
  const projectRepo = createLearningProjectRepository(getDb())

  const row = trendRepo.getById(id)
  if (!row) return c.json(err('NOT_FOUND', '趋势不存在'), 404)

  const decoded = decodeIndustryTrend(row)
  const relatedProjects = projectRepo
    .listByIds(decoded.relatedProjectIds)
    .map(decodeLearningProject)

  const relatedByTags = findRelatedByTags(getDb(), decoded.tags, {
    type: 'trend',
    id: decoded.id,
  })

  return c.json(ok({ ...decoded, relatedProjects, relatedByTags }))
})
