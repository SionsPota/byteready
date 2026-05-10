import type { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'

export interface ProjectRow {
  id: string
  owner_id: string
  name: string
  period: string | null
  role: string | null
  summary: string | null
  keywords: string | null
  source: string | null
  source_resume_id: string | null
  created_at: number
  updated_at: number
}

export interface CreateProjectInput {
  ownerId: string
  name: string
  period?: string
  role?: string
  summary?: string
  keywords?: string[]
  source?: string
  sourceResumeId?: string
}

export interface UpdateProjectInput {
  name?: string
  period?: string | null
  role?: string | null
  summary?: string | null
  keywords?: string[] | null
}

export const createProjectRepository = (db: DatabaseSync) => {
  return {
    create: (input: CreateProjectInput): ProjectRow => {
      const id = randomUUID()
      const now = Date.now()

      db.prepare(
        'INSERT INTO projects (id, owner_id, name, period, role, summary, keywords, source, source_resume_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(
        id,
        input.ownerId,
        input.name,
        input.period ?? null,
        input.role ?? null,
        input.summary ?? null,
        input.keywords ? JSON.stringify(input.keywords) : null,
        input.source ?? 'manual',
        input.sourceResumeId ?? null,
        now,
        now
      )

      return {
        id,
        owner_id: input.ownerId,
        name: input.name,
        period: input.period ?? null,
        role: input.role ?? null,
        summary: input.summary ?? null,
        keywords: input.keywords ? JSON.stringify(input.keywords) : null,
        source: input.source ?? 'manual',
        source_resume_id: input.sourceResumeId ?? null,
        created_at: now,
        updated_at: now,
      }
    },

    listByOwner: (ownerId: string): ProjectRow[] => {
      return db.prepare('SELECT * FROM projects WHERE owner_id = ? ORDER BY updated_at DESC')
        .all(ownerId) as unknown as ProjectRow[]
    },

    listByResumeId: (resumeId: string): ProjectRow[] => {
      return db.prepare('SELECT * FROM projects WHERE source_resume_id = ? ORDER BY created_at ASC')
        .all(resumeId) as unknown as ProjectRow[]
    },

    getById: (id: string): ProjectRow | null => {
      const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as ProjectRow | undefined
      return row ?? null
    },

    update: (id: string, patch: UpdateProjectInput): boolean => {
      const sets: string[] = []
      const values: (string | null)[] = []

      if (patch.name !== undefined) { sets.push('name = ?'); values.push(patch.name) }
      if (patch.period !== undefined) { sets.push('period = ?'); values.push(patch.period) }
      if (patch.role !== undefined) { sets.push('role = ?'); values.push(patch.role) }
      if (patch.summary !== undefined) { sets.push('summary = ?'); values.push(patch.summary) }
      if (patch.keywords !== undefined) { sets.push('keywords = ?'); values.push(patch.keywords ? JSON.stringify(patch.keywords) : null) }

      if (sets.length === 0) return false

      sets.push('updated_at = ?')
      values.push(String(Date.now()))
      values.push(id)

      db.prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`).run(...values)
      return true
    },

    delete: (id: string): boolean => {
      const result = db.prepare('DELETE FROM projects WHERE id = ?').run(id)
      return (result.changes ?? 0) > 0
    },
  }
}
