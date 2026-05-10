import type { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'

export interface TrendSnapshotRow {
  id: string
  owner_id: string
  axis: string
  value: number
  session_id: string
  created_at: number
}

export const createTrendRepository = (db: DatabaseSync) => {
  return {
    createSnapshots: (ownerId: string, sessionId: string, scores: { axis: string; value: number }[]): void => {
      const now = Date.now()
      const insert = db.prepare('INSERT INTO trend_snapshots (id, owner_id, axis, value, session_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      for (const s of scores) {
        insert.run(randomUUID(), ownerId, s.axis, s.value, sessionId, now)
      }
    },

    listByOwner: (ownerId: string, opts?: { axis?: string; since?: number; limit?: number }): TrendSnapshotRow[] => {
      const conditions = ['owner_id = ?']
      const values: (string | number)[] = [ownerId]
      if (opts?.axis) { conditions.push('axis = ?'); values.push(opts.axis) }
      if (opts?.since) { conditions.push('created_at >= ?'); values.push(opts.since) }

      const sql = `SELECT * FROM trend_snapshots WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC${opts?.limit ? ' LIMIT ?' : ''}`
      if (opts?.limit) values.push(opts.limit)
      return db.prepare(sql).all(...values) as unknown as TrendSnapshotRow[]
    },

    getAveragesByAxis: (ownerId: string, opts?: { since?: number }): { axis: string; avg: number; count: number }[] => {
      const conditions = ['owner_id = ?']
      const values: (string | number)[] = [ownerId]
      if (opts?.since) { conditions.push('created_at >= ?'); values.push(opts.since) }

      const sql = `SELECT axis, AVG(value) as avg, COUNT(*) as count FROM trend_snapshots WHERE ${conditions.join(' AND ')} GROUP BY axis`
      return db.prepare(sql).all(...values) as unknown as { axis: string; avg: number; count: number }[]
    },
  }
}
