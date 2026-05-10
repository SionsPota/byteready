import type { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'

export interface PhaseTrendSnapshotRow {
  id: string
  owner_id: string
  phase_type: string
  dimension: string
  score: number
  session_id: string
  phase_review_id: string
  created_at: number
}

export interface FullTrendSnapshotRow {
  id: string
  owner_id: string
  metric: string
  value: number
  session_id: string
  full_review_id: string
  created_at: number
}

export const createV3TrendRepository = (db: DatabaseSync) => {
  return {
    // 阶段级趋势
    createPhaseSnapshots: (
      ownerId: string,
      sessionId: string,
      phaseReviewId: string,
      phaseType: string,
      scores: { dimension: string; score: number }[]
    ): void => {
      const now = Date.now()
      const insert = db.prepare(
        'INSERT INTO phase_trend_snapshots (id, owner_id, phase_type, dimension, score, session_id, phase_review_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      )
      for (const s of scores) {
        insert.run(randomUUID(), ownerId, phaseType, s.dimension, s.score, sessionId, phaseReviewId, now)
      }
    },

    listPhaseTrends: (
      ownerId: string,
      opts?: { phaseType?: string; dimension?: string; since?: number; limit?: number }
    ): PhaseTrendSnapshotRow[] => {
      const conditions = ['owner_id = ?']
      const values: (string | number)[] = [ownerId]
      if (opts?.phaseType) { conditions.push('phase_type = ?'); values.push(opts.phaseType) }
      if (opts?.dimension) { conditions.push('dimension = ?'); values.push(opts.dimension) }
      if (opts?.since) { conditions.push('created_at >= ?'); values.push(opts.since) }

      const sql = `SELECT * FROM phase_trend_snapshots WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC${opts?.limit ? ' LIMIT ?' : ''}`
      if (opts?.limit) values.push(opts.limit)
      return db.prepare(sql).all(...values) as unknown as PhaseTrendSnapshotRow[]
    },

    getPhaseAverages: (
      ownerId: string,
      opts?: { phaseType?: string; since?: number }
    ): { phase_type: string; dimension: string; avg: number; count: number }[] => {
      const conditions = ['owner_id = ?']
      const values: (string | number)[] = [ownerId]
      if (opts?.phaseType) { conditions.push('phase_type = ?'); values.push(opts.phaseType) }
      if (opts?.since) { conditions.push('created_at >= ?'); values.push(opts.since) }

      const sql = `SELECT phase_type, dimension, AVG(score) as avg, COUNT(*) as count FROM phase_trend_snapshots WHERE ${conditions.join(' AND ')} GROUP BY phase_type, dimension`
      return db.prepare(sql).all(...values) as unknown as { phase_type: string; dimension: string; avg: number; count: number }[]
    },

    // 整面级趋势
    createFullSnapshots: (
      ownerId: string,
      sessionId: string,
      fullReviewId: string,
      metrics: { metric: string; value: number }[]
    ): void => {
      const now = Date.now()
      const insert = db.prepare(
        'INSERT INTO full_trend_snapshots (id, owner_id, metric, value, session_id, full_review_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      for (const m of metrics) {
        insert.run(randomUUID(), ownerId, m.metric, m.value, sessionId, fullReviewId, now)
      }
    },

    listFullTrends: (
      ownerId: string,
      opts?: { metric?: string; since?: number; limit?: number }
    ): FullTrendSnapshotRow[] => {
      const conditions = ['owner_id = ?']
      const values: (string | number)[] = [ownerId]
      if (opts?.metric) { conditions.push('metric = ?'); values.push(opts.metric) }
      if (opts?.since) { conditions.push('created_at >= ?'); values.push(opts.since) }

      const sql = `SELECT * FROM full_trend_snapshots WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC${opts?.limit ? ' LIMIT ?' : ''}`
      if (opts?.limit) values.push(opts.limit)
      return db.prepare(sql).all(...values) as unknown as FullTrendSnapshotRow[]
    },

    getFullAverages: (
      ownerId: string,
      opts?: { since?: number }
    ): { metric: string; avg: number; count: number }[] => {
      const conditions = ['owner_id = ?']
      const values: (string | number)[] = [ownerId]
      if (opts?.since) { conditions.push('created_at >= ?'); values.push(opts.since) }

      const sql = `SELECT metric, AVG(value) as avg, COUNT(*) as count FROM full_trend_snapshots WHERE ${conditions.join(' AND ')} GROUP BY metric`
      return db.prepare(sql).all(...values) as unknown as { metric: string; avg: number; count: number }[]
    },
  }
}
