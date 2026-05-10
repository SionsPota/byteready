import { describe, expect, it } from 'vitest'
import { openDbInMemory } from './client.ts'

describe('openDbInMemory', () => {
  it('返回应用过 migration 的 DatabaseSync', () => {
    const db = openDbInMemory()
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as { name: string }[]
    expect(tables.map((t) => t.name)).toContain('conversations')
    db.close()
  })

  it('多次调用相互隔离', () => {
    const db1 = openDbInMemory()
    const db2 = openDbInMemory()
    db1
      .prepare('INSERT INTO conversations (id, created_at, updated_at) VALUES (?, ?, ?)')
      .run('c1', Date.now(), Date.now())
    const inDb2 = db2.prepare('SELECT id FROM conversations WHERE id = ?').get('c1')
    expect(inDb2).toBeUndefined()
    db1.close()
    db2.close()
  })

  it('foreign_keys 默认开启', () => {
    const db = openDbInMemory()
    expect(() =>
      db
        .prepare(
          'INSERT INTO messages (id, conversation_id, role, content, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .run('m1', 'nonexistent', 'user', 'hi', 'completed', Date.now()),
    ).toThrow()
    db.close()
  })
})
