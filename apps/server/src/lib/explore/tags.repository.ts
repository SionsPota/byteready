import type { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'

export type TagCategory = 'tech' | 'process' | 'role' | 'other'

export interface TagRow {
  id: string
  name: string
  color: string | null
  category: TagCategory
  created_at: number
}

export interface CreateTagInput {
  name: string
  color?: string
  category?: TagCategory
}

export const createTagRepository = (db: DatabaseSync) => {
  return {
    create: (input: CreateTagInput): TagRow => {
      const id = randomUUID()
      const now = Date.now()
      db.prepare(
        'INSERT INTO explore_tags (id, name, color, category, created_at) VALUES (?, ?, ?, ?, ?)'
      ).run(id, input.name, input.color ?? null, input.category ?? 'other', now)
      return {
        id,
        name: input.name,
        color: input.color ?? null,
        category: input.category ?? 'other',
        created_at: now,
      }
    },

    list: (): TagRow[] => {
      return db
        .prepare('SELECT * FROM explore_tags ORDER BY category, name')
        .all() as unknown as TagRow[]
    },

    listByIds: (ids: string[]): TagRow[] => {
      if (ids.length === 0) return []
      const placeholders = ids.map(() => '?').join(',')
      return db
        .prepare(`SELECT * FROM explore_tags WHERE id IN (${placeholders})`)
        .all(...ids) as unknown as TagRow[]
    },

    findByName: (name: string): TagRow | null => {
      const row = db
        .prepare('SELECT * FROM explore_tags WHERE name = ?')
        .get(name) as TagRow | undefined
      return row ?? null
    },

    countAll: (): number => {
      const row = db.prepare('SELECT COUNT(*) AS cnt FROM explore_tags').get() as { cnt: number }
      return row.cnt
    },
  }
}
