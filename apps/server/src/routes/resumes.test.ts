import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createApp } from '../app.ts'
import { openDbInMemory, overrideDb, closeDb } from '../lib/db/client.ts'
import { createSession } from '../lib/auth/session.ts'
import { hashPassword } from '../lib/auth/password.ts'
import { randomUUID } from 'node:crypto'

vi.mock('../lib/resume/extractor.ts', () => ({
  extractResumeInfo: vi.fn().mockResolvedValue({
    contact: { name: null, email: null, phone: null, location: null },
    summary: null,
    educations: [],
    experiences: [],
    skills: [],
    projects: [{ name: 'Test Project', keywords: ['TS'] }],
  }),
  extractProjectsFromResume: vi.fn().mockResolvedValue({
    projects: [{ name: 'Test Project', keywords: ['TS'] }],
  }),
}))

describe('resume routes', () => {
  let app: ReturnType<typeof createApp>
  let token: string
  let userId: string

  beforeEach(() => {
    closeDb()
    const db = openDbInMemory()
    overrideDb(db)
    app = createApp()

    userId = randomUUID()
    db.prepare('INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(userId, 'resume@test.com', 'Test', hashPassword('pass'), Date.now())
    token = createSession(userId)
  })

  afterEach(() => {
    closeDb()
  })

  it('创建粘贴简历', async () => {
    const res = await app.request('/api/resumes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `byteready_session=${token}` },
      body: JSON.stringify({ title: '我的简历', raw_text: '简历内容...', source_format: 'paste' }),
    })
    expect(res.status).toBe(201)
    const json = (await res.json()) as { success: boolean; data: { title: string; projects: unknown[] } }
    expect(json.success).toBe(true)
    expect(json.data.title).toBe('我的简历')
  })

  it('创建简历参数校验失败', async () => {
    const res = await app.request('/api/resumes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `byteready_session=${token}` },
      body: JSON.stringify({ raw_text: '', source_format: 'paste' }),
    })
    expect(res.status).toBe(400)
  })

  it('未登录返回 401', async () => {
    const res = await app.request('/api/resumes')
    expect(res.status).toBe(401)
  })

  it('获取简历列表', async () => {
    await app.request('/api/resumes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `byteready_session=${token}` },
      body: JSON.stringify({ title: 'R1', raw_text: 'text', source_format: 'paste' }),
    })

    const res = await app.request('/api/resumes', {
      headers: { Cookie: `byteready_session=${token}` },
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { success: boolean; data: unknown[] }
    expect(json.success).toBe(true)
    expect(json.data.length).toBeGreaterThan(0)
  })

  it('获取简历详情', async () => {
    const createRes = await app.request('/api/resumes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `byteready_session=${token}` },
      body: JSON.stringify({ title: 'R2', raw_text: 'text', source_format: 'paste' }),
    })
    const createJson = (await createRes.json()) as { success: boolean; data: { id: string } }
    const id = createJson.data.id

    const res = await app.request(`/api/resumes/${id}`, {
      headers: { Cookie: `byteready_session=${token}` },
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { success: boolean; data: { title: string } }
    expect(json.data.title).toBe('R2')
  })

  it('删除简历', async () => {
    const createRes = await app.request('/api/resumes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `byteready_session=${token}` },
      body: JSON.stringify({ title: 'R3', raw_text: 'text', source_format: 'paste' }),
    })
    const createJson = (await createRes.json()) as { success: boolean; data: { id: string } }
    const id = createJson.data.id

    const delRes = await app.request(`/api/resumes/${id}`, {
      method: 'DELETE',
      headers: { Cookie: `byteready_session=${token}` },
    })
    expect(delRes.status).toBe(200)

    const getRes = await app.request(`/api/resumes/${id}`, {
      headers: { Cookie: `byteready_session=${token}` },
    })
    expect(getRes.status).toBe(404)
  })
})
