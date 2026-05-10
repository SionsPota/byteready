import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { randomUUID } from 'node:crypto'
import { createApp } from '../../app.ts'
import { openDbInMemory, overrideDb, closeDb } from '../../lib/db/client.ts'
import { seedExploreIfEmpty } from '../../lib/explore/seed.ts'
import { createSession } from '../../lib/auth/session.ts'
import { hashPassword } from '../../lib/auth/password.ts'

interface ListBody {
  success: boolean
  data: { id: string; relatedRole: string | null }[]
}

interface RecommendBody {
  success: boolean
  data: {
    items: { id: string; relatedRole: string | null; score: number }[]
    role: string | null
    gaps: string[]
  }
}

interface DetailBody {
  success: boolean
  data: { id: string; relatedProjects: { id: string }[] }
}

describe('GET /api/explore/trends', () => {
  let app: ReturnType<typeof createApp>
  let token: string
  let userId: string

  beforeEach(() => {
    closeDb()
    const db = openDbInMemory()
    overrideDb(db)
    seedExploreIfEmpty(db)

    userId = randomUUID()
    db.prepare('INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(userId, 'tr@test.com', 'TR', hashPassword('pass'), Date.now())
    token = createSession(userId)
    app = createApp()
  })

  afterEach(() => {
    closeDb()
  })

  it('返回趋势列表（含 12 条 seed 数据）', async () => {
    const res = await app.request('/api/explore/trends', {
      headers: { Cookie: `byteready_session=${token}` },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as ListBody
    expect(body.success).toBe(true)
    expect(body.data.length).toBeGreaterThanOrEqual(10)
  })

  it('详情页返回 relatedProjects', async () => {
    // tr-1 是 AI 大模型趋势，关联多个项目
    const res = await app.request('/api/explore/trends/tr-1', {
      headers: { Cookie: `byteready_session=${token}` },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as DetailBody
    expect(body.data.relatedProjects.length).toBeGreaterThan(0)
  })

  it('recommend 无 resumeId 时按 relevanceBase 排序', async () => {
    const res = await app.request('/api/explore/trends/recommend', {
      headers: { Cookie: `byteready_session=${token}` },
    })
    const body = (await res.json()) as RecommendBody
    expect(body.data.role).toBeNull()
    expect(body.data.items.length).toBeGreaterThan(0)
  })

  it('recommend 带 frontend 简历优先返回 frontend 趋势', async () => {
    const db = openDbInMemory()
    overrideDb(db)
    seedExploreIfEmpty(db)

    const newUserId = randomUUID()
    db.prepare('INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(newUserId, 'fe@test.com', 'FE', hashPassword('pass'), Date.now())
    const newToken = createSession(newUserId)

    const resumeId = randomUUID()
    const skills = JSON.stringify([{ name: 'React' }, { name: 'TypeScript' }])
    db.prepare(
      'INSERT INTO resumes (id, owner_id, title, raw_text, skills, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(resumeId, newUserId, 'FE 简历', '前端简历', skills, Date.now())

    app = createApp()
    const res = await app.request(`/api/explore/trends/recommend?resumeId=${resumeId}`, {
      headers: { Cookie: `byteready_session=${newToken}` },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as RecommendBody
    expect(body.data.role).toBe('frontend')
    expect(body.data.items[0]?.relatedRole).toBe('frontend')
  })

  it('recommend 拿别人简历返回 403', async () => {
    const db = openDbInMemory()
    overrideDb(db)
    seedExploreIfEmpty(db)

    const owner = randomUUID()
    const intruder = randomUUID()
    db.prepare('INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(owner, 'o@test.com', 'O', hashPassword('pass'), Date.now())
    db.prepare('INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(intruder, 'i@test.com', 'I', hashPassword('pass'), Date.now())
    const intruderToken = createSession(intruder)

    const resumeId = randomUUID()
    db.prepare(
      'INSERT INTO resumes (id, owner_id, title, raw_text, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(resumeId, owner, 'OWNER 简历', '内容', Date.now())

    app = createApp()
    const res = await app.request(`/api/explore/trends/recommend?resumeId=${resumeId}`, {
      headers: { Cookie: `byteready_session=${intruderToken}` },
    })
    expect(res.status).toBe(403)
  })
})
