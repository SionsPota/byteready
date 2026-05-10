import { Hono } from 'hono'
import { err, ok, trainingCreateSchema } from '@byteready/shared'
import { requireAuth } from '../lib/auth/middleware.ts'
import { getDb } from '../lib/db/client.ts'
import { createTrainingRepository, type TrainingTurnRow } from '../lib/training/repository.ts'
import { createQuestionRepository } from '../lib/questions/repository.ts'
import { createResumeRepository } from '../lib/resume/repository.ts'
import { createProjectRepository } from '../lib/projects/repository.ts'
import { askInterviewerV2 } from '../lib/training/interviewer-v2.ts'
import {
  getNextState,
  getInitialStateForType,
  shouldTransition,
  TRANSITION_MESSAGES,
  STATE_TOPIC_MAP,
  type InterviewState,
  type ProjectBrief,
  type TrainingType,
} from '../lib/training/state-machine.ts'
import { createPhaseReviewRepository } from '../lib/phase-reviews/repository.ts'
import { createFullReviewRepository } from '../lib/full-reviews/repository.ts'
import { generatePhaseReview } from '../lib/reviews/phase-generator.ts'
import { generateFullReview } from '../lib/reviews/full-generator.ts'

export const trainingRoute = new Hono()
trainingRoute.use('*', requireAuth)

const getTrainingRepo = () => createTrainingRepository(getDb())
const getQuestionRepo = () => createQuestionRepository(getDb())
const getResumeRepo = () => createResumeRepository(getDb())
const getProjectRepo = () => createProjectRepository(getDb())
const getPhaseReviewRepo = () => createPhaseReviewRepository(getDb())
const getFullReviewRepo = () => createFullReviewRepository(getDb())

// GET /api/training - 列表
trainingRoute.get('/', (c) => {
  const userId = c.get('userId' as never) as string
  const rows = getTrainingRepo().listByOwner(userId)
  return c.json(ok(rows.map((r) => ({
    id: r.id,
    type: r.type,
    position: r.position,
    targetCompany: r.target_company,
    jobDescription: r.job_description,
    resumeId: r.resume_id,
    projectIds: r.project_ids ? JSON.parse(r.project_ids) : [],
    status: r.status,
    currentState: r.current_state,
    currentPhase: r.current_phase,
    parentSessionId: r.parent_session_id,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    createdAt: r.created_at,
  }))))
})

// POST /api/training - 创建
trainingRoute.post('/', async (c) => {
  const userId = c.get('userId' as never) as string
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json(err('VALIDATION', '请求体必须是 JSON'), 400)
  }

  const parsed = trainingCreateSchema.safeParse(body)
  if (!parsed.success) {
    const messages = parsed.error.issues.map((i) => i.message).join('; ')
    return c.json(err('VALIDATION', messages), 400)
  }

  const { type, position, target_company, job_description, resume_id, project_ids } = parsed.data

  if (resume_id) {
    const resume = getResumeRepo().getById(resume_id)
    if (!resume || resume.owner_id !== userId) {
      return c.json(err('NOT_FOUND', '简历不存在'), 404)
    }
  }

  // 验证 project_ids
  if (project_ids && project_ids.length > 0) {
    for (const pid of project_ids) {
      const project = getProjectRepo().getById(pid)
      if (!project || project.owner_id !== userId) {
        return c.json(err('NOT_FOUND', `项目 ${pid} 不存在`), 404)
      }
    }
  }

  const session = getTrainingRepo().createSession({
    ownerId: userId,
    type: type ?? 'full',
    position,
    targetCompany: target_company,
    jobDescription: job_description,
    resumeId: resume_id,
    projectIds: project_ids,
  })

  return c.json(ok({
    id: session.id,
    type: session.type,
    position: session.position,
    status: session.status,
    createdAt: session.created_at,
  }), 201)
})

