import type { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'
import type { TagRow } from './tags.repository.ts'

export type ExperienceResult = 'passed' | 'failed' | 'pending' | 'ghosted'

export interface ExperienceRow {
  id: string
  company_id: string | null
  title: string
  company: string | null
  position: string | null
  content: string | null
  source: string | null
  source_url: string | null
  difficulty: number | null
  result: ExperienceResult | null
  interview_date: number | null
  view_count: number
  interview_round: string | null
  interview_type: string | null
  answer_key_points: string | null
  related_trend_ids: string | null
  related_project_ids: string | null
  created_at: number
}

export interface ExperienceWithCompany extends ExperienceRow {
  company_name: string | null
  company_color: string | null
}

export interface CreateExperienceInput {
  companyId?: string
  title: string
  company?: string
  position?: string
  content?: string
  source?: string
  sourceUrl?: string
  difficulty?: number
  result?: ExperienceResult
  interviewDate?: number
  tagIds?: string[]
  interviewRound?: string
  interviewType?: string
  answerKeyPoints?: string
  relatedTrendIds?: string[]
  relatedProjectIds?: string[]
}

export interface ListExperienceFilter {
  companyId?: string
  tagIds?: string[]
  result?: ExperienceResult
  search?: string
  page?: number
  limit?: number
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

export const createExperienceRepository = (db: DatabaseSync) => {
  return {
    create: (input: CreateExperienceInput, idOverride?: string): ExperienceRow => {
      const id = idOverride ?? randomUUID()
      const now = Date.now()
      db.prepare(
        `INSERT INTO experiences (id, company_id, title, company, position, content, source, source_url, difficulty, result, interview_date, view_count, interview_round, interview_type, answer_key_points, related_trend_ids, related_project_ids, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        input.companyId ?? null,
        input.title,
        input.company ?? null,
        input.position ?? null,
        input.content ?? null,
        input.source ?? null,
        input.sourceUrl ?? null,
        input.difficulty ?? null,
        input.result ?? null,
        input.interviewDate ?? null,
        input.interviewRound ?? null,
        input.interviewType ?? null,
        input.answerKeyPoints ?? null,
        input.relatedTrendIds ? JSON.stringify(input.relatedTrendIds) : null,
        input.relatedProjectIds ? JSON.stringify(input.relatedProjectIds) : null,
        now,
      )

      if (input.tagIds && input.tagIds.length > 0) {
        const stmt = db.prepare(
          'INSERT OR IGNORE INTO experience_tags (experience_id, tag_id) VALUES (?, ?)',
        )
        for (const tagId of input.tagIds) {
          stmt.run(id, tagId)
        }
      }

      return {
        id,
        company_id: input.companyId ?? null,
        title: input.title,
        company: input.company ?? null,
        position: input.position ?? null,
        content: input.content ?? null,
        source: input.source ?? null,
        source_url: input.sourceUrl ?? null,
        difficulty: input.difficulty ?? null,
        result: input.result ?? null,
        interview_date: input.interviewDate ?? null,
        view_count: 0,
        interview_round: input.interviewRound ?? null,
        interview_type: input.interviewType ?? null,
        answer_key_points: input.answerKeyPoints ?? null,
        related_trend_ids: input.relatedTrendIds ? JSON.stringify(input.relatedTrendIds) : null,
        related_project_ids: input.relatedProjectIds ? JSON.stringify(input.relatedProjectIds) : null,
        created_at: now,
      }
    },

    list: (
      filter: ListExperienceFilter = {},
    ): {
      items: (ExperienceWithCompany & { tags: TagRow[] })[]
      total: number
    } => {
      const where: string[] = []
      const params: (string | number)[] = []

      if (filter.companyId) {
        where.push('e.company_id = ?')
        params.push(filter.companyId)
      }
      if (filter.result) {
        where.push('e.result = ?')
        params.push(filter.result)
      }
      if (filter.search) {
        where.push('(e.title LIKE ? OR e.content LIKE ? OR e.position LIKE ? OR e.answer_key_points LIKE ?)')
        const like = `%${filter.search}%`
        params.push(like, like, like, like)
      }
      if (filter.tagIds && filter.tagIds.length > 0) {
        const placeholders = filter.tagIds.map(() => '?').join(',')
        where.push(
          `e.id IN (SELECT experience_id FROM experience_tags WHERE tag_id IN (${placeholders}) GROUP BY experience_id HAVING COUNT(DISTINCT tag_id) = ?)`,
        )
        params.push(...filter.tagIds, filter.tagIds.length)
      }
      const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''

      const totalRow = db
        .prepare(`SELECT COUNT(*) AS cnt FROM experiences e ${whereSql}`)
        .get(...params) as { cnt: number }

      const limit = Math.max(1, Math.min(filter.limit ?? 20, 100))
      const offset = Math.max(0, ((filter.page ?? 1) - 1) * limit)

      const rows = db
        .prepare(
          `SELECT e.*, cp.name AS company_name, cp.color AS company_color
           FROM experiences e
           LEFT JOIN company_profiles cp ON cp.id = e.company_id
           ${whereSql}
           ORDER BY e.created_at DESC
           LIMIT ? OFFSET ?`,
        )
        .all(...params, limit, offset) as unknown as ExperienceWithCompany[]

      const ids = rows.map((r) => r.id)
      const tagsMap = new Map<string, TagRow[]>()
      if (ids.length > 0) {
        const placeholders = ids.map(() => '?').join(',')
        const tagRows = db
          .prepare(
            `SELECT et.experience_id, t.id, t.name, t.color, t.category, t.created_at
             FROM experience_tags et
             JOIN explore_tags t ON t.id = et.tag_id
             WHERE et.experience_id IN (${placeholders})`,
          )
          .all(...ids) as unknown as (TagRow & { experience_id: string })[]
        for (const tr of tagRows) {
          const list = tagsMap.get(tr.experience_id) ?? []
          list.push({
            id: tr.id,
            name: tr.name,
            color: tr.color,
            category: tr.category,
            created_at: tr.created_at,
          })
          tagsMap.set(tr.experience_id, list)
        }
      }

      return {
        items: rows.map((r) => ({ ...r, tags: tagsMap.get(r.id) ?? [] })),
        total: totalRow.cnt,
      }
    },

    getById: (
      id: string,
    ): (ExperienceWithCompany & { tags: TagRow[]; relatedTrendIds: string[]; relatedProjectIds: string[] }) | null => {
      const row = db
        .prepare(
          `SELECT e.*, cp.name AS company_name, cp.color AS company_color
           FROM experiences e
           LEFT JOIN company_profiles cp ON cp.id = e.company_id
           WHERE e.id = ?`,
        )
        .get(id) as ExperienceWithCompany | undefined
      if (!row) return null

      const tagRows = db
        .prepare(
          `SELECT t.id, t.name, t.color, t.category, t.created_at
           FROM experience_tags et
           JOIN explore_tags t ON t.id = et.tag_id
           WHERE et.experience_id = ?`,
        )
        .all(id) as unknown as TagRow[]

      return {
        ...row,
        tags: tagRows,
        relatedTrendIds: safeParseArr(row.related_trend_ids),
        relatedProjectIds: safeParseArr(row.related_project_ids),
      }
    },

    incrementViews: (id: string): void => {
      db.prepare('UPDATE experiences SET view_count = view_count + 1 WHERE id = ?').run(id)
    },

    countAll: (): number => {
      const row = db.prepare('SELECT COUNT(*) AS cnt FROM experiences').get() as { cnt: number }
      return row.cnt
    },
  }
}
