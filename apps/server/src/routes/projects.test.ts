import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { randomUUID } from 'node:crypto'
import { createApp } from '../app.ts'
import { openDbInMemory, overrideDb, closeDb, getDb } from '../lib/db/client.ts'
import { seedExploreIfEmpty } from '../lib/explore/seed.ts'
import { createSession } from '../lib/auth/session.ts'
import { hashPassword } from '../lib/auth/password.ts'
import { createProjectRepository } from '../lib/projects/repository.ts'

interface CrossRefBody {
  success: boolean
  data: {
    experiences: Array<{ id: string; title: string }>
    trends: Array<{ id: string; title: string }>
    projects: Array<{ id: string; name: string }>
    questions: Array<{ id: number; question: string }>
  }
}

interface ErrorBody {
  success: false
  error: { code: string; message: string }
}

describe('GET /api/projects/:id/cross-ref', () => {
  let app: ReturnType<typeof createApp>
  let token: string
  let userId: string

  beforeEach(() => {
    closeDb()
    const db = openDbInMemory()
    overrideDb(db)
    seedExploreIfEmpty(db)

    userId = randomUUID()
    db.prepare(
      'INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
    ).run(userId, 'pj@test.com', 'PJ', hashPassword('pass'), Date.now())
    token = createSession(userId)
    app = createApp()
  })

  afterEach(() => {
    closeDb()
  })

  it('未登录返回 401', async () => {
    const res = await app.request('/api/projects/anything/cross-ref')
    expect(res.status).toBe(401)
  })

  it('项目不存在返回 404', async () => {
    const res = await app.request('/api/projects/no-such-id/cross-ref', {
      headers: { Cookie: `byteready_session=${token}` },
    })
    expect(res.status).toBe(404)
  })

  it('别人的项目返回 404（NOT_FOUND，不暴露存在性）', async () => {
    // 用另一个用户创建项目
    const otherId = randomUUID()
    getDb()
      .prepare(
        'INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
      )
      .run(otherId, 'other@test.com', 'OTHER', hashPassword('pass'), Date.now())
    const projectRepo = createProjectRepository(getDb())
    const stranger = projectRepo.create({
      ownerId: otherId,
      name: '别人的项目',
      keywords: ['分布式'],
      source: 'manual',
    })

    const res = await app.request(`/api/projects/${stranger.id}/cross-ref`, {
      headers: { Cookie: `byteready_session=${token}` },
    })
    expect(res.status).toBe(404)
  })

  it('keywords 为空时返回 4 个空数组', async () => {
    const projectRepo = createProjectRepository(getDb())
    const project = projectRepo.create({
      ownerId: userId,
      name: '没关键字的项目',
      source: 'manual',
    })

    const res = await app.request(`/api/projects/${project.id}/cross-ref`, {
      headers: { Cookie: `byteready_session=${token}` },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as CrossRefBody
    expect(body.success).toBe(true)
    expect(body.data.experiences).toEqual([])
    expect(body.data.trends).toEqual([])
    expect(body.data.projects).toEqual([])
    expect(body.data.questions).toEqual([])
  })

  it('keywords 命中 explore 标签时返回 4 个类型的相关条目', async () => {
    // "分布式" 是 seed 数据里被 experiences/projects/questions 大量使用的标签
    const projectRepo = createProjectRepository(getDb())
    const project = projectRepo.create({
      ownerId: userId,
      name: '我的分布式项目',
      keywords: ['分布式', '微服务'],
      source: 'manual',
    })

    const res = await app.request(`/api/projects/${project.id}/cross-ref`, {
      headers: { Cookie: `byteready_session=${token}` },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as CrossRefBody
    expect(body.success).toBe(true)

    // 数据结构正确
    expect(Array.isArray(body.data.experiences)).toBe(true)
    expect(Array.isArray(body.data.trends)).toBe(true)
    expect(Array.isArray(body.data.projects)).toBe(true)
    expect(Array.isArray(body.data.questions)).toBe(true)

    // 至少一个类型命中：seed 数据里"分布式"是高频 tag
    const totalHits =
      body.data.experiences.length +
      body.data.trends.length +
      body.data.projects.length +
      body.data.questions.length
    expect(totalHits).toBeGreaterThan(0)

    // 每条结果都带必要字段
    body.data.experiences.forEach((e) => {
      expect(e.id).toBeTruthy()
      expect(e.title).toBeTruthy()
    })
    body.data.projects.forEach((p) => {
      expect(p.id).toBeTruthy()
      expect(p.name).toBeTruthy()
    })
  })
})

describe('GET /api/projects/:id', () => {
  let app: ReturnType<typeof createApp>
  let token: string
  let userId: string

  beforeEach(() => {
    closeDb()
    const db = openDbInMemory()
    overrideDb(db)

    userId = randomUUID()
    db.prepare(
      'INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
    ).run(userId, 'pj2@test.com', 'PJ2', hashPassword('pass'), Date.now())
    token = createSession(userId)
    app = createApp()
  })

  afterEach(() => {
    closeDb()
  })

  it('返回项目详情', async () => {
    const projectRepo = createProjectRepository(getDb())
    const project = projectRepo.create({
      ownerId: userId,
      name: '电商秒杀',
      keywords: ['Redis', 'Kafka'],
      source: 'manual',
    })

    const res = await app.request(`/api/projects/${project.id}`, {
      headers: { Cookie: `byteready_session=${token}` },
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; data: { name: string; keywords: string[] } }
    expect(body.data.name).toBe('电商秒杀')
    expect(body.data.keywords).toEqual(['Redis', 'Kafka'])
  })

  it('不存在的 id 返回 404', async () => {
    const res = await app.request('/api/projects/nope/cross-ref', {
      headers: { Cookie: `byteready_session=${token}` },
    })
    expect(res.status).toBe(404)
    const body = (await res.json()) as ErrorBody
    expect(body.error.code).toBe('NOT_FOUND')
  })
})
