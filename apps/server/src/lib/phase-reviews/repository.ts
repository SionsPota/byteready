import type { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'

export interface PhaseReviewRow {
  id: string
  session_id: string
  phase_type: string
  phase_index: number
  scores: string | null
  total_score: number | null
  evaluation: string
  interviewer_reflection: string
  improvement_suggestions: string | null
  rubric_version: string | null
  coach_version: string | null
  generated_at: number
  created_at: number
}

export interface ScoreEntry {
  dimension: string
  score: number
  weight: number
  weighted: number
}

export interface ImprovementEntry {
  priority: 'high' | 'medium' | 'low'
  suggestion: string
  relatedTurnIndex?: number
}

export interface CreatePhaseReviewInput {
  sessionId: string
  phaseType: 'self_intro' | 'project_qa' | 'random_qa'
  phaseIndex: number
  scores: ScoreEntry[]
  totalScore: number
  evaluation: string
  interviewerReflection: string
  improvementSuggestions: ImprovementEntry[]
  rubricVersion?: string
  coachVersion?: string
}

export const createPhaseReviewRepository = (db: DatabaseSync) => {
  return {
    create: (input: CreatePhaseReviewInput): PhaseReviewRow => {
      const id = randomUUID()
      const now = Date.now()

      db.prepare(
        `INSERT INTO phase_reviews (
          id, session_id, phase_type, phase_index, scores, total_score,
          evaluation, interviewer_reflection, improvement_suggestions,
          rubric_version, coach_version, generated_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id, input.sessionId, input.phaseType, input.phaseIndex,
        JSON.stringify(input.scores), input.totalScore,
        input.evaluation, input.interviewerReflection,
        JSON.stringify(input.improvementSuggestions),
        input.rubricVersion ?? null, input.coachVersion ?? null,
        now, now
      )

      return {
        id, session_id: input.sessionId, phase_type: input.phaseType,
        phase_index: input.phaseIndex, scores: JSON.stringify(input.scores),
        total_score: input.totalScore, evaluation: input.evaluation,
        interviewer_reflection: input.interviewerReflection,
        improvement_suggestions: JSON.stringify(input.improvementSuggestions),
        rubric_version: input.rubricVersion ?? null,
        coach_version: input.coachVersion ?? null,
        generated_at: now, created_at: now,
      }
    },

    listBySession: (sessionId: string): PhaseReviewRow[] => {
      return db.prepare(
        'SELECT * FROM phase_reviews WHERE session_id = ? ORDER BY phase_index ASC'
      ).all(sessionId) as unknown as PhaseReviewRow[]
    },

    getById: (id: string): PhaseReviewRow | null => {
      return db.prepare('SELECT * FROM phase_reviews WHERE id = ?').get(id) as PhaseReviewRow | undefined ?? null
    },

    deleteBySession: (sessionId: string): void => {
      db.prepare('DELETE FROM phase_reviews WHERE session_id = ?').run(sessionId)
    },
  }
}
