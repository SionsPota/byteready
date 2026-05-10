import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createApp } from '../app.ts'
import { openDbInMemory, overrideDb, closeDb } from '../lib/db/client.ts'
import { createSession } from '../lib/auth/session.ts'
import { hashPassword } from '../lib/auth/password.ts'
import { randomUUID } from 'node:crypto'

describe('GET /api/me', () => {
  let app: ReturnType<typeof createApp>

  beforeEach(() => {
    closeDb()
    overrideDb(openDbInMemory())
    app = createApp()
  })

  afterEach(() => {
    closeDb()
  })

  it('未登录返回 401', async () => {
    const res = await app.request('/api/me')
    expect(res.status).toBe(401)
    const json = (await res.json()) as { success: boolean }
    expect(json.success).toBe(false)
  })

  it('登录后返回用户信息', async () => {
    const db = openDbInMemory()
    overrideDb(db)
    app = createApp()

    const userId = randomUUID()
    db.prepare('INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(userId, 'me@example.com', 'Me User', hashPassword('pass'), Date.now())

    const token = createSession(userId)
    const res = await app.request('/api/me', {
      headers: { Cookie: `byteready_session=${token}` },
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { success: boolean; data: { email: string; name: string; id: string } }
    expect(json.success).toBe(true)
    expect(json.data.email).toBe('me@example.com')
    expect(json.data.name).toBe('Me User')
    expect(json.data.id).toBe(userId)
  })
})
