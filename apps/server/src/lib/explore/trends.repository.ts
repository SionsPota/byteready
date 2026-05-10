import type { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'

export interface IndustryTrendRow {
  id: string
  category: string
  title: string
  description: string
  key_points: string | null
  learning_advice: string | null
  source_url: string | null
  source_title: string | null
  related_skills: string | null
  related_role: string | null
  relevance_base: number
  related_project_ids: string | null
  market_impact: string | null
  interview_hotspots: string | null
  year: string | null
  tags: string | null
  created_at: number
}

export interface IndustryTrendDecoded {
  id: string
  category: string
  title: string
  description: string
  keyPoints: string[]
  learningAdvice: string | null
  sourceUrl: string | null
  sourceTitle: string | null
  relatedSkills: string[]
  relatedRole: string | null
  relevanceBase: number
  relatedProjectIds: string[]
  marketImpact: string | null
  interviewHotspots: string | null
  year: string | null
  tags: string[]
  createdAt: number
}

export interface CreateIndustryTrendInput {
  category: string
  title: string
  description: string
  keyPoints?: string[]
  learningAdvice?: string
  sourceUrl?: string
  sourceTitle?: string
  relatedSkills?: string[]
  relatedRole?: string
  relevanceBase?: number
  relatedProjectIds?: string[]
  marketImpact?: string
  interviewHotspots?: string
  year?: string
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

export const decodeIndustryTrend = (row: IndustryTrendRow): IndustryTrendDecoded => ({
  id: row.id,
  category: row.category,
  title: row.title,
  description: row.description,
  keyPoints: safeParseArr(row.key_points),
  learningAdvice: row.learning_advice,
  sourceUrl: row.source_url,
  sourceTitle: row.source_title,
  relatedSkills: safeParseArr(row.related_skills),
  relatedRole: row.related_role,
  relevanceBase: row.relevance_base,
  relatedProjectIds: safeParseArr(row.related_project_ids),
  marketImpact: row.market_impact,
  interviewHotspots: row.interview_hotspots,
  year: row.year,
  tags: safeParseArr(row.tags),
  createdAt: row.created_at,
})

export const createIndustryTrendRepository = (db: DatabaseSync) => {
  return {
    create: (input: CreateIndustryTrendInput, idOverride?: string): IndustryTrendRow => {
      const id = idOverride ?? randomUUID()
      const now = Date.now()
      db.prepare(
        `INSERT INTO industry_trends (id, category, title, description, key_points, learning_advice, source_url, source_title, related_skills, related_role, relevance_base, related_project_ids, market_impact, interview_hotspots, year, tags, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        input.category,
        input.title,
        input.description,
        input.keyPoints ? JSON.stringify(input.keyPoints) : null,
        input.learningAdvice ?? null,
        input.sourceUrl ?? null,
        input.sourceTitle ?? null,
        input.relatedSkills ? JSON.stringify(input.relatedSkills) : null,
        input.relatedRole ?? null,
        input.relevanceBase ?? 7,
        input.relatedProjectIds ? JSON.stringify(input.relatedProjectIds) : null,
        input.marketImpact ?? null,
        input.interviewHotspots ?? null,
        input.year ?? null,
        input.tags ? JSON.stringify(input.tags) : null,
        now,
      )
      return {
        id,
        category: input.category,
        title: input.title,
        description: input.description,
        key_points: input.keyPoints ? JSON.stringify(input.keyPoints) : null,
        learning_advice: input.learningAdvice ?? null,
        source_url: input.sourceUrl ?? null,
        source_title: input.sourceTitle ?? null,
        related_skills: input.relatedSkills ? JSON.stringify(input.relatedSkills) : null,
        related_role: input.relatedRole ?? null,
        relevance_base: input.relevanceBase ?? 7,
        related_project_ids: input.relatedProjectIds ? JSON.stringify(input.relatedProjectIds) : null,
        market_impact: input.marketImpact ?? null,
        interview_hotspots: input.interviewHotspots ?? null,
        year: input.year ?? null,
        tags: input.tags ? JSON.stringify(input.tags) : null,
        created_at: now,
      }
    },

    list: (): IndustryTrendRow[] => {
      return db
        .prepare('SELECT * FROM industry_trends ORDER BY relevance_base DESC, created_at DESC')
        .all() as unknown as IndustryTrendRow[]
    },

    getById: (id: string): IndustryTrendRow | null => {
      const row = db
        .prepare('SELECT * FROM industry_trends WHERE id = ?')
        .get(id) as IndustryTrendRow | undefined
      return row ?? null
    },

    listByIds: (ids: string[]): IndustryTrendRow[] => {
      if (ids.length === 0) return []
      const placeholders = ids.map(() => '?').join(',')
      return db
        .prepare(`SELECT * FROM industry_trends WHERE id IN (${placeholders})`)
        .all(...ids) as unknown as IndustryTrendRow[]
    },

    countAll: (): number => {
      const row = db.prepare('SELECT COUNT(*) AS cnt FROM industry_trends').get() as { cnt: number }
      return row.cnt
    },

    updateRelatedProjects: (id: string, projectIds: string[]): void => {
      db.prepare('UPDATE industry_trends SET related_project_ids = ? WHERE id = ?').run(
        JSON.stringify(projectIds),
        id,
      )
    },
  }
}
