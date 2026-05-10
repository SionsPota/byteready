import { describe, expect, it } from 'vitest'
import { openDbInMemory } from './client.ts'

describe('openDbInMemory', () => {
  it('返回应用过 migration 的 DatabaseSync', () => {
    const db = openDbInMemory()
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as { name: string }[]
    const names = tables.map((t) => t.name)
    expect(names).toContain('users')
    expect(names).toContain('training_sessions')
    db.close()
  })

  it('多次调用相互隔离', () => {
    const db1 = openDbInMemory()
    const db2 = openDbInMemory()
    db1
      .prepare(
        'INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)',
      )
      .run('u1', 'a@b.com', 'h', Date.now())
    const inDb2 = db2.prepare('SELECT id FROM users WHERE id = ?').get('u1')
    expect(inDb2).toBeUndefined()
    db1.close()
    db2.close()
  })

  it('foreign_keys 默认开启', () => {
    const db = openDbInMemory()
    expect(() =>
      db
        .prepare(
          'INSERT INTO training_sessions (id, owner_id, type, position, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .run('s1', 'nonexistent_user', 'full', 'backend', 'pending', Date.now()),
    ).toThrow()
    db.close()
  })
})
