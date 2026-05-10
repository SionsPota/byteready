import type { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'

export interface InterviewSessionRow {
  id: string
  owner_id: string
  position: string
  level: string
  target_company: string | null
  resume_id: string | null
  status: string
  started_at: number | null
  ended_at: number | null
  created_at: number
}

export interface TurnRow {
  id: string
  session_id: string
  index: number
  kind: string
  question_id: string | null
  text: string
  audio_meta: string | null
  created_at: number
}

export interface CreateSessionInput {
  ownerId: string
  position: string
  level: string
  targetCompany?: string
  resumeId?: string
}

export interface CreateTurnInput {
  sessionId: string
  index: number
  kind: string
  questionId?: string | null
  text: string
  audioMeta?: string | null
}

export const createInterviewRepository = (db: DatabaseSync) => {
  return {
    createSession: (input: CreateSessionInput): InterviewSessionRow => {
      const id = randomUUID()
      const now = Date.now()
      db.prepare(
        'INSERT INTO interview_sessions (id, owner_id, position, level, target_company, resume_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(id, input.ownerId, input.position, input.level, input.targetCompany ?? null, input.resumeId ?? null, 'pending', now)

      return {
        id, owner_id: input.ownerId, position: input.position, level: input.level,
        target_company: input.targetCompany ?? null, resume_id: input.resumeId ?? null,
        status: 'pending', started_at: null, ended_at: null, created_at: now,
      }
    },

    listByOwner: (ownerId: string): InterviewSessionRow[] => {
      return db.prepare('SELECT * FROM interview_sessions WHERE owner_id = ? ORDER BY created_at DESC')
        .all(ownerId) as unknown as InterviewSessionRow[]
    },

    getById: (id: string): (InterviewSessionRow & { turns: TurnRow[] }) | null => {
      const row = db.prepare('SELECT * FROM interview_sessions WHERE id = ?').get(id) as InterviewSessionRow | undefined
      if (!row) return null
      const turns = db.prepare('SELECT * FROM turns WHERE session_id = ? ORDER BY "index" ASC').all(id) as unknown as TurnRow[]
      return { ...row, turns }
    },

    start: (id: string): void => {
      db.prepare('UPDATE interview_sessions SET status = ?, started_at = ? WHERE id = ?')
        .run('running', Date.now(), id)
    },

    end: (id: string): void => {
      db.prepare('UPDATE interview_sessions SET status = ?, ended_at = ? WHERE id = ?')
        .run('ended', Date.now(), id)
    },

    createTurn: (input: CreateTurnInput): TurnRow => {
      const id = randomUUID()
      const now = Date.now()
      db.prepare(
        'INSERT INTO turns (id, session_id, "index", kind, question_id, text, audio_meta, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(id, input.sessionId, input.index, input.kind, input.questionId ?? null, input.text, input.audioMeta ?? null, now)
      return { id, session_id: input.sessionId, index: input.index, kind: input.kind, question_id: input.questionId ?? null, text: input.text, audio_meta: input.audioMeta ?? null, created_at: now }
    },

    getMaxTurnIndex: (sessionId: string): number => {
      const row = db.prepare('SELECT MAX("index") as max_idx FROM turns WHERE session_id = ?').get(sessionId) as { max_idx: number | null } | undefined
      return row?.max_idx ?? -1
    },

    delete: (id: string): boolean => {
      const result = db.prepare('DELETE FROM interview_sessions WHERE id = ?').run(id)
      return (result.changes ?? 0) > 0
    },
  }
}
