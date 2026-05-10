import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import { createApp } from '../app.ts'
import { openDbInMemory, overrideDb, closeDb, getDb } from '../lib/db/client.ts'
import { createSession } from '../lib/auth/session.ts'
import { hashPassword } from '../lib/auth/password.ts'
import { createTrainingRepository } from '../lib/training/repository.ts'
import { createPhaseReviewRepository } from '../lib/phase-reviews/repository.ts'
import { createFullReviewRepository } from '../lib/full-reviews/repository.ts'
import { generatePhaseReview } from '../lib/reviews/phase-generator.ts'
import { generateFullReview } from '../lib/reviews/full-generator.ts'

vi.mock('../lib/reviews/phase-generator.ts', async () => {
  return {
    generatePhaseReview: vi.fn(),
  }
})

vi.mock('../lib/reviews/full-generator.ts', async () => {
  return {
    generateFullReview: vi.fn(),
  }
})

describe('training routes', () => {
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
    ).run(userId, 'training@test.com', 'T', hashPassword('pass'), Date.now())
    token = createSession(userId)
    app = createApp()

    vi.useFakeTimers()
    vi.mocked(generatePhaseReview).mockResolvedValue({
      scores: [{ dimension: '表达', score: 4, weight: 0.3, weighted: 1.2, evidence: 'test' }],
      totalScore: 4,
      evaluation: 'test eval',
      interviewerReflection: 'test ref',
      improvementSuggestions: [{ priority: 'medium', suggestion: 'test' }],
    })
    vi.mocked(generateFullReview).mockResolvedValue({
      scores: [],
      overallScore: 4,
      coherenceScore: 4,
      jdMatchScore: 4,
      overallPersona: 'test persona',
      overallEvaluation: 'test overall',
      consolidatedImprovements: [],
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    closeDb()
  })

  const createTraining = (): string => {
    const repo = createTrainingRepository(getDb())
    const s = repo.createSession({ ownerId: userId, type: 'self_intro', position: '前端' })
    repo.start(s.id)
    // 创建一轮候选人和一轮面试官，确保有 turns
    repo.createTurn({ sessionId: s.id, index: 0, kind: 'interviewer_main', text: 'hello', phase: 'self_intro', state: 'SELF_INTRO' })
    repo.createTurn({ sessionId: s.id, index: 1, kind: 'candidate', text: 'hi', phase: 'self_intro', state: 'SELF_INTRO' })
    return s.id
  }

  describe('POST /end', () => {
    it('/end 后立刻 GET /:id 能拿到 reviewStatus === generating', async () => {
      // 让 background 任务永远挂住，确保状态停留在 generating
      vi.mocked(generatePhaseReview).mockImplementation(() => new Promise(() => {}))

      const id = createTraining()

      const res = await app.request(`/api/training/${id}/end`, {
        method: 'POST',
        headers: { Cookie: `byteready_session=${token}` },
      })
      expect(res.status).toBe(200)
      const body = (await res.json()) as { success: boolean; data: { reviewStatus: string } }
      expect(body.success).toBe(true)
      expect(body.data.reviewStatus).toBe('generating')

      // 立刻 GET 也能取到 generating
      const getRes = await app.request(`/api/training/${id}`, {
        headers: { Cookie: `byteready_session=${token}` },
      })
      const getBody = (await getRes.json()) as { success: boolean; data: { reviewStatus: string } }
      expect(getBody.data.reviewStatus).toBe('generating')
    })

    it('背景任务完成后 reviewStatus 变为 ready', async () => {
      const id = createTraining()

      await app.request(`/api/training/${id}/end`, {
        method: 'POST',
        headers: { Cookie: `byteready_session=${token}` },
      })

      // flush 所有 pending promise + timer，让后台任务跑完
      await vi.runAllTimersAsync()

      const getRes = await app.request(`/api/training/${id}`, {
        headers: { Cookie: `byteready_session=${token}` },
      })
      const getBody = (await getRes.json()) as { success: boolean; data: { reviewStatus: string } }
      expect(getBody.data.reviewStatus).toBe('ready')
    })

    it('phase generator 抛错时 reviewStatus 变为 failed', async () => {
      const id = createTraining()
      vi.mocked(generatePhaseReview).mockRejectedValue(new Error('LLM 拒绝服务'))

      await app.request(`/api/training/${id}/end`, {
        method: 'POST',
        headers: { Cookie: `byteready_session=${token}` },
      })

      await vi.runAllTimersAsync()

      const getRes = await app.request(`/api/training/${id}`, {
        headers: { Cookie: `byteready_session=${token}` },
      })
      const getBody = (await getRes.json()) as { success: boolean; data: { reviewStatus: string; reviewError: string | null } }
      expect(getBody.data.reviewStatus).toBe('failed')
      expect(getBody.data.reviewError).toContain('LLM 拒绝服务')
    })

    it('phase generator 超时（60s）时 reviewStatus 变为 failed', async () => {
      const id = createTraining()
      // 永远不 resolve
      vi.mocked(generatePhaseReview).mockImplementation(() => new Promise(() => {}))

      await app.request(`/api/training/${id}/end`, {
        method: 'POST',
        headers: { Cookie: `byteready_session=${token}` },
      })

      await vi.advanceTimersByTimeAsync(61_000)

      const getRes = await app.request(`/api/training/${id}`, {
        headers: { Cookie: `byteready_session=${token}` },
      })
      const getBody = (await getRes.json()) as { success: boolean; data: { reviewStatus: string; reviewError: string | null } }
      expect(getBody.data.reviewStatus).toBe('failed')
      expect(getBody.data.reviewError).toContain('阶段复盘 超时')
    })
  })

  describe('POST /regenerate-review', () => {
    it('generating 状态时返回 409', async () => {
      const id = createTraining()
      // 先 end，但 mock 让它永远挂住，保持 generating
      vi.mocked(generatePhaseReview).mockImplementation(() => new Promise(() => {}))

      await app.request(`/api/training/${id}/end`, {
        method: 'POST',
        headers: { Cookie: `byteready_session=${token}` },
      })

      const res = await app.request(`/api/training/${id}/regenerate-review`, {
        method: 'POST',
        headers: { Cookie: `byteready_session=${token}` },
      })
      expect(res.status).toBe(409)
      const body = (await res.json()) as { success: boolean; error: { message: string } }
      expect(body.success).toBe(false)
      expect(body.error.message).toContain('无法重新生成')
    })

    it('ready 状态时可以重新生成，旧复盘被清空', async () => {
      // 用 full 类型，确保同时生成阶段 + 整面复盘
      const repo = createTrainingRepository(getDb())
      const s = repo.createSession({ ownerId: userId, type: 'full', position: '前端' })
      repo.start(s.id)
      repo.createTurn({ sessionId: s.id, index: 0, kind: 'interviewer_main', text: 'hello', phase: 'self_intro', state: 'SELF_INTRO' })
      repo.createTurn({ sessionId: s.id, index: 1, kind: 'candidate', text: 'hi', phase: 'self_intro', state: 'SELF_INTRO' })
      repo.createTurn({ sessionId: s.id, index: 2, kind: 'interviewer_main', text: 'project?', phase: 'project_single', state: 'PROJECT_SINGLE_1' })
      repo.createTurn({ sessionId: s.id, index: 3, kind: 'candidate', text: 'my project', phase: 'project_single', state: 'PROJECT_SINGLE_1' })
      repo.createTurn({ sessionId: s.id, index: 4, kind: 'interviewer_main', text: 'tech?', phase: 'q_and_a', state: 'QNA_TECH' })
      repo.createTurn({ sessionId: s.id, index: 5, kind: 'candidate', text: 'answer', phase: 'q_and_a', state: 'QNA_TECH' })
      const id = s.id

      // 第一次 end，让它正常完成
      await app.request(`/api/training/${id}/end`, {
        method: 'POST',
        headers: { Cookie: `byteready_session=${token}` },
      })
      await vi.runAllTimersAsync()

      // 验证旧复盘存在（至少 1 个阶段 + 整面）
      const phaseRepo = createPhaseReviewRepository(getDb())
      const fullRepo = createFullReviewRepository(getDb())
      expect(phaseRepo.listBySession(id).length).toBeGreaterThan(0)
      expect(fullRepo.getBySessionId(id)).not.toBeNull()

      // 让 generate 永远挂住，确保旧数据被清空后再检查
      vi.mocked(generatePhaseReview).mockImplementation(() => new Promise(() => {}))

      // 第二次 regenerate-review
      const res = await app.request(`/api/training/${id}/regenerate-review`, {
        method: 'POST',
        headers: { Cookie: `byteready_session=${token}` },
      })
      expect(res.status).toBe(200)
      const body = (await res.json()) as { success: boolean; data: { reviewStatus: string } }
      expect(body.data.reviewStatus).toBe('generating')

      // 旧数据立刻被清空
      expect(phaseRepo.listBySession(id).length).toBe(0)
      expect(fullRepo.getBySessionId(id)).toBeNull()
    })

    it('别人的训练返回 404', async () => {
      const otherId = randomUUID()
      getDb()
        .prepare('INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(otherId, 'other@test.com', 'O', hashPassword('pass'), Date.now())

      const repo = createTrainingRepository(getDb())
      const s = repo.createSession({ ownerId: otherId, type: 'self_intro', position: '前端' })
      repo.start(s.id)
      repo.createTurn({ sessionId: s.id, index: 0, kind: 'interviewer_main', text: 'hello', phase: 'self_intro', state: 'SELF_INTRO' })
      repo.end(s.id)

      const res = await app.request(`/api/training/${s.id}/regenerate-review`, {
        method: 'POST',
        headers: { Cookie: `byteready_session=${token}` },
      })
      expect(res.status).toBe(404)
    })
  })
})
