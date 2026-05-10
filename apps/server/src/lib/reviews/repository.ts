import type { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'

export interface ReviewReportRow {
  id: string
  session_id: string
  overall_text: string
  generated_at: number
  llm_meta: string | null
  created_at: number
}

export interface ScoreRow {
  id: string
  report_id: string
  axis: string
  value: number
  evidence: string | null
  created_at: number
}

export interface PerQuestionReview {
  questionId: string
  questionText: string
  yourSummary: string
  keyGaps: string[]
  improvements: string[]
}

export interface CreateReviewInput {
  sessionId: string
  overallText: string
  llmMeta?: Record<string, unknown>
  scores: { axis: string; value: number; evidence?: string }[]
  perQuestions?: PerQuestionReview[]
}

export const createReviewRepository = (db: DatabaseSync) => {
  return {
    create: (input: CreateReviewInput): ReviewReportRow => {
      const id = randomUUID()
      const now = Date.now()

      db.prepare(
        'INSERT INTO review_reports (id, session_id, overall_text, generated_at, llm_meta, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(id, input.sessionId, input.overallText, now, input.llmMeta ? JSON.stringify(input.llmMeta) : null, now)

      for (const s of input.scores) {
        db.prepare(
          'INSERT INTO scores (id, report_id, axis, value, evidence, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(randomUUID(), id, s.axis, s.value, s.evidence ?? null, now)
      }

      return {
        id,
        session_id: input.sessionId,
        overall_text: input.overallText,
        generated_at: now,
        llm_meta: input.llmMeta ? JSON.stringify(input.llmMeta) : null,
        created_at: now,
      }
    },

    getBySessionId: (sessionId: string): (ReviewReportRow & { scores: ScoreRow[] }) | null => {
      const row = db.prepare('SELECT * FROM review_reports WHERE session_id = ?').get(sessionId) as ReviewReportRow | undefined
      if (!row) return null
      const scores = db.prepare('SELECT * FROM scores WHERE report_id = ?').all(row.id) as unknown as ScoreRow[]
      return { ...row, scores }
    },

    getById: (id: string): (ReviewReportRow & { scores: ScoreRow[] }) | null => {
      const row = db.prepare('SELECT * FROM review_reports WHERE id = ?').get(id) as ReviewReportRow | undefined
      if (!row) return null
      const scores = db.prepare('SELECT * FROM scores WHERE report_id = ?').all(row.id) as unknown as ScoreRow[]
      return { ...row, scores }
    },
  }
}
