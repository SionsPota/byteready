import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createApp } from '../app.ts'
import { openDbInMemory, overrideDb, closeDb } from '../lib/db/client.ts'
import { seedQuestions } from '../lib/questions/seed.ts'
import { createSession } from '../lib/auth/session.ts'
import { hashPassword } from '../lib/auth/password.ts'
import { randomUUID } from 'node:crypto'

describe('GET /api/questions', () => {
  let app: ReturnType<typeof createApp>
  let token: string

  beforeEach(() => {
    closeDb()
    const db = openDbInMemory()
    overrideDb(db)
    seedQuestions(db)

    const userId = randomUUID()
    db.prepare('INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(userId, 'q@test.com', 'Q', hashPassword('pass'), Date.now())
    token = createSession(userId)
    app = createApp()
  })

  afterEach(() => {
    closeDb()
  })

  it('返回题库列表', async () => {
    const res = await app.request('/api/questions', {
      headers: { Cookie: `byteready_session=${token}` },
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { success: boolean; data: unknown[]; meta: { total: number } }
    expect(json.success).toBe(true)
    expect(json.data.length).toBeGreaterThan(0)
    expect(json.meta.total).toBeGreaterThan(0)
  })

  it('按 position 过滤', async () => {
    const res = await app.request('/api/questions?position=frontend', {
      headers: { Cookie: `byteready_session=${token}` },
    })
    const json = (await res.json()) as { success: boolean; data: { position: string }[] }
    expect(json.data.every((q) => q.position === 'frontend')).toBe(true)
  })

  it('未登录返回 401', async () => {
    const res = await app.request('/api/questions')
    expect(res.status).toBe(401)
  })
})
