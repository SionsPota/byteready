import type { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'

export interface ResumeRow {
  id: string
  owner_id: string
  title: string
  raw_text: string
  parsed_at: number | null
  source_format: string
  created_at: number
}

export interface ResumeProjectRow {
  id: string
  resume_id: string
  name: string
  period: string | null
  role: string | null
  summary: string | null
  keywords: string | null
  order: number
  created_at: number
}

export interface CreateResumeInput {
  ownerId: string
  title: string
  rawText: string
  sourceFormat: string
}

export interface UpdateProjectInput {
  name?: string
  period?: string | null
  role?: string | null
  summary?: string | null
  keywords?: string[] | null
}

export const createResumeRepository = (db: DatabaseSync) => {
  return {
    create: (input: CreateResumeInput, projects: { name: string; period?: string; role?: string; summary?: string; keywords?: string[] }[]): ResumeRow => {
      const id = randomUUID()
      const now = Date.now()

      db.prepare('INSERT INTO resumes (id, owner_id, title, raw_text, parsed_at, source_format, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(id, input.ownerId, input.title, input.rawText, now, input.sourceFormat, now)

      let i = 0
      for (const p of projects) {
        db.prepare(
          'INSERT INTO resume_projects (id, resume_id, name, period, role, summary, keywords, "order", created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(
          randomUUID(), id, p.name, p.period ?? null, p.role ?? null, p.summary ?? null,
          p.keywords ? JSON.stringify(p.keywords) : null, i, now
        )
        i++
      }

      return {
        id,
        owner_id: input.ownerId,
        title: input.title,
        raw_text: input.rawText,
        parsed_at: now,
        source_format: input.sourceFormat,
        created_at: now,
      }
    },

    listByOwner: (ownerId: string): ResumeRow[] => {
      const rows = db.prepare('SELECT * FROM resumes WHERE owner_id = ? ORDER BY created_at DESC').all(ownerId) as unknown as ResumeRow[]
      return rows
    },

    getById: (id: string): (ResumeRow & { projects: ResumeProjectRow[] }) | null => {
      const row = db.prepare('SELECT * FROM resumes WHERE id = ?').get(id) as ResumeRow | undefined
      if (!row) return null

      const projects = db.prepare('SELECT * FROM resume_projects WHERE resume_id = ? ORDER BY "order" ASC').all(id) as unknown as ResumeProjectRow[]
      return { ...row, projects }
    },

    updateProject: (projectId: string, patch: UpdateProjectInput): boolean => {
      const sets: string[] = []
      const values: (string | null)[] = []

      if (patch.name !== undefined) { sets.push('name = ?'); values.push(patch.name) }
      if (patch.period !== undefined) { sets.push('period = ?'); values.push(patch.period) }
      if (patch.role !== undefined) { sets.push('role = ?'); values.push(patch.role) }
      if (patch.summary !== undefined) { sets.push('summary = ?'); values.push(patch.summary) }
      if (patch.keywords !== undefined) { sets.push('keywords = ?'); values.push(patch.keywords ? JSON.stringify(patch.keywords) : null) }

      if (sets.length === 0) return false

      values.push(projectId)
      db.prepare(`UPDATE resume_projects SET ${sets.join(', ')} WHERE id = ?`).run(...values)
      return true
    },

    delete: (id: string): boolean => {
      const result = db.prepare('DELETE FROM resumes WHERE id = ?').run(id)
      return (result.changes ?? 0) > 0
    },

    getProject: (projectId: string): ResumeProjectRow | null => {
      const row = db.prepare('SELECT * FROM resume_projects WHERE id = ?').get(projectId) as ResumeProjectRow | undefined
      return row ?? null
    },
  }
}
