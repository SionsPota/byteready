import type { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'

export interface FullReviewRow {
  id: string
  session_id: string
  phase_review_ids: string | null
  phase_scores_summary: string | null
  coherence_score: number | null
  jd_match_score: number | null
  overall_persona: string | null
  consolidated_improvements: string | null
  overall_evaluation: string
  overall_score: number | null
  generated_at: number
  created_at: number
}

export interface PhaseScoreSummary {
  phaseType: string
  score: number
  duration: number
}

export interface ConsolidatedImprovement {
  priority: 'high' | 'medium' | 'low'
  sourcePhases: string[]
  suggestion: string
}

export interface CreateFullReviewInput {
  sessionId: string
  phaseReviewIds: string[]
  phaseScoresSummary: PhaseScoreSummary[]
  coherenceScore?: number
  jdMatchScore?: number
  overallPersona?: string
  consolidatedImprovements: ConsolidatedImprovement[]
  overallEvaluation: string
  overallScore?: number
}

export const createFullReviewRepository = (db: DatabaseSync) => {
  return {
    create: (input: CreateFullReviewInput): FullReviewRow => {
      const id = randomUUID()
      const now = Date.now()

      db.prepare(
        `INSERT INTO full_reviews (
          id, session_id, phase_review_ids, phase_scores_summary,
          coherence_score, jd_match_score, overall_persona,
          consolidated_improvements, overall_evaluation, overall_score,
          generated_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id, input.sessionId,
        JSON.stringify(input.phaseReviewIds),
        JSON.stringify(input.phaseScoresSummary),
        input.coherenceScore ?? null,
        input.jdMatchScore ?? null,
        input.overallPersona ?? null,
        JSON.stringify(input.consolidatedImprovements),
        input.overallEvaluation,
        input.overallScore ?? null,
        now, now
      )

      return {
        id, session_id: input.sessionId,
        phase_review_ids: JSON.stringify(input.phaseReviewIds),
        phase_scores_summary: JSON.stringify(input.phaseScoresSummary),
        coherence_score: input.coherenceScore ?? null,
        jd_match_score: input.jdMatchScore ?? null,
        overall_persona: input.overallPersona ?? null,
        consolidated_improvements: JSON.stringify(input.consolidatedImprovements),
        overall_evaluation: input.overallEvaluation,
        overall_score: input.overallScore ?? null,
        generated_at: now, created_at: now,
      }
    },

    getBySessionId: (sessionId: string): FullReviewRow | null => {
      return db.prepare('SELECT * FROM full_reviews WHERE session_id = ?').get(sessionId) as FullReviewRow | undefined ?? null
    },

    getById: (id: string): FullReviewRow | null => {
      return db.prepare('SELECT * FROM full_reviews WHERE id = ?').get(id) as FullReviewRow | undefined ?? null
    },
  }
}
