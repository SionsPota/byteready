import { Hono } from 'hono'
import { err, ok, interviewCreateSchema } from '@byteready/shared'
import { requireAuth } from '../lib/auth/middleware.ts'
import { getDb } from '../lib/db/client.ts'
import { createInterviewRepository } from '../lib/interviews/repository.ts'
import { createQuestionRepository } from '../lib/questions/repository.ts'
import { createResumeRepository } from '../lib/resume/repository.ts'
import { askInterviewer } from '../lib/interviews/interviewer.ts'
import { triggerReview } from './reviews.ts'
import { createTrendRepository } from '../lib/trends/repository.ts'
import { createReviewRepository } from '../lib/reviews/repository.ts'

export const interviewsRoute = new Hono()
interviewsRoute.use('*', requireAuth)

const getInterviewRepo = () => createInterviewRepository(getDb())
const getQuestionRepo = () => createQuestionRepository(getDb())
const getResumeRepo = () => createResumeRepository(getDb())
const getTrendRepo = () => createTrendRepository(getDb())

// POST /api/interviews - 创建
interviewsRoute.post('/', async (c) => {
  const userId = c.get('userId' as never) as string
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json(err('VALIDATION', '请求体必须是 JSON'), 400)
  }

  const parsed = interviewCreateSchema.safeParse(body)
  if (!parsed.success) {
    const messages = parsed.error.issues.map((i) => i.message).join('; ')
    return c.json(err('VALIDATION', messages), 400)
  }

  const { position, level, target_company, resume_id } = parsed.data
  const repo = getInterviewRepo()

  // 验证 resume_id 存在且属于当前用户
  if (resume_id) {
    const resume = getResumeRepo().getById(resume_id)
    if (!resume || resume.owner_id !== userId) {
      return c.json(err('NOT_FOUND', '简历不存在'), 404)
    }
  }

  const session = repo.createSession({
    ownerId: userId,
    position,
    level,
    targetCompany: target_company,
    resumeId: resume_id,
  })

  return c.json(ok({
    id: session.id,
    position: session.position,
    level: session.level,
    status: session.status,
    createdAt: session.created_at,
  }), 201)
})

// GET /api/interviews - 列表
interviewsRoute.get('/', (c) => {
  const userId = c.get('userId' as never) as string
  const rows = getInterviewRepo().listByOwner(userId)
  return c.json(ok(rows.map((r) => ({
    id: r.id,
    position: r.position,
    level: r.level,
    targetCompany: r.target_company,
    resumeId: r.resume_id,
    status: r.status,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    createdAt: r.created_at,
  }))))
})

// GET /api/interviews/:id - 详情
interviewsRoute.get('/:id', (c) => {
  const userId = c.get('userId' as never) as string
  const id = c.req.param('id')
  const row = getInterviewRepo().getById(id)

  if (!row || row.owner_id !== userId) {
    return c.json(err('NOT_FOUND', '面试不存在'), 404)
  }

  return c.json(ok({
    id: row.id,
    position: row.position,
    level: row.level,
    targetCompany: row.target_company,
    resumeId: row.resume_id,
    status: row.status,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    createdAt: row.created_at,
    turns: row.turns.map((t) => ({
      id: t.id,
      index: t.index,
      kind: t.kind,
      questionId: t.question_id,
      text: t.text,
      createdAt: t.created_at,
    })),
  }))
})

// POST /api/interviews/:id/start - 开始面试
interviewsRoute.post('/:id/start', (c) => {
  const userId = c.get('userId' as never) as string
  const id = c.req.param('id')
  const repo = getInterviewRepo()
  const row = repo.getById(id)

  if (!row || row.owner_id !== userId) {
    return c.json(err('NOT_FOUND', '面试不存在'), 404)
  }
  if (row.status !== 'pending') {
    return c.json(err('CONFLICT', '面试已开始或已结束'), 409)
  }

  repo.start(id)

  // 抽题：按 position+level 随机抽 6-8 题
  const qRepo = getQuestionRepo()
  const questions = qRepo.pickRandom({ position: row.position, level: row.level, limit: 8 })

  // 如果有简历，用项目类问题替换 1-2 道
  let finalQuestions = questions
  if (row.resume_id) {
    const resume = getResumeRepo().getById(row.resume_id)
    if (resume && resume.projects.length > 0) {
      const projectQs = qRepo.pickRandom({ position: row.position, level: row.level, limit: 2, category: 'project' as const })
      if (projectQs.length > 0) {
        // 替换前 2 道为项目类问题
        finalQuestions = [...projectQs, ...questions.slice(projectQs.length)]
      }
    }
  }

  // 创建第一个 turn：系统消息（主问题列表）
  const systemText = `本场面试共 ${finalQuestions.length} 道主问题。现在开始第一题：` + finalQuestions[0]?.main_text
  repo.createTurn({ sessionId: id, index: 0, kind: 'system', text: systemText, questionId: finalQuestions[0]?.id ?? null })

  // 创建第二个 turn：面试官播报第一题
  repo.createTurn({ sessionId: id, index: 1, kind: 'interviewer_main', text: finalQuestions[0]?.main_text ?? '请开始自我介绍。', questionId: finalQuestions[0]?.id ?? null })

  return c.json(ok({
    id,
    status: 'running',
    questions: finalQuestions.map((q) => ({ id: q.id, text: q.main_text, category: q.category })),
  }))
})

