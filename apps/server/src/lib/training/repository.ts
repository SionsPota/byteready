import type { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'

export type TrainingType = 'full' | 'self_intro' | 'project_qa' | 'random_qa'
export type TrainingStatus = 'pending' | 'running' | 'ended'
export type TrainingState =
  | 'IDLE'
  | 'SELF_INTRO'
  | 'PROJECT_SINGLE_1'
  | 'PROJECT_SINGLE_2'
  | 'PROJECT_CROSS'
  | 'QNA_TECH'
  | 'QNA_ALGO'
  | 'QNA_SCENE'
  | 'END'

export interface TrainingSessionRow {
  id: string
  owner_id: string
  type: string
  position: string
  target_company: string | null
  job_description: string | null
  persona_id: string | null
  resume_id: string | null
  project_ids: string | null
  status: string
  current_state: string | null
  current_phase: string | null
  context_summary: string | null
  parent_session_id: string | null
  projects_discussed: string | null
  topics_covered: string | null
  current_project_id: string | null
  current_topic: string | null
  started_at: number | null
  ended_at: number | null
  created_at: number
}

export interface TrainingTurnRow {
  id: string
  session_id: string
  index: number
  kind: string
  text: string
  audio_meta: string | null
  phase: string | null
  state: string | null
  project_id: string | null
  project_ids: string | null
  topic: string | null
  question_id: string | null
  created_at: number
}

export interface CreateSessionInput {
  ownerId: string
  type?: TrainingType
  position: string
  targetCompany?: string
  jobDescription?: string
  personaId?: string
  resumeId?: string
  projectIds?: string[]
  parentSessionId?: string
}

export interface CreateTurnInput {
  sessionId: string
  index: number
  kind: string
  text: string
  questionId?: string | null
  audioMeta?: string | null
  phase?: string | null
  state?: string | null
  projectId?: string | null
  projectIds?: string[] | null
  topic?: string | null
}

export interface UpdateStateInput {
  currentState?: TrainingState
  currentPhase?: string
  projectsDiscussed?: string[]
  topicsCovered?: string[]
  currentProjectId?: string | null
  currentTopic?: string | null
  contextSummary?: Record<string, unknown>
}

export const createTrainingRepository = (db: DatabaseSync) => {
  return {
    createSession: (input: CreateSessionInput): TrainingSessionRow => {
      const id = randomUUID()
      const now = Date.now()
      db.prepare(
        `INSERT INTO training_sessions (
          id, owner_id, type, position, target_company, job_description, persona_id,
          resume_id, project_ids, status, parent_session_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id, input.ownerId, input.type ?? 'full', input.position,
        input.targetCompany ?? null, input.jobDescription ?? null, input.personaId ?? null,
        input.resumeId ?? null, input.projectIds ? JSON.stringify(input.projectIds) : null,
        'pending', input.parentSessionId ?? null, now
      )

      return {
        id, owner_id: input.ownerId, type: input.type ?? 'full',
        position: input.position, target_company: input.targetCompany ?? null,
        job_description: input.jobDescription ?? null, persona_id: input.personaId ?? null,
        resume_id: input.resumeId ?? null, project_ids: input.projectIds ? JSON.stringify(input.projectIds) : null,
        status: 'pending', current_state: null, current_phase: null,
        context_summary: null, parent_session_id: input.parentSessionId ?? null,
        projects_discussed: null, topics_covered: null,
        current_project_id: null, current_topic: null,
        started_at: null, ended_at: null, created_at: now,
      }
    },

    listByOwner: (ownerId: string): TrainingSessionRow[] => {
      return db.prepare('SELECT * FROM training_sessions WHERE owner_id = ? ORDER BY created_at DESC')
        .all(ownerId) as unknown as TrainingSessionRow[]
    },

    getById: (id: string): (TrainingSessionRow & { turns: TrainingTurnRow[] }) | null => {
      const row = db.prepare('SELECT * FROM training_sessions WHERE id = ?').get(id) as TrainingSessionRow | undefined
      if (!row) return null
      const turns = db.prepare('SELECT * FROM training_turns WHERE session_id = ? ORDER BY "index" ASC').all(id) as unknown as TrainingTurnRow[]
      return { ...row, turns }
    },

    start: (id: string): void => {
      db.prepare('UPDATE training_sessions SET status = ?, started_at = ? WHERE id = ?')
        .run('running', Date.now(), id)
    },

    end: (id: string): void => {
      db.prepare('UPDATE training_sessions SET status = ?, ended_at = ? WHERE id = ?')
        .run('ended', Date.now(), id)
    },

    updateState: (id: string, input: UpdateStateInput): void => {
      const sets: string[] = []
      const values: (string | null)[] = []

      if (input.currentState !== undefined) { sets.push('current_state = ?'); values.push(input.currentState) }
      if (input.currentPhase !== undefined) { sets.push('current_phase = ?'); values.push(input.currentPhase) }
      if (input.projectsDiscussed !== undefined) { sets.push('projects_discussed = ?'); values.push(JSON.stringify(input.projectsDiscussed)) }
      if (input.topicsCovered !== undefined) { sets.push('topics_covered = ?'); values.push(JSON.stringify(input.topicsCovered)) }
      if (input.currentProjectId !== undefined) { sets.push('current_project_id = ?'); values.push(input.currentProjectId) }
      if (input.currentTopic !== undefined) { sets.push('current_topic = ?'); values.push(input.currentTopic) }
      if (input.contextSummary !== undefined) { sets.push('context_summary = ?'); values.push(JSON.stringify(input.contextSummary)) }

      if (sets.length === 0) return

      values.push(id)
      db.prepare(`UPDATE training_sessions SET ${sets.join(', ')} WHERE id = ?`).run(...values)
    },

    createTurn: (input: CreateTurnInput): TrainingTurnRow => {
      const id = randomUUID()
      const now = Date.now()
      db.prepare(
        'INSERT INTO training_turns (id, session_id, "index", kind, text, audio_meta, phase, state, project_id, project_ids, topic, question_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(
        id, input.sessionId, input.index, input.kind, input.text,
        input.audioMeta ?? null, input.phase ?? null, input.state ?? null,
        input.projectId ?? null, input.projectIds ? JSON.stringify(input.projectIds) : null,
        input.topic ?? null, input.questionId ?? null, now
      )
      return {
        id, session_id: input.sessionId, index: input.index, kind: input.kind,
        text: input.text, audio_meta: input.audioMeta ?? null,
        phase: input.phase ?? null, state: input.state ?? null,
        project_id: input.projectId ?? null,
        project_ids: input.projectIds ? JSON.stringify(input.projectIds) : null,
        topic: input.topic ?? null, question_id: input.questionId ?? null,
        created_at: now,
      }
    },

    getMaxTurnIndex: (sessionId: string): number => {
      const row = db.prepare('SELECT MAX("index") as max_idx FROM training_turns WHERE session_id = ?').get(sessionId) as { max_idx: number | null } | undefined
      return row?.max_idx ?? -1
    },

    delete: (id: string): boolean => {
      const result = db.prepare('DELETE FROM training_sessions WHERE id = ?').run(id)
      return (result.changes ?? 0) > 0
    },
  }
}
