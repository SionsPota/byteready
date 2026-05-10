import { Hono } from 'hono'
import { err, ok } from '@byteready/shared'
import { requireAuth } from '../lib/auth/middleware.ts'
import { getDb } from '../lib/db/client.ts'
import { createReviewRepository } from '../lib/reviews/repository.ts'
import { createInterviewRepository } from '../lib/interviews/repository.ts'
import { createResumeRepository } from '../lib/resume/repository.ts'
import { createQuestionRepository } from '../lib/questions/repository.ts'
import { generateReview } from '../lib/reviews/generator.ts'

export const reviewsRoute = new Hono()
reviewsRoute.use('*', requireAuth)

const getReviewRepo = () => createReviewRepository(getDb())
const getInterviewRepo = () => createInterviewRepository(getDb())
const getResumeRepo = () => createResumeRepository(getDb())
const getQuestionRepo = () => createQuestionRepository(getDb())

// GET /api/reviews/:id
reviewsRoute.get('/:id', (c) => {
  const userId = c.get('userId' as never) as string
  const id = c.req.param('id')
  const repo = getReviewRepo()
  const report = repo.getById(id)

  if (!report) {
    return c.json(err('NOT_FOUND', '复盘报告不存在'), 404)
  }

  // 验证所属用户
  const session = getInterviewRepo().getById(report.session_id)
  if (!session || session.owner_id !== userId) {
    return c.json(err('NOT_FOUND', '复盘报告不存在'), 404)
  }

  return c.json(ok({
    id: report.id,
    sessionId: report.session_id,
    overallText: report.overall_text,
    generatedAt: report.generated_at,
    scores: report.scores.map((s) => ({
      axis: s.axis,
      value: s.value,
      evidence: s.evidence,
    })),
    llmMeta: report.llm_meta ? JSON.parse(report.llm_meta) : null,
  }))
})

// POST /api/reviews (内部调用，由 interview end 触发)
export async function triggerReview(sessionId: string): Promise<string | null> {
  const interviewRepo = getInterviewRepo()
  const reviewRepo = getReviewRepo()
  const session = interviewRepo.getById(sessionId)
  if (!session || session.status !== 'ended') return null

  // 检查是否已生成
  const existing = reviewRepo.getBySessionId(sessionId)
  if (existing) return existing.id

  // 收集简历项目
  let resumeProjects: { name: string; summary?: string; keywords?: string[] }[] = []
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

  // 收集问题
  const questionIds = [...new Set(session.turns.map((t) => t.question_id).filter(Boolean))]
  const questions = questionIds.map((qid) => {
    const q = getQuestionRepo().getById(qid!)
    return q ? { id: q.id, text: q.main_text, expectedPoints: q.expected_points ?? undefined } : { id: qid!, text: '', expectedPoints: undefined }
  })

  // 生成复盘
  try {
    const result = await generateReview({
      resumeProjects,
      questions,
      turns: session.turns.map((t) => ({ kind: t.kind, text: t.text, questionId: t.question_id })),
    })

    const report = reviewRepo.create({
      sessionId,
      overallText: result.overallText,
      scores: result.scores.map((s) => ({ axis: s.axis, value: s.value, evidence: s.evidence })),
      llmMeta: { fallback: false },
    })

    return report.id
  } catch (e) {
    console.error('[review] 生成复盘失败:', e)
    // 降级保存
    const report = reviewRepo.create({
      sessionId,
      overallText: '复盘生成失败，请稍后重试',
      scores: [
        { axis: '专业知识深度', value: 0, evidence: '生成失败' },
        { axis: '项目复述质量', value: 0, evidence: '生成失败' },
        { axis: '表达与结构', value: 0, evidence: '生成失败' },
        { axis: '逻辑与问题解决', value: 0, evidence: '生成失败' },
        { axis: '沟通自然度', value: 0, evidence: '生成失败' },
      ],
      llmMeta: { fallback: true, error: e instanceof Error ? e.message : String(e) },
    })
    return report.id
  }
}