// POST /api/interviews/:id/answer - 候选人回答
interviewsRoute.post('/:id/answer', async (c) => {
  const userId = c.get('userId' as never) as string
  const id = c.req.param('id')
  const repo = getInterviewRepo()
  const session = repo.getById(id)

  if (!session || session.owner_id !== userId) {
    return c.json(err('NOT_FOUND', '面试不存在'), 404)
  }
  if (session.status !== 'running') {
    return c.json(err('CONFLICT', '面试未开始或已结束'), 409)
  }

  let body: { text?: string }
  try {
    body = await c.req.json()
  } catch {
    return c.json(err('VALIDATION', '请求体必须是 JSON'), 400)
  }

  const text = body.text?.trim()
  if (!text) {
    return c.json(err('VALIDATION', '回答内容不能为空'), 400)
  }

  const maxIdx = repo.getMaxTurnIndex(id)
  const nextIdx = maxIdx + 1

  // 记录候选人回答
  const lastQuestionTurn = session.turns
    .slice()
    .reverse()
    .find((t) => t.kind === 'interviewer_main' || t.kind === 'interviewer_followup')
  repo.createTurn({ sessionId: id, index: nextIdx, kind: 'candidate', text, questionId: lastQuestionTurn?.question_id ?? null })

  // 获取简历项目信息
  let resumeProjects: { name: string; summary?: string; keywords?: string[] }[] | undefined
  if (session.resume_id) {
    const resume = getResumeRepo().getById(session.resume_id)
    if (resume) {
      resumeProjects = resume.projects.map((p) => ({
        name: p.name,
        summary: p.summary ?? undefined,
        keywords: p.keywords ? JSON.parse(p.keywords) : undefined,
      }))
    }
  }

  // 获取当前问题
  const currentQuestion = lastQuestionTurn
    ? getQuestionRepo().getById(lastQuestionTurn.question_id ?? '')
    : null

  // 计算追问次数
  const questionTurns = session.turns.filter((t) => t.question_id === lastQuestionTurn?.question_id)
  const followUpCount = questionTurns.filter((t) => t.kind === 'interviewer_followup').length

  // 调用面试官 LLM
  const reply = await askInterviewer({
    position: session.position,
    level: session.level,
    targetCompany: session.target_company ?? undefined,
    resumeProjects,
    currentQuestion: currentQuestion?.main_text ?? lastQuestionTurn?.text ?? '请继续。',
    currentQuestionExpectedPoints: currentQuestion?.expected_points ?? undefined,
    previousTurns: session.turns.map((t) => ({ kind: t.kind, text: t.text })),
    followUpCount,
  })

  const replyIdx = nextIdx + 1
  const kind = reply.decision === 'next_question' ? 'interviewer_main' : 'interviewer_followup'
  repo.createTurn({ sessionId: id, index: replyIdx, kind, text: reply.reply, questionId: lastQuestionTurn?.question_id ?? null })

  return c.json(ok({
    reply: reply.reply,
    decision: reply.decision,
    turnIndex: replyIdx,
  }))
})

// POST /api/interviews/:id/end - 结束面试
interviewsRoute.post('/:id/end', async (c) => {
  const userId = c.get('userId' as never) as string
  const id = c.req.param('id')
  const repo = getInterviewRepo()
  const session = repo.getById(id)

  if (!session || session.owner_id !== userId) {
    return c.json(err('NOT_FOUND', '面试不存在'), 404)
  }
  if (session.status === 'ended') {
    return c.json(err('CONFLICT', '面试已结束'), 409)
  }

  repo.end(id)

  // 触发复盘生成（不阻塞返回）
  void triggerReview(id).then((reviewId) => {
    if (reviewId) {
      const reviewRepo = createReviewRepository(getDb())
      const report = reviewRepo.getById(reviewId)
      if (report) {
        getTrendRepo().createSnapshots(
          userId,
          id,
          report.scores.map((s: { axis: string; value: number }) => ({ axis: s.axis, value: s.value }))
        )
      }
    }
  })

  return c.json(ok({ id, status: 'ended' }))
})

// DELETE /api/interviews/:id
interviewsRoute.delete('/:id', (c) => {
  const userId = c.get('userId' as never) as string
  const id = c.req.param('id')
  const repo = getInterviewRepo()
  const session = repo.getById(id)

  if (!session || session.owner_id !== userId) {
    return c.json(err('NOT_FOUND', '面试不存在'), 404)
  }

  repo.delete(id)
  return c.json(ok({ message: '已删除' }))
})