// GET /api/training/:id - 详情
trainingRoute.get('/:id', (c) => {
  const userId = c.get('userId' as never) as string
  const id = c.req.param('id')
  const row = getTrainingRepo().getById(id)

  if (!row || row.owner_id !== userId) {
    return c.json(err('NOT_FOUND', '训练不存在'), 404)
  }

  return c.json(ok({
    id: row.id,
    type: row.type,
    position: row.position,
    targetCompany: row.target_company,
    resumeId: row.resume_id,
    projectIds: row.project_ids ? JSON.parse(row.project_ids) : [],
    status: row.status,
    currentState: row.current_state,
    projectsDiscussed: row.projects_discussed ? JSON.parse(row.projects_discussed) : [],
    topicsCovered: row.topics_covered ? JSON.parse(row.topics_covered) : [],
    currentProjectId: row.current_project_id,
    currentTopic: row.current_topic,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    reviewStatus: row.review_status,
    reviewProgress: row.review_progress,
    reviewError: row.review_error,
    reviewStartedAt: row.review_started_at,
    reviewFinishedAt: row.review_finished_at,
    createdAt: row.created_at,
    turns: row.turns.map((t) => ({
      id: t.id,
      index: t.index,
      kind: t.kind,
      text: t.text,
      phase: t.phase,
      state: t.state,
      projectId: t.project_id,
      topic: t.topic,
      questionId: t.question_id,
      createdAt: t.created_at,
    })),
  }))
})

// POST /api/training/:id/start - 开始
trainingRoute.post('/:id/start', (c) => {
  const userId = c.get('userId' as never) as string
  const id = c.req.param('id')
  const repo = getTrainingRepo()
  const row = repo.getById(id)

  if (!row || row.owner_id !== userId) {
    return c.json(err('NOT_FOUND', '训练不存在'), 404)
  }
  if (row.status !== 'pending') {
    return c.json(err('CONFLICT', '训练已开始或已结束'), 409)
  }

  const trainingType = (row.type ?? 'full') as TrainingType
  const initialState = getInitialStateForType(trainingType)

  repo.start(id)
  repo.updateState(id, { currentState: initialState })

  // 根据训练类型生成初始提示
  let introText = '你好，我是今天的面试官。'
  if (trainingType === 'full' || trainingType === 'self_intro') {
    introText += '请先做个简单的自我介绍。'
  } else if (trainingType === 'project_qa') {
    introText += '我们来聊聊你的项目经历。'
  } else if (trainingType === 'random_qa') {
    introText += '接下来进入技术问答环节。'
  }

  repo.createTurn({ sessionId: id, index: 0, kind: 'system', text: introText, state: initialState })
  repo.createTurn({ sessionId: id, index: 1, kind: 'interviewer_main', text: introText, state: initialState })

  return c.json(ok({
    id,
    status: 'running',
    currentState: initialState,
  }))
})

