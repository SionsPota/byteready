import { describe, expect, it } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { migrate } from './migrations.ts'

const openMem = (): DatabaseSync => {
  const db = new DatabaseSync(':memory:')
  db.exec('PRAGMA foreign_keys = ON')
  return db
}

describe('migrate', () => {
  it('幂等创建 conversations / messages / kv 三张表', () => {
    const db = openMem()
    migrate(db)
    migrate(db)
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[]
    const names = tables.map((t) => t.name)
    expect(names).toContain('conversations')
    expect(names).toContain('messages')
    expect(names).toContain('kv')
    db.close()
  })

  it('创建 idx_messages_conv 索引', () => {
    const db = openMem()
    migrate(db)
    const idx = db
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_messages_conv'")
      .get()
    expect(idx).toBeDefined()
    db.close()
  })

  it('FK 约束生效：插入孤儿 message 抛错', () => {
    const db = openMem()
    migrate(db)
    expect(() =>
      db
        .prepare(
          'INSERT INTO messages (id, conversation_id, role, content, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .run('m1', 'nonexistent', 'user', 'hi', 'completed', Date.now()),
    ).toThrow()
    db.close()
  })

  it('CHECK 约束生效：非法 role 抛错', () => {
    const db = openMem()
    migrate(db)
    db.prepare('INSERT INTO conversations (id, created_at, updated_at) VALUES (?, ?, ?)').run(
      'c1',
      Date.now(),
      Date.now(),
    )
    expect(() =>
      db
        .prepare(
          'INSERT INTO messages (id, conversation_id, role, content, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .run('m1', 'c1', 'invalid_role', '', 'completed', Date.now()),
    ).toThrow()
    db.close()
  })

  it('CHECK 约束生效：非法 status 抛错', () => {
    const db = openMem()
    migrate(db)
    db.prepare('INSERT INTO conversations (id, created_at, updated_at) VALUES (?, ?, ?)').run(
      'c1',
      Date.now(),
      Date.now(),
    )
    expect(() =>
      db
        .prepare(
          'INSERT INTO messages (id, conversation_id, role, content, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .run('m1', 'c1', 'user', '', 'invalid_status', Date.now()),
    ).toThrow()
    db.close()
  })

  it('删除 conversation 级联清理 messages', () => {
    const db = openMem()
    migrate(db)
    db.prepare('INSERT INTO conversations (id, created_at, updated_at) VALUES (?, ?, ?)').run(
      'c1',
      Date.now(),
      Date.now(),
    )
    db.prepare(
      'INSERT INTO messages (id, conversation_id, role, content, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).run('m1', 'c1', 'user', 'hi', 'completed', Date.now())
    db.prepare('DELETE FROM conversations WHERE id = ?').run('c1')
    const left = db.prepare('SELECT COUNT(*) AS n FROM messages').get() as { n: number }
    expect(left.n).toBe(0)
    db.close()
  })
})
