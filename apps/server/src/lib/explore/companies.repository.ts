import type { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'

export interface CompanyRow {
  id: string
  name: string
  description: string | null
  interview_style: string | null
  positions: string | null
  tags: string | null
  logo: string | null
  industry: string | null
  color: string | null
  updated_at: number
}

export interface CompanyWithCount extends CompanyRow {
  experience_count: number
}

export interface CreateCompanyInput {
  name: string
  description?: string
  interviewStyle?: string
  positions?: string[]
  tags?: string[]
  logo?: string
  industry?: string
  color?: string
}

export const createCompanyRepository = (db: DatabaseSync) => {
  return {
    create: (input: CreateCompanyInput): CompanyRow => {
      const id = randomUUID()
      const now = Date.now()
      db.prepare(
        'INSERT INTO company_profiles (id, name, description, interview_style, positions, tags, logo, industry, color, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(
        id,
        input.name,
        input.description ?? null,
        input.interviewStyle ?? null,
        input.positions ? JSON.stringify(input.positions) : null,
        input.tags ? JSON.stringify(input.tags) : null,
        input.logo ?? null,
        input.industry ?? null,
        input.color ?? null,
        now,
      )
      return {
        id,
        name: input.name,
        description: input.description ?? null,
        interview_style: input.interviewStyle ?? null,
        positions: input.positions ? JSON.stringify(input.positions) : null,
        tags: input.tags ? JSON.stringify(input.tags) : null,
        logo: input.logo ?? null,
        industry: input.industry ?? null,
        color: input.color ?? null,
        updated_at: now,
      }
    },

    list: (): CompanyRow[] => {
      return db
        .prepare('SELECT * FROM company_profiles ORDER BY updated_at DESC')
        .all() as unknown as CompanyRow[]
    },

    listWithExperienceCount: (): CompanyWithCount[] => {
      return db
        .prepare(
          `SELECT cp.*, COUNT(e.id) AS experience_count
           FROM company_profiles cp
           LEFT JOIN experiences e ON e.company_id = cp.id
           GROUP BY cp.id
           ORDER BY cp.updated_at DESC`,
        )
        .all() as unknown as CompanyWithCount[]
    },

    getById: (id: string): CompanyRow | null => {
      const row = db
        .prepare('SELECT * FROM company_profiles WHERE id = ?')
        .get(id) as CompanyRow | undefined
      return row ?? null
    },

    countAll: (): number => {
      const row = db.prepare('SELECT COUNT(*) AS cnt FROM company_profiles').get() as { cnt: number }
      return row.cnt
    },
  }
}
