import { Hono } from 'hono'
import { ok, err } from '@byteready/shared'
import { getDb } from '../../lib/db/client.ts'
import {
  createLearningProjectRepository,
  decodeLearningProject,
  type ProjectType,
  type ProjectDifficulty,
} from '../../lib/explore/projects.repository.ts'
import {
  createIndustryTrendRepository,
  decodeIndustryTrend,
} from '../../lib/explore/trends.repository.ts'
import { createResumeRepository } from '../../lib/resume/repository.ts'
import {
  detectRole,
  identifyGaps,
  recommendProjects,
  type ProjectForRecommend,
} from '../../lib/explore/recommender.ts'

export const projectsRoute = new Hono()

const PROJECT_TYPES: ProjectType[] = ['quick_win', 'weekend_build', 'deep_dive']
const DIFFICULTIES: ProjectDifficulty[] = ['beginner', 'intermediate', 'advanced']

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

// GET /api/explore/projects/recommend?resumeId=xxx
projectsRoute.get('/recommend', (c) => {
  const userId = c.get('userId' as never) as string
  const resumeId = c.req.query('resumeId')
  const projectRepo = createLearningProjectRepository(getDb())
  const allProjects = projectRepo.list().map(decodeLearningProject)

  if (!resumeId) {
    return c.json(
      ok({
        items: allProjects.map((p) => ({ ...p, score: p.impactScore })),
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

  const projectsForRecommend: ProjectForRecommend[] = allProjects.map((p) => ({
    id: p.id,
    related_role: p.relatedRole,
    related_skills: p.relatedSkills,
    gap_addressed: p.gapAddressed,
    impact_score: p.impactScore,
    project_type: p.projectType,
    difficulty: p.difficulty,
  }))
  const scored = recommendProjects(skills, role, gaps, projectsForRecommend)
  const projectMap = new Map(allProjects.map((p) => [p.id, p]))
  const items = scored
    .map((s) => {
      const project = projectMap.get(s.item.id)
      return project ? { ...project, score: s.score } : null
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

// GET /api/explore/projects?type=&difficulty=&role=
projectsRoute.get('/', (c) => {
  const repo = createLearningProjectRepository(getDb())
  const projectType = c.req.query('type') as ProjectType | undefined
  const difficulty = c.req.query('difficulty') as ProjectDifficulty | undefined
  const role = c.req.query('role')

  const rows = repo
    .list({
      projectType: projectType && PROJECT_TYPES.includes(projectType) ? projectType : undefined,
      difficulty: difficulty && DIFFICULTIES.includes(difficulty) ? difficulty : undefined,
      relatedRole: role || undefined,
    })
    .map(decodeLearningProject)
  return c.json(ok(rows))
})

// GET /api/explore/projects/:id
projectsRoute.get('/:id', (c) => {
  const id = c.req.param('id')
  const projectRepo = createLearningProjectRepository(getDb())
  const trendRepo = createIndustryTrendRepository(getDb())

  const row = projectRepo.getById(id)
  if (!row) return c.json(err('NOT_FOUND', '学习项目不存在'), 404)

  const decoded = decodeLearningProject(row)
  const relatedTrends = trendRepo
    .listByIds(decoded.relatedTrendIds)
    .map(decodeIndustryTrend)

  return c.json(ok({ ...decoded, relatedTrends }))
})
