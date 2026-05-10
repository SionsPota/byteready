import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createApp } from '../app.ts'
import { openDbInMemory, overrideDb, closeDb } from '../lib/db/client.ts'
import { seedQuestions } from '../lib/questions/seed.ts'
import { createSession } from '../lib/auth/session.ts'
import { hashPassword } from '../lib/auth/password.ts'
import { randomUUID } from 'node:crypto'

vi.mock('../lib/interviews/interviewer.ts', () => ({
  askInterviewer: vi.fn().mockResolvedValue({
    reply: '这是一个很好的回答，请继续。',
    decision: 'follow_up' as const,
  }),
}))

describe('interview routes', () => {
  let app: ReturnType<typeof createApp>
  let token: string
  let userId: string
  let db: ReturnType<typeof openDbInMemory>

  beforeEach(() => {
    closeDb()
    db = openDbInMemory()
    overrideDb(db)
    seedQuestions(db)

    userId = randomUUID()
    db.prepare('INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(userId, 'iv@test.com', 'IV', hashPassword('pass'), Date.now())
    token = createSession(userId)
    app = createApp()
  })

  afterEach(() => {
    closeDb()
  })

  it('创建面试 session', async () => {
    const res = await app.request('/api/interviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `byteready_session=${token}` },
      body: JSON.stringify({ position: 'backend', level: 'mid' }),
    })
    expect(res.status).toBe(201)
    const json = (await res.json()) as { success: boolean; data: { id: string; status: string } }
    expect(json.success).toBe(true)
    expect(json.data.status).toBe('pending')
  })

  it('创建面试参数校验失败', async () => {
    const res = await app.request('/api/interviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `byteready_session=${token}` },
      body: JSON.stringify({ position: '', level: 'invalid' }),
    })
    expect(res.status).toBe(400)
  })

  it('开始面试并抽题', async () => {
    const createRes = await app.request('/api/interviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `byteready_session=${token}` },
      body: JSON.stringify({ position: 'frontend', level: 'junior' }),
    })
    const createJson = (await createRes.json()) as { success: boolean; data: { id: string } }

    const startRes = await app.request(`/api/interviews/${createJson.data.id}/start`, {
      method: 'POST',
      headers: { Cookie: `byteready_session=${token}` },
    })
    expect(startRes.status).toBe(200)
    const json = (await startRes.json()) as { success: boolean; data: { status: string; questions: unknown[] } }
    expect(json.data.status).toBe('running')
    expect(json.data.questions.length).toBeGreaterThan(0)
  })

  it('候选人回答', async () => {
    const createRes = await app.request('/api/interviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `byteready_session=${token}` },
      body: JSON.stringify({ position: 'backend', level: 'junior' }),
    })
    const { id } = ((await createRes.json()) as { data: { id: string } }).data

    await app.request(`/api/interviews/${id}/start`, {
      method: 'POST',
      headers: { Cookie: `byteready_session=${token}` },
    })

    const answerRes = await app.request(`/api/interviews/${id}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `byteready_session=${token}` },
      body: JSON.stringify({ text: '我的回答是...' }),
    })
    expect(answerRes.status).toBe(200)
    const json = (await answerRes.json()) as { success: boolean; data: { reply: string; decision: string } }
    expect(json.data.reply).toBeDefined()
    expect(json.data.decision).toBe('follow_up')
  })

  it('结束面试', async () => {
    const createRes = await app.request('/api/interviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `byteready_session=${token}` },
      body: JSON.stringify({ position: 'backend', level: 'junior' }),
    })
    const { id } = ((await createRes.json()) as { data: { id: string } }).data

    await app.request(`/api/interviews/${id}/start`, {
      method: 'POST',
      headers: { Cookie: `byteready_session=${token}` },
    })

    const endRes = await app.request(`/api/interviews/${id}/end`, {
      method: 'POST',
      headers: { Cookie: `byteready_session=${token}` },
    })
    expect(endRes.status).toBe(200)
    const json = (await endRes.json()) as { success: boolean; data: { status: string } }
    expect(json.data.status).toBe('ended')
  })

  it('未登录返回 401', async () => {
    const res = await app.request('/api/interviews')
    expect(res.status).toBe(401)
  })
})
