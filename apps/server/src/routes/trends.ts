import { Hono } from 'hono'
import { ok } from '@byteready/shared'
import { requireAuth } from '../lib/auth/middleware.ts'
import { getDb } from '../lib/db/client.ts'

export const trendsRoute = new Hono()
trendsRoute.use('*', requireAuth)

interface TrendPoint {
  sessionId: string
  value: number
  createdAt: number
}

type TrendSeries = Record<string, TrendPoint[]>

interface PhaseReviewJoinRow {
  session_id: string
  phase_type: string
  scores: string | null
  generated_at: number
}

interface FullReviewJoinRow {
  session_id: string
  overall_score: number | null
  coherence_score: number | null
  jd_match_score: number | null
  generated_at: number
}

interface ScoreEntry {
  dimension: string
  score: number
}

// GET /api/trends/phase?phaseType=self_intro|project_qa|random_qa
// 派生自 phase_reviews：按维度分组的时间序列
trendsRoute.get('/phase', (c) => {
  const userId = c.get('userId' as never) as string
  const phaseType = c.req.query('phaseType')

  const db = getDb()
  const conditions = ['ts.owner_id = ?']
  const values: (string | number)[] = [userId]
  if (phaseType) {
    conditions.push('pr.phase_type = ?')
    values.push(phaseType)
  }

  const rows = db
    .prepare(
      `SELECT pr.session_id, pr.phase_type, pr.scores, pr.generated_at
       FROM phase_reviews pr
       JOIN training_sessions ts ON ts.id = pr.session_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY pr.generated_at ASC`,
    )
    .all(...values) as unknown as PhaseReviewJoinRow[]

  const series: TrendSeries = {}
  for (const row of rows) {
    if (!row.scores) continue
    let scores: ScoreEntry[]
    try {
      scores = JSON.parse(row.scores) as ScoreEntry[]
    } catch {
      continue
    }
    for (const s of scores) {
      if (!s.dimension || typeof s.score !== 'number') continue
      const list = series[s.dimension] ?? []
      list.push({
        sessionId: row.session_id,
        value: s.score,
        createdAt: row.generated_at,
      })
      series[s.dimension] = list
    }
  }

  return c.json(ok(series))
})

// GET /api/trends/full
// 派生自 full_reviews：overall_score / coherence_score / jd_match_score 三个指标的时间序列
trendsRoute.get('/full', (c) => {
  const userId = c.get('userId' as never) as string
  const db = getDb()

  const rows = db
    .prepare(
      `SELECT fr.session_id, fr.overall_score, fr.coherence_score, fr.jd_match_score, fr.generated_at
       FROM full_reviews fr
       JOIN training_sessions ts ON ts.id = fr.session_id
       WHERE ts.owner_id = ?
       ORDER BY fr.generated_at ASC`,
    )
    .all(userId) as unknown as FullReviewJoinRow[]

  const series: TrendSeries = {
    overall_score: [],
    coherence_score: [],
    jd_match_score: [],
  }

  for (const row of rows) {
    if (row.overall_score !== null) {
      series.overall_score!.push({ sessionId: row.session_id, value: row.overall_score, createdAt: row.generated_at })
    }
    if (row.coherence_score !== null) {
      series.coherence_score!.push({ sessionId: row.session_id, value: row.coherence_score, createdAt: row.generated_at })
    }
    if (row.jd_match_score !== null) {
      series.jd_match_score!.push({ sessionId: row.session_id, value: row.jd_match_score, createdAt: row.generated_at })
    }
  }

  return c.json(ok(series))
})
