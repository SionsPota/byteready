import type { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'
import { env } from '../../env.ts'
import { getDb, closeDb } from '../db/client.ts'
import { askInterviewerV2 } from '../training/interviewer-v2.ts'
import {
  getNextState,
  getInitialStateForType,
  shouldTransition,
  TRANSITION_MESSAGES,
  STATE_TOPIC_MAP,
  type InterviewState,
  type TrainingType,
} from '../training/state-machine.ts'
import { createTrainingRepository, type TrainingTurnRow } from '../training/repository.ts'
import { createQuestionRepository } from '../questions/repository.ts'
import { createProjectRepository } from '../projects/repository.ts'
import { createPhaseReviewRepository } from '../phase-reviews/repository.ts'
import { createFullReviewRepository } from '../full-reviews/repository.ts'
import { generatePhaseReview } from '../reviews/phase-generator.ts'
import { generateFullReview } from '../reviews/full-generator.ts'
import { seedAccount } from './seed.ts'
import type { DemoAccount, DemoSession } from './seed.ts'

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

// 从 session turns 中提取 candidate 回答脚本
function extractCandidateScript(session: DemoSession): string[] {
  return session.turns
    .filter((t) => t.kind === 'candidate')
    .map((t) => t.text)
}

// 清理已有的 demo session 数据
function cleanupDemoSessions(db: DatabaseSync, ownerId: string): void {
  const sessions = db.prepare('SELECT id FROM training_sessions WHERE owner_id = ?').all(ownerId) as Array<{ id: string }>
  for (const s of sessions) {
    db.prepare('DELETE FROM training_turns WHERE session_id = ?').run(s.id)
    db.prepare('DELETE FROM phase_reviews WHERE session_id = ?').run(s.id)
    db.prepare('DELETE FROM full_reviews WHERE session_id = ?').run(s.id)
    db.prepare('DELETE FROM training_sessions WHERE id = ?').run(s.id)
  }
  console.log(`[replay] Cleaned up ${sessions.length} existing sessions for ${ownerId}`)
}

// 生成真实复盘
async function generateRealReviews(
  db: DatabaseSync,
  sessionId: string,
  position: string,
  targetCompany: string | null,
  jobDescription: string | null,
  sessionType: string,
  startedAt: number | null,
): Promise<void> {
  const trainingRepo = createTrainingRepository(db)
  const phaseReviewRepo = createPhaseReviewRepository(db)
  const fullReviewRepo = createFullReviewRepository(db)
  const projectRepo = createProjectRepository(db)
  const questionRepo = createQuestionRepository(db)

  const session = trainingRepo.getById(sessionId)
  if (!session) {
    console.error(`[replay] Session ${sessionId} not found for review generation`)
    return
  }

  const phaseTurnsMap = groupTurnsByPhaseType(session.turns)
  const phaseTypes = resolvePhaseTypes(sessionType)
  const phaseResults: Array<{
    phaseType: string
    phaseIndex: number
    result: Awaited<ReturnType<typeof generatePhaseReview>>
    reviewId: string
  }> = []

  for (const [i, phaseType] of phaseTypes.entries()) {
    const phaseTurns = phaseTurnsMap.get(phaseType) ?? []
    if (phaseTurns.length === 0) continue

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

    console.log(`[replay] Generating phase review for ${phaseType}...`)
    const result = await generatePhaseReview({
      phaseType,
      phaseIndex: i,
      position,
      targetCompany: targetCompany ?? undefined,
      jobDescription: jobDescription ?? undefined,
      turns: phaseTurns.map((t) => ({ kind: t.kind, text: t.text, index: t.index })),
      projectInfo,
      questions,
      elapsedMinutes,
    })

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
    console.log(`[replay] Phase review created: ${phaseReview.id}, score: ${result.totalScore.toFixed(2)}`)
  }

  if (sessionType === 'full' && phaseResults.length > 0) {
    const elapsedMinutes = startedAt ? Math.floor((Date.now() - startedAt) / 60000) : 0
    console.log(`[replay] Generating full review...`)
    const fullReviewResult = await generateFullReview({
      position,
      targetCompany: targetCompany ?? undefined,
      jobDescription: jobDescription ?? undefined,
      phaseResults: phaseResults.map((p) => ({
        phaseType: p.phaseType,
        phaseIndex: p.phaseIndex,
        result: p.result,
      })),
      sessionInfo: {
        type: sessionType,
        totalTurns: session.turns.length,
        elapsedMinutes,
        trainingType: sessionType,
      },
    })

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
    console.log(`[replay] Full review created, overall score: ${fullReviewResult.overallScore.toFixed(2)}`)
  }
}

// 核心 replay 逻辑
async function replayOneSession(
  db: DatabaseSync,
  userId: string,
  resumeId: string,
  projectIds: string[],
  session: DemoSession,
  candidateScript: string[],
): Promise<void> {
  const repo = createTrainingRepository(db)
  const questionRepo = createQuestionRepository(db)
  const projectRepo = createProjectRepository(db)

  // 1. 创建 session
  const sess = repo.createSession({
    ownerId: userId,
    type: session.type,
    position: session.position,
    targetCompany: session.targetCompany ?? undefined,
    jobDescription: session.jobDescription ?? undefined,
    resumeId,
    projectIds,
  })
  const sessionId = sess.id

  // 2. Start
  const trainingType = (session.type ?? 'full') as TrainingType
  const initialState = getInitialStateForType(trainingType)
  repo.start(sessionId)
  repo.updateState(sessionId, { currentState: initialState })

  let introText = '你好，我是今天的面试官。'
  if (trainingType === 'full' || trainingType === 'self_intro') {
    introText += '请先做个简单的自我介绍。'
  } else if (trainingType === 'project_qa') {
    introText += '我们来聊聊你的项目经历。'
  } else if (trainingType === 'random_qa') {
    introText += '接下来进入技术问答环节。'
  }

  const startedAt = Date.now()
  const turns: TrainingTurnRow[] = []
  let turnIndex = 0

  // system + interviewer 开场
  const systemTurn = repo.createTurn({ sessionId, index: turnIndex++, kind: 'system', text: introText, state: initialState })
  turns.push(systemTurn)
  const introTurn = repo.createTurn({ sessionId, index: turnIndex++, kind: 'interviewer_main', text: introText, state: initialState })
  turns.push(introTurn)

  // 3. 主循环
  let currentState: InterviewState = initialState
  let scriptIndex = 0
  let followUpCount = 0
  let projectsDiscussed: string[] = []
  let topicsCovered: string[] = []
  let currentProjectId: string | null = null
  let currentQuestionId: string | null = null
  let currentQuestionText = introText
  let currentQuestionExpectedPoints: string | undefined

  // 获取项目信息
  const availableProjects = projectIds
    .map((pid) => projectRepo.getById(pid))
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .map((p) => ({
      id: p.id,
      name: p.name,
      summary: p.summary ?? undefined,
      role: p.role ?? undefined,
      keywords: p.keywords ? (JSON.parse(p.keywords) as string[]) : undefined,
    }))

  const maxRounds = 50 // 安全上限
  let roundCount = 0

  while (currentState !== 'END' && scriptIndex < candidateScript.length && roundCount < maxRounds) {
    roundCount++

    // SELF_INTRO 特殊处理：不调用 LLM，直接过渡
    if (currentState === 'SELF_INTRO') {
      const candidateText = candidateScript[scriptIndex++] ?? '（无回答）'
      const candTurn = repo.createTurn({
        sessionId, index: turnIndex++, kind: 'candidate', text: candidateText,
        phase: 'self_intro', state: currentState,
      })
      turns.push(candTurn)

      const nextIntroState = getNextState('SELF_INTRO', { type: trainingType })
      if (nextIntroState === 'END') {
        currentState = 'END'
        break
      }

      const transition = TRANSITION_MESSAGES[nextIntroState]
      const transTurn = repo.createTurn({
        sessionId, index: turnIndex++, kind: 'interviewer_main', text: transition,
        phase: 'self_intro', state: currentState,
      })
      turns.push(transTurn)

      currentState = nextIntroState
      const stateUpdate: Record<string, unknown> = { currentState: nextIntroState }
      if (nextIntroState === 'PROJECT_SINGLE_1') {
        const firstProject = availableProjects[0]
        if (firstProject && !projectsDiscussed.includes(firstProject.id)) {
          projectsDiscussed = [...projectsDiscussed, firstProject.id]
        }
        stateUpdate.projectsDiscussed = projectsDiscussed
        stateUpdate.currentProjectId = firstProject?.id ?? null
        currentProjectId = firstProject?.id ?? null

        // 添加项目列表提示
        const projectList = availableProjects.map((p) => `- ${p.name}`).join('\n')
        const projectPrompt = `请介绍一下你的项目经历，我们先从你最有代表性的项目开始。\n\n你的项目列表：\n${projectList}`
        const promptTurn = repo.createTurn({
          sessionId, index: turnIndex++, kind: 'interviewer_main', text: projectPrompt,
          phase: 'project_single', state: currentState,
        })
        turns.push(promptTurn)
      }
      repo.updateState(sessionId, stateUpdate as never)
      followUpCount = 0
      continue
    }

    // 非 SELF_INTRO：调用 LLM 生成面试官问题/追问
    const elapsedMinutes = Math.floor((Date.now() - startedAt) / 60000)
    const currentProject = currentProjectId ? availableProjects.find((p) => p.id === currentProjectId) : undefined

    // 构建上下文
    const previousTurns = turns.map((t) => ({ kind: t.kind, text: t.text }))

    // QNA 阶段抽题
    if (currentState.startsWith('QNA_') && (!currentQuestionId || followUpCount === 0)) {
      const category = STATE_TOPIC_MAP[currentState]
      if (category) {
        const questions = questionRepo.pickRandom({ position: session.position, limit: 1, category })
        const firstQ = questions[0]
        if (firstQ) {
          currentQuestionText = firstQ.main_text
          currentQuestionExpectedPoints = firstQ.expected_points ?? undefined
          currentQuestionId = firstQ.id
        }
      }
    }

    const reply = await askInterviewerV2({
      state: currentState,
      stateContext: {
        position: session.position,
        targetCompany: session.targetCompany ?? undefined,
        jobDescription: session.jobDescription ?? undefined,
        resumeSummary: availableProjects.map((p) => p.name).join('、'),
        skills: [],
        totalTurns: turns.length,
        elapsedMinutes,
        currentProject,
        projectsDiscussed,
        selectedProjects: currentState === 'PROJECT_CROSS'
          ? availableProjects.filter((p) => projectsDiscussed.includes(p.id)).slice(0, 2)
          : undefined,
        topicsCovered,
        currentTopic: STATE_TOPIC_MAP[currentState],
        followUpCount,
      },
      previousTurns,
      currentQuestion: currentQuestionText,
      currentQuestionExpectedPoints,
    })

    const kind = reply.decision === 'follow_up' ? 'interviewer_followup' : 'interviewer_main'
    const ivTurn = repo.createTurn({
      sessionId, index: turnIndex++, kind,
      text: reply.reply,
      questionId: currentQuestionId,
      phase: currentState.startsWith('QNA_') ? 'q_and_a' : currentState.startsWith('PROJECT_') ? 'project_single' : 'self_intro',
      state: currentState,
      projectId: currentProject?.id,
      topic: STATE_TOPIC_MAP[currentState],
    })
    turns.push(ivTurn)

    if (reply.decision === 'end') {
      currentState = 'END'
      break
    }

    // 插入 candidate 回答
    const candidateText = candidateScript[scriptIndex++] ?? '以上就是我的回答，谢谢。'
    const candTurn = repo.createTurn({
      sessionId, index: turnIndex++, kind: 'candidate', text: candidateText,
      questionId: currentQuestionId,
      phase: currentState.startsWith('QNA_') ? 'q_and_a' : currentState.startsWith('PROJECT_') ? 'project_single' : 'self_intro',
      state: currentState,
      projectId: currentProject?.id,
      topic: STATE_TOPIC_MAP[currentState],
    })
    turns.push(candTurn)

    // 更新 followUpCount
    if (reply.decision === 'follow_up') {
      followUpCount++
    } else {
      followUpCount = 0
    }

    // 检查状态转换
    if (reply.decision === 'next_question' || shouldTransition(currentState, followUpCount)) {
      const hasSecondProject = availableProjects.length >= 2 && currentState === 'PROJECT_SINGLE_1'
      const nextState = getNextState(currentState, { hasSecondProject, elapsedMinutes, type: trainingType })

      if (nextState !== currentState && nextState !== 'END') {
        const transition = TRANSITION_MESSAGES[nextState]
        if (transition) {
          const transTurn = repo.createTurn({
            sessionId, index: turnIndex++, kind: 'interviewer_main', text: transition,
            phase: nextState.startsWith('QNA_') ? 'q_and_a' : nextState.startsWith('PROJECT_') ? 'project_single' : 'self_intro',
            state: nextState,
            topic: STATE_TOPIC_MAP[nextState],
          })
          turns.push(transTurn)
        }

        // 更新状态相关字段
        const stateUpdate: Record<string, unknown> = { currentState: nextState }
        if (nextState === 'PROJECT_SINGLE_1' || nextState === 'PROJECT_SINGLE_2') {
          const undiscussed = availableProjects.filter((p) => !projectsDiscussed.includes(p.id))
          const nextProject = undiscussed[0] ?? availableProjects[0]
          if (nextProject) {
            currentProjectId = nextProject.id
            stateUpdate.currentProjectId = nextProject.id
            if (!projectsDiscussed.includes(nextProject.id)) {
              projectsDiscussed = [...projectsDiscussed, nextProject.id]
            }
            stateUpdate.projectsDiscussed = projectsDiscussed
          }
        }
        if (nextState.startsWith('QNA_')) {
          const topic = STATE_TOPIC_MAP[nextState]
          stateUpdate.currentTopic = topic
          if (topic && !topicsCovered.includes(topic)) {
            topicsCovered = [...topicsCovered, topic]
          }
          stateUpdate.topicsCovered = topicsCovered
          currentQuestionId = null
          currentQuestionText = ''
          currentQuestionExpectedPoints = undefined
        }
        repo.updateState(sessionId, stateUpdate as never)
        currentState = nextState
        followUpCount = 0
      } else if (nextState === 'END') {
        currentState = 'END'
      }
    }
  }

  // 4. End session
  repo.end(sessionId)
  repo.updateState(sessionId, {
    currentState: 'END',
    projectsDiscussed,
    topicsCovered,
    currentProjectId,
  })

  // 更新 turn 时间戳为合理间隔
  for (let i = 0; i < turns.length; i++) {
    const turnTime = startedAt + i * 90000 // 每轮 90 秒
    const turn = turns[i]
    if (turn) db.prepare('UPDATE training_turns SET created_at = ? WHERE id = ?').run(turnTime, turn.id)
  }

  console.log(`[replay] Session ${sessionId} ended, ${turns.length} turns, state: ${currentState}`)

  // 5. 生成真实复盘
  await generateRealReviews(
    db, sessionId, session.position,
    session.targetCompany, session.jobDescription,
    session.type, startedAt
  )
}

export async function replayAccount(db: DatabaseSync, account: DemoAccount): Promise<void> {
  // 先 seed 基础数据（幂等）
  seedAccount(db, account)

  // 清理已有的 session 数据
  cleanupDemoSessions(db, account.user.id)

  const projectIds = account.projects.map((p) => p.id)

  for (const session of account.sessions) {
    const script = extractCandidateScript(session)
    console.log(`[replay] Replaying session ${session.id} (${session.type}, ${script.length} candidate answers)...`)
    await replayOneSession(db, account.user.id, account.resume.id, projectIds, session, script)
  }
}

export async function replayAll(accounts: DemoAccount[]): Promise<void> {
  if (!env.KIMI_API_KEY) {
    console.error('[replay] KIMI_API_KEY not configured, cannot generate real LLM responses')
    console.error('[replay] Please set KIMI_API_KEY in your .env file')
    process.exit(1)
  }

  const db = getDb()
  try {
    for (const account of accounts) {
      await replayAccount(db, account)
    }
    console.log('[replay] All demo sessions replayed successfully with real LLM')
  } catch (e) {
    console.error('[replay] Failed:', e)
    throw e
  } finally {
    closeDb()
  }
}
