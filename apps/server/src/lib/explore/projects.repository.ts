import type { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'

export type ProjectType = 'quick_win' | 'weekend_build' | 'deep_dive'
export type ProjectDifficulty = 'beginner' | 'intermediate' | 'advanced'

export interface LearningProjectRow {
  id: string
  name: string
  project_type: ProjectType | null
  difficulty: ProjectDifficulty | null
  time_estimate: string | null
  tech_stack: string | null
  gap_addressed: string | null
  description: string
  core_features: string | null
  tech_highlights: string | null
  implementation_steps: string | null
  resume_template: string | null
  impact_score: number
  source_url: string | null
  related_role: string | null
  related_skills: string | null
  related_trend_ids: string | null
  github_url: string | null
  stars: number | null
  forks: number | null
  language: string | null
  category: string | null
  learning_path: string | null
  is_interview_related: number | null
  tags: string | null
  created_at: number
}

export interface LearningProjectDecoded {
  id: string
  name: string
  projectType: ProjectType | null
  difficulty: ProjectDifficulty | null
  timeEstimate: string | null
  techStack: string[]
  gapAddressed: string | null
  description: string
  coreFeatures: string[]
  techHighlights: string[]
  implementationSteps: string[]
  resumeTemplate: string | null
  impactScore: number
  sourceUrl: string | null
  relatedRole: string | null
  relatedSkills: string[]
  relatedTrendIds: string[]
  githubUrl: string | null
  stars: number | null
  forks: number | null
  language: string | null
  category: string | null
  learningPath: string | null
  isInterviewRelated: boolean
  tags: string[]
  createdAt: number
}

export interface CreateLearningProjectInput {
  name: string
  projectType?: ProjectType | null
  difficulty?: ProjectDifficulty | null
  timeEstimate?: string
  techStack?: string[]
  gapAddressed?: string
  description: string
  coreFeatures?: string[]
  techHighlights?: string[]
  implementationSteps?: string[]
  resumeTemplate?: string
  impactScore?: number
  sourceUrl?: string
  relatedRole?: string
  relatedSkills?: string[]
  relatedTrendIds?: string[]
  githubUrl?: string
  stars?: number
  forks?: number
  language?: string
  category?: string
  learningPath?: string
  isInterviewRelated?: boolean
  tags?: string[]
}

const safeParseArr = (s: string | null): string[] => {
  if (!s) return []
  try {
    const parsed = JSON.parse(s)
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch {
    return []
  }
}

export const decodeLearningProject = (row: LearningProjectRow): LearningProjectDecoded => ({
  id: row.id,
  name: row.name,
  projectType: row.project_type,
  difficulty: row.difficulty,
  timeEstimate: row.time_estimate,
  techStack: safeParseArr(row.tech_stack),
  gapAddressed: row.gap_addressed,
  description: row.description,
  coreFeatures: safeParseArr(row.core_features),
  techHighlights: safeParseArr(row.tech_highlights),
  implementationSteps: safeParseArr(row.implementation_steps),
  resumeTemplate: row.resume_template,
  impactScore: row.impact_score,
  sourceUrl: row.source_url,
  relatedRole: row.related_role,
  relatedSkills: safeParseArr(row.related_skills),
  relatedTrendIds: safeParseArr(row.related_trend_ids),
  githubUrl: row.github_url,
  stars: row.stars,
  forks: row.forks,
  language: row.language,
  category: row.category,
  learningPath: row.learning_path,
  isInterviewRelated: row.is_interview_related === 1,
  tags: safeParseArr(row.tags),
  createdAt: row.created_at,
})

export interface ListProjectFilter {
  projectType?: ProjectType
  difficulty?: ProjectDifficulty
  relatedRole?: string
  language?: string
  category?: string
}

export const createLearningProjectRepository = (db: DatabaseSync) => {
  return {
    create: (input: CreateLearningProjectInput, idOverride?: string): LearningProjectRow => {
      const id = idOverride ?? randomUUID()
      const now = Date.now()
      db.prepare(
        `INSERT INTO learning_projects (id, name, project_type, difficulty, time_estimate, tech_stack, gap_addressed, description, core_features, tech_highlights, implementation_steps, resume_template, impact_score, source_url, related_role, related_skills, related_trend_ids, github_url, stars, forks, language, category, learning_path, is_interview_related, tags, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        input.name,
        input.projectType ?? null,
        input.difficulty ?? null,
        input.timeEstimate ?? null,
        input.techStack ? JSON.stringify(input.techStack) : null,
        input.gapAddressed ?? null,
        input.description,
        input.coreFeatures ? JSON.stringify(input.coreFeatures) : null,
        input.techHighlights ? JSON.stringify(input.techHighlights) : null,
        input.implementationSteps ? JSON.stringify(input.implementationSteps) : null,
        input.resumeTemplate ?? null,
        input.impactScore ?? 7,
        input.sourceUrl ?? null,
        input.relatedRole ?? null,
        input.relatedSkills ? JSON.stringify(input.relatedSkills) : null,
        input.relatedTrendIds ? JSON.stringify(input.relatedTrendIds) : null,
        input.githubUrl ?? null,
        input.stars ?? null,
        input.forks ?? null,
        input.language ?? null,
        input.category ?? null,
        input.learningPath ?? null,
        input.isInterviewRelated === undefined ? null : input.isInterviewRelated ? 1 : 0,
        input.tags ? JSON.stringify(input.tags) : null,
        now,
      )
      return {
        id,
        name: input.name,
        project_type: input.projectType ?? null,
        difficulty: input.difficulty ?? null,
        time_estimate: input.timeEstimate ?? null,
        tech_stack: input.techStack ? JSON.stringify(input.techStack) : null,
        gap_addressed: input.gapAddressed ?? null,
        description: input.description,
        core_features: input.coreFeatures ? JSON.stringify(input.coreFeatures) : null,
        tech_highlights: input.techHighlights ? JSON.stringify(input.techHighlights) : null,
        implementation_steps: input.implementationSteps ? JSON.stringify(input.implementationSteps) : null,
        resume_template: input.resumeTemplate ?? null,
        impact_score: input.impactScore ?? 7,
        source_url: input.sourceUrl ?? null,
        related_role: input.relatedRole ?? null,
        related_skills: input.relatedSkills ? JSON.stringify(input.relatedSkills) : null,
        related_trend_ids: input.relatedTrendIds ? JSON.stringify(input.relatedTrendIds) : null,
        github_url: input.githubUrl ?? null,
        stars: input.stars ?? null,
        forks: input.forks ?? null,
        language: input.language ?? null,
        category: input.category ?? null,
        learning_path: input.learningPath ?? null,
        is_interview_related:
          input.isInterviewRelated === undefined ? null : input.isInterviewRelated ? 1 : 0,
        tags: input.tags ? JSON.stringify(input.tags) : null,
        created_at: now,
      }
    },

    list: (filter: ListProjectFilter = {}): LearningProjectRow[] => {
      const where: string[] = []
      const params: (string | number)[] = []
      if (filter.projectType) {
        where.push('project_type = ?')
        params.push(filter.projectType)
      }
      if (filter.difficulty) {
        where.push('difficulty = ?')
        params.push(filter.difficulty)
      }
      if (filter.relatedRole) {
        where.push('related_role = ?')
        params.push(filter.relatedRole)
      }
      if (filter.language) {
        where.push('language = ?')
        params.push(filter.language)
      }
      if (filter.category) {
        where.push('category = ?')
        params.push(filter.category)
      }
      const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''
      return db
        .prepare(
          `SELECT * FROM learning_projects ${whereSql} ORDER BY impact_score DESC, COALESCE(stars,0) DESC, created_at DESC`,
        )
        .all(...params) as unknown as LearningProjectRow[]
    },

    getById: (id: string): LearningProjectRow | null => {
      const row = db
        .prepare('SELECT * FROM learning_projects WHERE id = ?')
        .get(id) as LearningProjectRow | undefined
      return row ?? null
    },

    listByIds: (ids: string[]): LearningProjectRow[] => {
      if (ids.length === 0) return []
      const placeholders = ids.map(() => '?').join(',')
      return db
        .prepare(`SELECT * FROM learning_projects WHERE id IN (${placeholders})`)
        .all(...ids) as unknown as LearningProjectRow[]
    },

    countAll: (): number => {
      const row = db.prepare('SELECT COUNT(*) AS cnt FROM learning_projects').get() as { cnt: number }
      return row.cnt
    },
  }
}
