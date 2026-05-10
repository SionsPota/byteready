import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { randomUUID } from 'node:crypto'
import { createApp } from '../../app.ts'
import { openDbInMemory, overrideDb, closeDb } from '../../lib/db/client.ts'
import { seedExploreIfEmpty } from '../../lib/explore/seed.ts'
import { createSession } from '../../lib/auth/session.ts'
import { hashPassword } from '../../lib/auth/password.ts'

interface ListBody {
  success: boolean
  data: { items: Array<{ id: string; tags: { id: string }[]; companyName: string | null }> }
  meta: { total: number; page: number; limit: number }
}

interface DetailBody {
  success: boolean
  data: { id: string; viewCount: number; tags: unknown[] }
}

describe('GET /api/explore/experiences', () => {
  let app: ReturnType<typeof createApp>
  let token: string

  beforeEach(() => {
    closeDb()
    const db = openDbInMemory()
    overrideDb(db)
    seedExploreIfEmpty(db)

    const userId = randomUUID()
    db.prepare('INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(userId, 'exp@test.com', 'EXP', hashPassword('pass'), Date.now())
    token = createSession(userId)
    app = createApp()
  })

  afterEach(() => {
    closeDb()
  })

  it('返回面经列表，带 meta', async () => {
    const res = await app.request('/api/explore/experiences', {
      headers: { Cookie: `byteready_session=${token}` },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as ListBody
    expect(body.success).toBe(true)
    expect(body.data.items.length).toBeGreaterThan(0)
    expect(body.meta.total).toBeGreaterThan(0)
    expect(body.data.items[0]?.tags).toBeDefined()
  })

  it('按 companyId 过滤', async () => {
    const res = await app.request('/api/explore/experiences?companyId=co-bytedance', {
      headers: { Cookie: `byteready_session=${token}` },
    })
    const body = (await res.json()) as ListBody
    expect(body.data.items.every((it) => it.companyName === '字节跳动')).toBe(true)
  })

  it('按搜索关键词过滤', async () => {
    const res = await app.request('/api/explore/experiences?search=Redis', {
      headers: { Cookie: `byteready_session=${token}` },
    })
    const body = (await res.json()) as ListBody
    expect(body.data.items.length).toBeGreaterThan(0)
  })

  it('详情页自增 view_count', async () => {
    const id = 'exp-1'
    const before = (await (
      await app.request(`/api/explore/experiences/${id}`, {
        headers: { Cookie: `byteready_session=${token}` },
      })
    ).json()) as DetailBody
    const after = (await (
      await app.request(`/api/explore/experiences/${id}`, {
        headers: { Cookie: `byteready_session=${token}` },
      })
    ).json()) as DetailBody
    expect(after.data.viewCount).toBeGreaterThan(before.data.viewCount)
  })

  it('未登录返回 401', async () => {
    const res = await app.request('/api/explore/experiences')
    expect(res.status).toBe(401)
  })

  it('不存在的 ID 返回 404', async () => {
    const res = await app.request('/api/explore/experiences/not-exist', {
      headers: { Cookie: `byteready_session=${token}` },
    })
    expect(res.status).toBe(404)
  })
})
