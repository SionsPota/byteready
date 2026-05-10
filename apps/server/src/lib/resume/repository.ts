import type { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'

export interface ResumeRow {
  id: string
  owner_id: string
  title: string
  raw_text: string
  parsed_at: number | null
  source_format: string
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  contact_location: string | null
  summary: string | null
  educations: string | null
  experiences: string | null
  skills: string | null
  project_ids: string | null
  created_at: number
}

export interface ResumeProjectRow {
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
}

export interface ParsedResumeData {
  contact: { name: string | null; email: string | null; phone: string | null; location: string | null }
  summary: string | null
  educations: { school: string; major: string; degree: string; period: string }[]
  experiences: { company: string; title: string; period: string; description: string }[]
  skills: { name: string; level?: string }[]
  projects: { name: string; period?: string; role?: string; summary?: string; keywords?: string[] }[]
}

export interface CreateResumeInput {
  ownerId: string
  title: string
  rawText: string
  sourceFormat: string
  parsedData?: ParsedResumeData
}

export interface UpdateProjectInput {
  name?: string
  period?: string | null
  role?: string | null
  summary?: string | null
  keywords?: string[] | null
}

export interface UpdateResumeInput {
  title?: string
  contact_name?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  contact_location?: string | null
  summary?: string | null
  educations?: { school: string; major: string; degree: string; period: string }[] | null
  experiences?: { company: string; title: string; period: string; description: string }[] | null
  skills?: { name: string; level?: string }[] | null
  project_ids?: string[] | null
}

export const createResumeRepository = (db: DatabaseSync) => {
  return {
    create: (input: CreateResumeInput, projects: { name: string; period?: string; role?: string; summary?: string; keywords?: string[] }[]): ResumeRow => {
      const id = randomUUID()
      const now = Date.now()
      const parsed = input.parsedData

      // 插入 resumes（含全部结构化字段）
      db.prepare(
        `INSERT INTO resumes (
          id, owner_id, title, raw_text, parsed_at, source_format,
          contact_name, contact_email, contact_phone, contact_location,
          summary, educations, experiences, skills, project_ids, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id, input.ownerId, input.title, input.rawText, now, input.sourceFormat,
        parsed?.contact.name ?? null,
        parsed?.contact.email ?? null,
        parsed?.contact.phone ?? null,
        parsed?.contact.location ?? null,
        parsed?.summary ?? null,
        parsed?.educations.length ? JSON.stringify(parsed.educations) : null,
        parsed?.experiences.length ? JSON.stringify(parsed.experiences) : null,
        parsed?.skills.length ? JSON.stringify(parsed.skills) : null,
        null, // project_ids 在下方更新
        now
      )

      // 插入 projects 表并收集 id
      const projectIds: string[] = []
      for (const p of projects) {
        const pid = randomUUID()
        db.prepare(
          'INSERT INTO projects (id, owner_id, name, period, role, summary, keywords, source, source_resume_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(
          pid, input.ownerId, p.name, p.period ?? null, p.role ?? null, p.summary ?? null,
          p.keywords ? JSON.stringify(p.keywords) : null, 'resume', id, now, now
        )
        projectIds.push(pid)
      }

      // 更新 resume 的 project_ids
      if (projectIds.length > 0) {
        db.prepare('UPDATE resumes SET project_ids = ? WHERE id = ?')
          .run(JSON.stringify(projectIds), id)
      }

      return {
        id,
        owner_id: input.ownerId,
        title: input.title,
        raw_text: input.rawText,
        parsed_at: now,
        source_format: input.sourceFormat,
        contact_name: parsed?.contact.name ?? null,
        contact_email: parsed?.contact.email ?? null,
        contact_phone: parsed?.contact.phone ?? null,
        contact_location: parsed?.contact.location ?? null,
        summary: parsed?.summary ?? null,
        educations: parsed?.educations.length ? JSON.stringify(parsed.educations) : null,
        experiences: parsed?.experiences.length ? JSON.stringify(parsed.experiences) : null,
        skills: parsed?.skills.length ? JSON.stringify(parsed.skills) : null,
        project_ids: projectIds.length > 0 ? JSON.stringify(projectIds) : null,
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

      // 从 projects 表查询关联项目
      let projects: ResumeProjectRow[] = []
      if (row.project_ids) {
        try {
          const ids = JSON.parse(row.project_ids) as string[]
          if (ids.length > 0) {
            const placeholders = ids.map(() => '?').join(',')
            projects = db.prepare(
              `SELECT * FROM projects WHERE id IN (${placeholders}) ORDER BY created_at ASC`
            ).all(...ids) as unknown as ResumeProjectRow[]
          }
        } catch {
          projects = []
        }
      }
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
      db.prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`).run(...values)
      return true
    },

    update: (id: string, patch: UpdateResumeInput): boolean => {
      const sets: string[] = []
      const values: (string | null)[] = []

      if (patch.title !== undefined) { sets.push('title = ?'); values.push(patch.title) }
      if (patch.contact_name !== undefined) { sets.push('contact_name = ?'); values.push(patch.contact_name) }
      if (patch.contact_email !== undefined) { sets.push('contact_email = ?'); values.push(patch.contact_email) }
      if (patch.contact_phone !== undefined) { sets.push('contact_phone = ?'); values.push(patch.contact_phone) }
      if (patch.contact_location !== undefined) { sets.push('contact_location = ?'); values.push(patch.contact_location) }
      if (patch.summary !== undefined) { sets.push('summary = ?'); values.push(patch.summary) }
      if (patch.educations !== undefined) { sets.push('educations = ?'); values.push(patch.educations ? JSON.stringify(patch.educations) : null) }
      if (patch.experiences !== undefined) { sets.push('experiences = ?'); values.push(patch.experiences ? JSON.stringify(patch.experiences) : null) }
      if (patch.skills !== undefined) { sets.push('skills = ?'); values.push(patch.skills ? JSON.stringify(patch.skills) : null) }
      if (patch.project_ids !== undefined) { sets.push('project_ids = ?'); values.push(patch.project_ids ? JSON.stringify(patch.project_ids) : null) }

      if (sets.length === 0) return false

      values.push(id)
      db.prepare(`UPDATE resumes SET ${sets.join(', ')} WHERE id = ?`).run(...values)
      return true
    },

    reparse: (id: string, rawText: string, projects: { name: string; period?: string; role?: string; summary?: string; keywords?: string[] }[], ownerId: string, parsedData?: ParsedResumeData): boolean => {
      const now = Date.now()

      // 删除旧的项目关联
      db.prepare('UPDATE projects SET source_resume_id = NULL WHERE source_resume_id = ?').run(id)

      // 插入新项目
      const projectIds: string[] = []
      for (const p of projects) {
        const pid = randomUUID()
        db.prepare(
          'INSERT INTO projects (id, owner_id, name, period, role, summary, keywords, source, source_resume_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(
          pid, ownerId, p.name, p.period ?? null, p.role ?? null, p.summary ?? null,
          p.keywords ? JSON.stringify(p.keywords) : null, 'resume', id, now, now
        )
        projectIds.push(pid)
      }

      // 更新 resume（含全部结构化字段）
      const parsed = parsedData
      db.prepare(
        `UPDATE resumes SET
          raw_text = ?, parsed_at = ?, project_ids = ?,
          contact_name = ?, contact_email = ?, contact_phone = ?, contact_location = ?,
          summary = ?, educations = ?, experiences = ?, skills = ?
        WHERE id = ?`
      ).run(
        rawText,
        now,
        projectIds.length > 0 ? JSON.stringify(projectIds) : null,
        parsed?.contact.name ?? null,
        parsed?.contact.email ?? null,
        parsed?.contact.phone ?? null,
        parsed?.contact.location ?? null,
        parsed?.summary ?? null,
        parsed?.educations.length ? JSON.stringify(parsed.educations) : null,
        parsed?.experiences.length ? JSON.stringify(parsed.experiences) : null,
        parsed?.skills.length ? JSON.stringify(parsed.skills) : null,
        id
      )

      return true
    },

    delete: (id: string): boolean => {
      const result = db.prepare('DELETE FROM resumes WHERE id = ?').run(id)
      return (result.changes ?? 0) > 0
    },

    getProject: (projectId: string): ResumeProjectRow | null => {
      const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as ResumeProjectRow | undefined
      return row ?? null
    },
  }
}