// POST /api/training/:id/answer - 回答
trainingRoute.post('/:id/answer', async (c) => {
  const userId = c.get('userId' as never) as string
  const id = c.req.param('id')
  const repo = getTrainingRepo()
  const session = repo.getById(id)

  if (!session || session.owner_id !== userId) {
    return c.json(err('NOT_FOUND', '训练不存在'), 404)
  }
  if (session.status !== 'running') {
    return c.json(err('CONFLICT', '训练未开始或已结束'), 409)
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

  const currentState = (session.current_state ?? 'SELF_INTRO') as InterviewState
  const maxIdx = repo.getMaxTurnIndex(id)
  const nextIdx = maxIdx + 1

  // 记录候选人回答
  const lastQuestionTurn = session.turns
    .slice()
    .reverse()
    .find((t) => t.kind === 'interviewer_main' || t.kind === 'interviewer_followup')

  repo.createTurn({
    sessionId: id,
    index: nextIdx,
    kind: 'candidate',
    text,
    questionId: lastQuestionTurn?.question_id ?? null,
    phase: 'self_intro',
    state: currentState,
  })

  // 计算当前问题下的追问次数
  const currentQuestionId = lastQuestionTurn?.question_id
  const followUpCount = session.turns.filter(
    (t) => t.question_id === currentQuestionId && t.kind === 'interviewer_followup'
  ).length

  // 判断是否该转换状态
  const elapsedMinutes = session.started_at ? Math.floor((Date.now() - session.started_at) / 60000) : 0

  // 获取项目信息
  let availableProjects: ProjectBrief[] = []
  let currentProject: ProjectBrief | undefined

  if (session.resume_id) {
    const resume = getResumeRepo().getById(session.resume_id)
    if (resume) {
      availableProjects = resume.projects.map((p) => ({
        id: p.id,
        name: p.name,
        summary: p.summary ?? undefined,
        role: p.role ?? undefined,
        keywords: p.keywords ? JSON.parse(p.keywords) : undefined,
      }))
    }
  }

  const projectsDiscussed: string[] = session.projects_discussed ? JSON.parse(session.projects_discussed) : []
  const currentProjectId = session.current_project_id
  if (currentProjectId) {
    currentProject = availableProjects.find((p) => p.id === currentProjectId)
  }

  // 获取训练类型
  const trainingType = (session.type ?? 'full') as TrainingType

  // 检查是否需要状态转换
  let nextState = currentState
  let transitionMessage: string | null = null

  if (shouldTransition(currentState, followUpCount) || replyIndicatesTransition(text)) {
    // 计算下一个状态（受训练类型限制）
    const hasSecondProject = availableProjects.length >= 2 && currentState === 'PROJECT_SINGLE_1'
    nextState = getNextState(currentState, { hasSecondProject, elapsedMinutes, type: trainingType })

    if (nextState !== currentState && nextState !== 'END') {
      transitionMessage = TRANSITION_MESSAGES[nextState]

      // 更新状态
      const stateUpdate: {
        currentState: InterviewState
        currentProjectId?: string | null
        currentTopic?: string
      } = { currentState: nextState }

      // PROJECT_SINGLE 阶段选择下一个项目
      if (nextState === 'PROJECT_SINGLE_1' || nextState === 'PROJECT_SINGLE_2') {
        const undiscussed = availableProjects.filter((p) => !projectsDiscussed.includes(p.id))
        const nextProject = undiscussed[0] ?? availableProjects[0]
        if (nextProject) {
          stateUpdate.currentProjectId = nextProject.id
          if (!projectsDiscussed.includes(nextProject.id)) {
            projectsDiscussed.push(nextProject.id)
          }
        }
      }

      // QNA 阶段设置主题
      if (nextState.startsWith('QNA_')) {
        stateUpdate.currentTopic = STATE_TOPIC_MAP[nextState]
        const topicsCovered: string[] = session.topics_covered ? JSON.parse(session.topics_covered) : []
        if (stateUpdate.currentTopic && !topicsCovered.includes(stateUpdate.currentTopic)) {
          topicsCovered.push(stateUpdate.currentTopic)
        }
        repo.updateState(id, {
          currentState: nextState,
          currentProjectId: stateUpdate.currentProjectId ?? null,
          currentTopic: stateUpdate.currentTopic,
          topicsCovered,
        })
      } else {
        repo.updateState(id, {
          currentState: nextState,
          projectsDiscussed,
          currentProjectId: stateUpdate.currentProjectId ?? null,
        })
      }
    }
  }

  // 获取当前问题（QNA 阶段从题库抽题）
  let currentQuestionText = lastQuestionTurn?.text ?? '请继续。'
  let currentQuestionExpectedPoints: string | undefined
  let questionId: string | null = lastQuestionTurn?.question_id ?? null

  if (nextState.startsWith('QNA_') && (!lastQuestionTurn || shouldTransition(currentState, followUpCount))) {
    const category = STATE_TOPIC_MAP[nextState]
    if (category) {
      const questions = getQuestionRepo().pickRandom({ position: session.position, limit: 1, category })
      const firstQ = questions[0]
      if (firstQ) {
        currentQuestionText = firstQ.main_text
        currentQuestionExpectedPoints = firstQ.expected_points ?? undefined
        questionId = firstQ.id
      }
    }
  }

  // 状态转换处理:
  // - 进入 PROJECT_SINGLE_1/2:不写过渡语、不输出项目列表;把 currentProject 同步到状态机刚选定的项目,
  //   fall through 到下面的 LLM 调用,让面试官针对该项目自然提问。
  // - 其他转换(PROJECT_CROSS / QNA_*):保留过渡语作为分段提示,直接 early return,下一轮再走 LLM。
  const isProjectSingleEntry = transitionMessage && (nextState === 'PROJECT_SINGLE_1' || nextState === 'PROJECT_SINGLE_2')

  if (transitionMessage && !isProjectSingleEntry) {
    const replyIdx = nextIdx + 1
    repo.createTurn({
      sessionId: id,
      index: replyIdx,
      kind: 'interviewer_main',
      text: transitionMessage,
      questionId,
      phase: nextState === 'PROJECT_CROSS'
        ? 'project_cross'
        : nextState.startsWith('QNA_') ? 'q_and_a' : 'self_intro',
      state: nextState,
      topic: nextState.startsWith('QNA_') ? STATE_TOPIC_MAP[nextState] : undefined,
    })

    return c.json(ok({
      reply: transitionMessage,
      decision: 'next_question',
      turnIndex: replyIdx,
      state: nextState,
    }))
  }

  if (isProjectSingleEntry) {
    // 状态机已在前面 stateUpdate 时把 nextProject push 到 projectsDiscussed 末尾
    const latestProjectId = projectsDiscussed[projectsDiscussed.length - 1]
    if (latestProjectId) {
      currentProject = availableProjects.find((p) => p.id === latestProjectId) ?? currentProject
    }
  }

  // SELF_INTRO 阶段不调用 LLM，直接过渡（但受训练类型限制）
  // 注:full 类型走 SELF_INTRO → PROJECT_SINGLE_1 时,转换已在上面 isProjectSingleEntry 分支处理过,
  // 这里只剩 self_intro 训练类型走到 END 的兜底路径。
  if (currentState === 'SELF_INTRO' && !isProjectSingleEntry) {
    const replyIdx = nextIdx + 1
    const nextIntroState = getNextState('SELF_INTRO', { type: trainingType })

    if (nextIntroState === 'END') {
      // 自我介绍训练类型，结束
      const endText = '自我介绍环节结束。'
      repo.createTurn({ sessionId: id, index: replyIdx, kind: 'system', text: endText, state: 'END' })
      repo.end(id)
      return c.json(ok({ reply: endText, decision: 'end', turnIndex: replyIdx, state: 'END' }))
    }

    const transition = TRANSITION_MESSAGES[nextIntroState]
    repo.createTurn({
      sessionId: id,
      index: replyIdx,
      kind: 'interviewer_main',
      text: transition,
      phase: 'self_intro',
      state: currentState,
    })

    // 更新到下一个状态
    const stateUpdate: Record<string, string | string[] | null> = { currentState: nextIntroState }
    if (nextIntroState === 'PROJECT_SINGLE_1') {
      const firstProject = availableProjects[0]
      if (firstProject && !projectsDiscussed.includes(firstProject.id)) {
        projectsDiscussed.push(firstProject.id)
      }
      stateUpdate.projectsDiscussed = projectsDiscussed
      stateUpdate.currentProjectId = firstProject?.id ?? null
    }
    repo.updateState(id, stateUpdate as unknown as import('../lib/training/repository.ts').UpdateStateInput)

    return c.json(ok({
      reply: transition,
      decision: 'next_question',
      turnIndex: replyIdx,
      state: nextIntroState,
    }))
  }

  // 构建简历摘要
  let resumeSummary = ''
  if (availableProjects.length > 0) {
    resumeSummary = availableProjects.map((p) => p.name).join('、')
  }

  // 调用 V2 面试官 LLM
  // 注:用 nextState 而非 currentState,这样 PROJECT_SINGLE_1/2 进入分支(fall through 到这里)
  // 能让 LLM 在新状态上下文下针对 currentProject 提问;无状态转换时 nextState===currentState。
  const reply = await askInterviewerV2({
    state: nextState,
    stateContext: {
      position: session.position,
      targetCompany: session.target_company ?? undefined,
      jobDescription: session.job_description ?? undefined,
      resumeSummary,
      skills: [],
      totalTurns: session.turns.length,
      elapsedMinutes,
      currentProject,
      projectsDiscussed,
      selectedProjects: nextState === 'PROJECT_CROSS'
        ? availableProjects.filter((p) => projectsDiscussed.includes(p.id)).slice(0, 2)
        : undefined,
      topicsCovered: session.topics_covered ? JSON.parse(session.topics_covered) : [],
      currentTopic: STATE_TOPIC_MAP[nextState],
      followUpCount,
    },
    previousTurns: session.turns.map((t) => ({ kind: t.kind, text: t.text })),
    currentQuestion: currentQuestionText,
    currentQuestionExpectedPoints,
  })

  const replyIdx = nextIdx + 1
  const kind = reply.decision === 'next_question' ? 'interviewer_main' : 'interviewer_followup'
  repo.createTurn({
    sessionId: id,
    index: replyIdx,
    kind,
    text: reply.reply,
    questionId,
    phase: nextState.startsWith('QNA_') ? 'q_and_a' : nextState.startsWith('PROJECT_') ? 'project_single' : 'self_intro',
    state: nextState,
    projectId: currentProject?.id,
    topic: STATE_TOPIC_MAP[nextState],
  })

  return c.json(ok({
    reply: reply.reply,
    decision: reply.decision,
    turnIndex: replyIdx,
    state: nextState,
  }))
})

// 检测候选人是否表示"介绍完了"
function replyIndicatesTransition(text: string): boolean {
  const patterns = ['介绍完了', '我的介绍结束', '以上就是', '介绍完毕', '到此结束']
  return patterns.some((p) => text.includes(p))
}

// ===== 复盘相关辅助函数 =====

const PHASE_TO_TYPE: Record<string, 'self_intro' | 'project_qa' | 'random_qa'> = {
  'self_intro': 'self_intro',
  'project_single': 'project_qa',
  'project_cross': 'project_qa',
  'q_and_a': 'random_qa',
}

function resolvePhaseTypes(type: string): Array<'self_intro' | 'project_qa' | 'random_qa'> {
  switch (type) {
    case 'full': return ['self_intro', 'project_qa', 'random_qa']
    case 'self_intro': return ['self_intro']
    case 'project_qa': return ['project_qa']
    case 'random_qa': return ['random_qa']
    default: return []
  }
}

function groupTurnsByPhaseType(turns: TrainingTurnRow[]): Map<string, TrainingTurnRow[]> {
  const map = new Map<string, TrainingTurnRow[]>()
  for (const turn of turns) {
    const phaseType = PHASE_TO_TYPE[turn.phase ?? '']
    if (!phaseType) continue
    if (!map.has(phaseType)) map.set(phaseType, [])
    map.get(phaseType)!.push(turn)
  }
  return map
}

function buildProjectInfoText(
  turns: TrainingTurnRow[],
  projectRepo: ReturnType<typeof createProjectRepository>,
): string {
  const projectIds = [...new Set(turns.map((t) => t.project_id).filter(Boolean))]
  if (projectIds.length === 0) return '（本阶段未关联项目）'

  const projects = projectIds
    .map((pid) => projectRepo.getById(pid!))
    .filter((p): p is NonNullable<typeof p> => p !== null)

  return projects
    .map((p) => {
      const keywords = p.keywords ? (JSON.parse(p.keywords) as string[]) : []
      return `- ${p.name}${p.role ? ` (${p.role})` : ''}${p.summary ? `: ${p.summary}` : ''}${keywords.length > 0 ? ` [${keywords.join(', ')}]` : ''}`
    })
    .join('\n')
}

function buildQuestionsText(
  turns: TrainingTurnRow[],
  questionRepo: ReturnType<typeof createQuestionRepository>,
): string {
  const questionIds = [...new Set(turns.map((t) => t.question_id).filter(Boolean))]
  if (questionIds.length === 0) return '（本阶段无预设问题）'

  return questionIds
    .map((qid, i) => {
      const q = questionRepo.getById(qid!)
      return `${i + 1}. ${q?.main_text ?? '未知问题'}${q?.expected_points ? ` [期望: ${q.expected_points}]` : ''}`
    })
    .join('\n')
}

// ===== 超时工具 =====

const withTimeout = <T>(p: Promise<T>, ms: number, label: string): Promise<T> =>
  Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} 超时（${ms / 1000}s）`)), ms),
    ),
  ])

// ===== 复盘生成核心逻辑（供 /end 与 /regenerate-review 共用） =====

interface RunReviewGenerationOpts {
  sessionId: string
  session: import('../lib/training/repository.ts').TrainingSessionRow & { turns: TrainingTurnRow[] }
  repo: ReturnType<typeof createTrainingRepository>
  phaseReviewRepo: ReturnType<typeof createPhaseReviewRepository>
  fullReviewRepo: ReturnType<typeof createFullReviewRepository>
  projectRepo: ReturnType<typeof createProjectRepository>
  questionRepo: ReturnType<typeof createQuestionRepository>
}

async function runReviewGeneration(opts: RunReviewGenerationOpts): Promise<void> {
  const { sessionId, session, repo, phaseReviewRepo, fullReviewRepo, projectRepo, questionRepo } = opts

  repo.updateReviewStatus(sessionId, {
    status: 'generating',
    startedAt: Date.now(),
    progress: 'starting',
    error: null,
    finishedAt: null,
  })

  const phaseTurnsMap = groupTurnsByPhaseType(session.turns)
  const phaseTypes = resolvePhaseTypes(session.type ?? 'full')

  const phaseResults: Array<{
    phaseType: string
    phaseIndex: number
    result: import('../lib/reviews/phase-generator.ts').PhaseReviewResult
    reviewId: string
  }> = []
  const failedPhaseErrors: Array<{ phaseType: string; error: string }> = []

  for (const [i, phaseType] of phaseTypes.entries()) {
    const phaseTurns = phaseTurnsMap.get(phaseType) ?? []
    if (phaseTurns.length === 0) continue

    repo.updateReviewStatus(sessionId, {
      progress: `phase ${i + 1}/${phaseTypes.length}: ${phaseType}`,
    })

    let projectInfo: string | undefined
    let questions: string | undefined

    if (phaseType === 'project_qa') {
      projectInfo = buildProjectInfoText(phaseTurns, projectRepo)
    }
    if (phaseType === 'random_qa') {
      questions = buildQuestionsText(phaseTurns, questionRepo)
    }

    const firstTurn = phaseTurns[0]!
    const lastTurn = phaseTurns[phaseTurns.length - 1]!
    const elapsedMinutes = Math.max(1, Math.floor((lastTurn.created_at - firstTurn.created_at) / 60000))

    try {
      const result = await withTimeout(
        generatePhaseReview({
          phaseType,
          phaseIndex: i,
          position: session.position,
          targetCompany: session.target_company ?? undefined,
          jobDescription: session.job_description ?? undefined,
          turns: phaseTurns.map((t) => ({ kind: t.kind, text: t.text, index: t.index })),
          projectInfo,
          questions,
          elapsedMinutes,
        }),
        60_000,
        '阶段复盘',
      )

      const phaseReview = phaseReviewRepo.create({
        sessionId,
        phaseType,
        phaseIndex: i,
        scores: result.scores,
        totalScore: result.totalScore,
        evaluation: result.evaluation,
        interviewerReflection: result.interviewerReflection,
        improvementSuggestions: result.improvementSuggestions,
        rubricVersion: 'v3-phase',
        coachVersion: phaseType === 'self_intro' ? 'introduction-coach' : 'interview-coach',
      })

      phaseResults.push({ phaseType, phaseIndex: i, result, reviewId: phaseReview.id })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[training:review] 阶段 ${phaseType} 生成失败:`, msg)
      failedPhaseErrors.push({ phaseType, error: msg })
    }
  }

  // 整面复盘
  if (session.type === 'full' && phaseResults.length > 0) {
    repo.updateReviewStatus(sessionId, { progress: 'full review' })
    try {
      const elapsedMinutes = session.started_at
        ? Math.floor((Date.now() - session.started_at) / 60000)
        : 0

      const fullReviewResult = await withTimeout(
        generateFullReview({
          position: session.position,
          targetCompany: session.target_company ?? undefined,
          jobDescription: session.job_description ?? undefined,
          phaseResults: phaseResults.map((p) => ({
            phaseType: p.phaseType,
            phaseIndex: p.phaseIndex,
            result: p.result,
          })),
          sessionInfo: {
            type: session.type,
            totalTurns: session.turns.length,
            elapsedMinutes,
            trainingType: session.type,
          },
        }),
        90_000,
        '整面复盘',
      )

      fullReviewRepo.create({
        sessionId,
        phaseReviewIds: phaseResults.map((p) => p.reviewId),
        phaseScoresSummary: phaseResults.map((p) => ({
          phaseType: p.phaseType,
          score: p.result.totalScore,
          duration: 0,
        })),
        coherenceScore: fullReviewResult.coherenceScore,
        jdMatchScore: fullReviewResult.jdMatchScore,
        overallPersona: fullReviewResult.overallPersona,
        consolidatedImprovements: fullReviewResult.consolidatedImprovements,
        overallEvaluation: fullReviewResult.overallEvaluation,
        overallScore: fullReviewResult.overallScore,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[training:review] 整面复盘生成失败:', msg)
      failedPhaseErrors.push({ phaseType: 'full_review', error: msg })
    }
  }

  // 聚合最终状态
  const finishedAt = Date.now()
  if (failedPhaseErrors.length === 0 && phaseResults.length > 0) {
    repo.updateReviewStatus(sessionId, {
      status: 'ready',
      progress: null,
      error: null,
      finishedAt,
    })
  } else if (phaseResults.length === 0 && failedPhaseErrors.length > 0) {
    const errors = failedPhaseErrors.map((e) => `${e.phaseType}: ${e.error}`).join('; ')
    repo.updateReviewStatus(sessionId, {
      status: 'failed',
      progress: null,
      error: errors,
      finishedAt,
    })
  } else {
    const errors = failedPhaseErrors.map((e) => `${e.phaseType}: ${e.error}`).join('; ')
    repo.updateReviewStatus(sessionId, {
      status: 'partial',
      progress: null,
      error: errors,
      finishedAt,
    })
  }
}

// POST /api/training/:id/end - 结束
trainingRoute.post('/:id/end', async (c) => {
  const userId = c.get('userId' as never) as string
  const id = c.req.param('id')
  const repo = getTrainingRepo()
  const session = repo.getById(id)

  if (!session || session.owner_id !== userId) {
    return c.json(err('NOT_FOUND', '训练不存在'), 404)
  }
  if (session.status === 'ended') {
    return c.json(err('CONFLICT', '训练已结束'), 409)
  }

  repo.end(id)
  repo.updateState(id, { currentState: 'END' })
  repo.updateReviewStatus(id, {
    status: 'generating',
    startedAt: Date.now(),
    progress: 'starting',
    error: null,
    finishedAt: null,
  })

  // 触发复盘生成（不阻塞返回）
  void (async () => {
    try {
      await runReviewGeneration({
        sessionId: id,
        session,
        repo,
        phaseReviewRepo: getPhaseReviewRepo(),
        fullReviewRepo: getFullReviewRepo(),
        projectRepo: getProjectRepo(),
        questionRepo: getQuestionRepo(),
      })
    } catch (e) {
      console.error('[training:end] 复盘触发失败:', e)
    }
  })()

  return c.json(ok({ id, status: 'ended', reviewStatus: 'generating' }))
})

// POST /api/training/:id/regenerate-review - 重新生成复盘
trainingRoute.post('/:id/regenerate-review', async (c) => {
  const userId = c.get('userId' as never) as string
  const id = c.req.param('id')
  const repo = getTrainingRepo()
  const session = repo.getById(id)

  if (!session || session.owner_id !== userId) {
    return c.json(err('NOT_FOUND', '训练不存在'), 404)
  }
  if (session.status !== 'ended') {
    return c.json(err('CONFLICT', '训练未结束，无法重新生成复盘'), 409)
  }

  const allowedStatuses: string[] = ['failed', 'partial', 'ready']
  if (!allowedStatuses.includes(session.review_status)) {
    return c.json(err('CONFLICT', `当前复盘状态为 ${session.review_status}，无法重新生成`), 409)
  }

  // 清理旧复盘数据
  const phaseReviewRepo = getPhaseReviewRepo()
  const fullReviewRepo = getFullReviewRepo()
  phaseReviewRepo.deleteBySession(id)
  fullReviewRepo.deleteBySession(id)

  repo.updateReviewStatus(id, {
    status: 'generating',
    startedAt: Date.now(),
    progress: 'starting',
    error: null,
    finishedAt: null,
  })

  // 触发复盘生成（不阻塞返回）
  void (async () => {
    try {
      await runReviewGeneration({
        sessionId: id,
        session,
        repo,
        phaseReviewRepo: getPhaseReviewRepo(),
        fullReviewRepo: getFullReviewRepo(),
        projectRepo: getProjectRepo(),
        questionRepo: getQuestionRepo(),
      })
    } catch (e) {
      console.error('[training:regenerate] 复盘重新生成失败:', e)
    }
  })()

  return c.json(ok({ id, reviewStatus: 'generating', reviewProgress: 'starting' }))
})

// GET /api/training/:id/phase-reviews - 阶段复盘列表
trainingRoute.get('/:id/phase-reviews', (c) => {
  const userId = c.get('userId' as never) as string
  const id = c.req.param('id')
  const session = getTrainingRepo().getById(id)

  if (!session || session.owner_id !== userId) {
    return c.json(err('NOT_FOUND', '训练不存在'), 404)
  }

  const rows = getPhaseReviewRepo().listBySession(id)
  return c.json(ok(rows.map((r) => ({
    id: r.id,
    phaseType: r.phase_type,
    phaseIndex: r.phase_index,
    scores: r.scores ? JSON.parse(r.scores) : [],
    totalScore: r.total_score,
    evaluation: r.evaluation,
    interviewerReflection: r.interviewer_reflection,
    improvementSuggestions: r.improvement_suggestions ? JSON.parse(r.improvement_suggestions) : [],
    rubricVersion: r.rubric_version,
    coachVersion: r.coach_version,
    generatedAt: r.generated_at,
  }))))
})

// GET /api/training/:id/phase-reviews/:prid - 单个阶段复盘
trainingRoute.get('/:id/phase-reviews/:prid', (c) => {
  const userId = c.get('userId' as never) as string
  const id = c.req.param('id')
  const prid = c.req.param('prid')
  const session = getTrainingRepo().getById(id)

  if (!session || session.owner_id !== userId) {
    return c.json(err('NOT_FOUND', '训练不存在'), 404)
  }

  const row = getPhaseReviewRepo().getById(prid)
  if (!row || row.session_id !== id) {
    return c.json(err('NOT_FOUND', '阶段复盘不存在'), 404)
  }

  return c.json(ok({
    id: row.id,
    sessionId: row.session_id,
    phaseType: row.phase_type,
    phaseIndex: row.phase_index,
    scores: row.scores ? JSON.parse(row.scores) : [],
    totalScore: row.total_score,
    evaluation: row.evaluation,
    interviewerReflection: row.interviewer_reflection,
    improvementSuggestions: row.improvement_suggestions ? JSON.parse(row.improvement_suggestions) : [],
    rubricVersion: row.rubric_version,
    coachVersion: row.coach_version,
    generatedAt: row.generated_at,
  }))
})

// GET /api/training/:id/full-review - 整面复盘
trainingRoute.get('/:id/full-review', (c) => {
  const userId = c.get('userId' as never) as string
  const id = c.req.param('id')
  const session = getTrainingRepo().getById(id)

  if (!session || session.owner_id !== userId) {
    return c.json(err('NOT_FOUND', '训练不存在'), 404)
  }

  const row = getFullReviewRepo().getBySessionId(id)
  if (!row) {
    return c.json(err('NOT_FOUND', '整面复盘不存在'), 404)
  }

  return c.json(ok({
    id: row.id,
    sessionId: row.session_id,
    phaseScoresSummary: row.phase_scores_summary ? JSON.parse(row.phase_scores_summary) : [],
    coherenceScore: row.coherence_score,
    jdMatchScore: row.jd_match_score,
    overallPersona: row.overall_persona,
    consolidatedImprovements: row.consolidated_improvements ? JSON.parse(row.consolidated_improvements) : [],
    overallEvaluation: row.overall_evaluation,
    overallScore: row.overall_score,
    generatedAt: row.generated_at,
  }))
})

// DELETE /api/training/:id
trainingRoute.delete('/:id', (c) => {
  const userId = c.get('userId' as never) as string
  const id = c.req.param('id')
  const repo = getTrainingRepo()
  const session = repo.getById(id)

  if (!session || session.owner_id !== userId) {
    return c.json(err('NOT_FOUND', '训练不存在'), 404)
  }

  repo.delete(id)
  return c.json(ok({ message: '已删除' }))
})
