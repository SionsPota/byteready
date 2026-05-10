import type { DatabaseSync } from 'node:sqlite'

export interface QuestionRow {
  id: string
  position: string
  level: string
  category: string
  main_text: string
  expected_points: string | null
  created_at: number
}

export const createQuestionRepository = (db: DatabaseSync) => {
  return {
    list: (opts: { position?: string; level?: string; category?: string; limit: number; offset: number }) => {
      const conditions: string[] = []
      const values: (string | number)[] = []

      if (opts.position) { conditions.push('position = ?'); values.push(opts.position) }
      if (opts.level) { conditions.push('level = ?'); values.push(opts.level) }
      if (opts.category) { conditions.push('category = ?'); values.push(opts.category) }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
      const countSql = `SELECT COUNT(*) as total FROM questions ${where}`
      const totalRow = db.prepare(countSql).get(...values) as { total: number }

      const listSql = `SELECT * FROM questions ${where} ORDER BY created_at ASC LIMIT ? OFFSET ?`
      const rows = db.prepare(listSql).all(...values, opts.limit, opts.offset) as unknown as QuestionRow[]

      return {
        rows,
        total: totalRow.total,
      }
    },

    getById: (id: string): QuestionRow | null => {
      const row = db.prepare('SELECT * FROM questions WHERE id = ?').get(id) as QuestionRow | undefined
      return row ?? null
    },

    pickRandom: (opts: { position: string; limit: number; excludeIds?: string[]; category?: string }) => {
      const conditions = ['position = ?']
      const values: (string | number)[] = [opts.position]
      if (opts.category) { conditions.push('category = ?'); values.push(opts.category) }

      const exclude = opts.excludeIds?.length
        ? `AND id NOT IN (${opts.excludeIds.map(() => '?').join(',')})`
        : ''
      if (opts.excludeIds) values.push(...opts.excludeIds)

      const sql = `SELECT * FROM questions WHERE ${conditions.join(' AND ')} ${exclude} ORDER BY RANDOM() LIMIT ?`
      values.push(opts.limit)
      return db.prepare(sql).all(...values) as unknown as QuestionRow[]
    },
  }
}
