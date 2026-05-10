import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import type { DatabaseSync } from 'node:sqlite'
import { env } from '../../env.ts'
import { getDb } from '../db/client.ts'
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
import { createTrainingRepository } from '../training/repository.ts'
import { createQuestionRepository } from '../questions/repository.ts'
import { createProjectRepository } from '../projects/repository.ts'
import { createPhaseReviewRepository } from '../phase-reviews/repository.ts'
import { createFullReviewRepository } from '../full-reviews/repository.ts'
import { generatePhaseReview } from '../reviews/phase-generator.ts'
import { generateFullReview } from '../reviews/full-generator.ts'
import { seedAccount } from './seed.ts'
import { frontendAccount } from './frontend-data.ts'
import { aiAgentAccount } from './ai-agent-data.ts'
import type { DemoAccount, DemoSession, DemoTurn } from './seed.ts'

const DEFAULT_STATE_FILE = join(env.BYTEREADY_DB_PATH, '..', '.demo-replay-state.json')

const ACCOUNTS: Record<string, DemoAccount> = {
  frontend: frontendAccount,
  'ai-agent': aiAgentAccount,
}

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

// ======== 持久化状态 ========

interface PersistedState {
  version: number
  accountName: string
  sessionIndex: number
  sessionId: string
  currentState: InterviewState
  turnIndex: number
  scriptIndex: number
  followUpCount: number
  projectsDiscussed: string[]
  topicsCovered: string[]
  currentProjectId: string | null
  currentQuestionId: string | null
  currentQuestionText: string
  currentQuestionExpectedPoints?: string
  startedAt: number
  isStarted: boolean
  completed: boolean
  lastEvent?: string
  lastDetail?: string
  projectIds: string[]
  resumeId: string
  userId: string
  position: string
  targetCompany: string | null
  jobDescription: string | null
  type: string
}

function loadState(stateFilePath: string = DEFAULT_STATE_FILE): PersistedState | null {
  if (!existsSync(stateFilePath)) return null
  try {
    return JSON.parse(readFileSync(stateFilePath, 'utf-8')) as PersistedState
  } catch {
    return null
  }
}

function saveState(state: PersistedState, stateFilePath: string = DEFAULT_STATE_FILE): void {
  writeFileSync(stateFilePath, JSON.stringify(state, null, 2))
}

function clearState(stateFilePath: string = DEFAULT_STATE_FILE): void {
  try {
    writeFileSync(stateFilePath, '{}')
  } catch { /* noop */ }
}

// ======== 复盘辅助 ========

function buildProjectInfoText(
  db: DatabaseSync,
  turns: Array<{ project_id: string | null; kind: string; text: string }>,
): string {
  const projectRepo = createProjectRepository(db)
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
  db: DatabaseSync,
  turns: Array<{ question_id: string | null; kind: string; text: string }>,
): string {
  const questionRepo = createQuestionRepository(db)
  const questionIds = [...new Set(turns.map((t) => t.question_id).filter(Boolean))]
  if (questionIds.length === 0) return '（本阶段无预设问题）'
  return questionIds
    .map((qid, i) => {
      const q = questionRepo.getById(qid!)
      return `${i + 1}. ${q?.main_text ?? '未知问题'}${q?.expected_points ? ` [期望: ${q.expected_points}]` : ''}`
    })
    .join('\n')
}

// ======== 核心引擎 ========

export interface EngineStatus {
  sessionId: string
  accountName: string
  sessionIndex: number
  sessionType: string
  position: string
  targetCompany: string | null
  state: InterviewState
  turnCount: number
  scriptIndex: number
  scriptTotal: number
  lastInterviewerQuestion: string
  lastEvent?: string
  lastDetail?: string
  completed: boolean
}

export interface StepResult {
  event: 'interviewer_question' | 'candidate_answer' | 'state_transition' | 'end'
  state: InterviewState
  text: string
  detail?: string
  done: boolean
}

export class InteractiveEngine {
  private db: DatabaseSync
  private state: PersistedState
  private stateFilePath: string
  private repo = () => createTrainingRepository(this.db)
  private questionRepo = () => createQuestionRepository(this.db)
  private projectRepo = () => createProjectRepository(this.db)

  constructor(db: DatabaseSync, state: PersistedState, stateFilePath: string = DEFAULT_STATE_FILE) {
    this.db = db
    this.state = state
    this.stateFilePath = stateFilePath
  }

  static load(db: DatabaseSync, stateFilePath: string = DEFAULT_STATE_FILE): InteractiveEngine | null {
    const s = loadState(stateFilePath)
    if (!s || !s.sessionId) return null
    return new InteractiveEngine(db, s, stateFilePath)
  }

  static create(
    db: DatabaseSync,
    accountName: string,
    sessionIndex: number,
    stateFilePath: string = DEFAULT_STATE_FILE,
  ): InteractiveEngine {
    const account = ACCOUNTS[accountName]
    if (!account) throw new Error(`Unknown account: ${accountName}`)

    // Seed base data
    seedAccount(db, account)

    const session = account.sessions[sessionIndex]
    if (!session) throw new Error(`Invalid session index: ${sessionIndex}`)

    const projectIds = account.projects.map((p) => p.id)
    const trainingType = (session.type ?? 'full') as TrainingType
    const initialState = getInitialStateForType(trainingType)

    // Create session
    const repo = createTrainingRepository(db)
    const sess = repo.createSession({
      ownerId: account.user.id,
      type: session.type,
      position: session.position,
      targetCompany: session.targetCompany ?? undefined,
      jobDescription: session.jobDescription ?? undefined,
      resumeId: account.resume.id,
      projectIds,
    })

    // Start
    repo.start(sess.id)
    repo.updateState(sess.id, { currentState: initialState })

    let introText = '你好，我是今天的面试官。'
    if (trainingType === 'full' || trainingType === 'self_intro') introText += '请先做个简单的自我介绍。'
    else if (trainingType === 'project_qa') introText += '我们来聊聊你的项目经历。'
    else if (trainingType === 'random_qa') introText += '接下来进入技术问答环节。'

    const startedAt = Date.now()
    repo.createTurn({ sessionId: sess.id, index: 0, kind: 'system', text: introText, state: initialState })
    repo.createTurn({ sessionId: sess.id, index: 1, kind: 'interviewer_main', text: introText, state: initialState })

    const script = session.turns.filter((t) => t.kind === 'candidate').map((t) => t.text)

    const persisted: PersistedState = {
      version: 1,
      accountName,
      sessionIndex,
      sessionId: sess.id,
      currentState: initialState,
      turnIndex: 2,
      scriptIndex: 0,
      followUpCount: 0,
      projectsDiscussed: [],
      topicsCovered: [],
      currentProjectId: null,
      currentQuestionId: null,
      currentQuestionText: introText,
      startedAt,
      isStarted: true,
      completed: false,
      projectIds,
      resumeId: account.resume.id,
      userId: account.user.id,
      position: session.position,
      targetCompany: session.targetCompany,
      jobDescription: session.jobDescription,
      type: session.type,
    }

    saveState(persisted, stateFilePath)
    return new InteractiveEngine(db, persisted, stateFilePath)
  }

  getStatus(): EngineStatus {
    return {
      sessionId: this.state.sessionId,
      accountName: this.state.accountName,
      sessionIndex: this.state.sessionIndex,
      sessionType: this.state.type,
      position: this.state.position,
      targetCompany: this.state.targetCompany,
      state: this.state.currentState,
      turnCount: this.state.turnIndex,
      scriptIndex: this.state.scriptIndex,
      scriptTotal: this.getAccount().sessions[this.state.sessionIndex]!.turns.filter((t) => t.kind === 'candidate').length,
      lastInterviewerQuestion: this.state.currentQuestionText,
      lastEvent: this.state.lastEvent,
      lastDetail: this.state.lastDetail,
      completed: this.state.completed,
    }
  }

  private getAccount(): DemoAccount {
    return ACCOUNTS[this.state.accountName]!
  }

  private getSession(): DemoSession {
    return this.getAccount().sessions[this.state.sessionIndex]!
  }

  private getAvailableProjects() {
    return this.state.projectIds
      .map((pid) => this.projectRepo().getById(pid))
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .map((p) => ({
        id: p.id,
        name: p.name,
        summary: p.summary ?? undefined,
        role: p.role ?? undefined,
        keywords: p.keywords ? (JSON.parse(p.keywords) as string[]) : undefined,
      }))
  }

  private loadTurnsFromDb() {
    const session = this.repo().getById(this.state.sessionId)
    return session?.turns ?? []
  }

  private appendTurn(turn: { kind: string; text: string; state: string; phase?: string; projectId?: string; topic?: string; questionId?: string | null }) {
    const repo = this.repo()
    const t = repo.createTurn({
      sessionId: this.state.sessionId,
      index: this.state.turnIndex++,
      kind: turn.kind,
      text: turn.text,
      state: turn.state,
      phase: turn.phase ?? null,
      projectId: turn.projectId ?? null,
      topic: turn.topic ?? null,
      questionId: turn.questionId ?? null,
    })
    return t
  }

  async step(answerText?: string): Promise<StepResult> {
    if (this.state.completed) {
      return { event: 'end', state: 'END', text: '面试已结束', done: true }
    }

    const dbTurns = this.loadTurnsFromDb()
    const trainingType = (this.state.type ?? 'full') as TrainingType

    // === SELF_INTRO ===
    if (this.state.currentState === 'SELF_INTRO') {
      return await this.handleSelfIntro(answerText)
    }

    // === 非 SELF_INTRO：调用 LLM ===
    const elapsedMinutes = Math.floor((Date.now() - this.state.startedAt) / 60000)
    const availableProjects = this.getAvailableProjects()
    const currentProject = this.state.currentProjectId ? availableProjects.find((p) => p.id === this.state.currentProjectId) : undefined

    // QNA 阶段抽题
    if (this.state.currentState.startsWith('QNA_') && (!this.state.currentQuestionId || this.state.followUpCount === 0)) {
      const category = STATE_TOPIC_MAP[this.state.currentState]
      if (category) {
        const questions = this.questionRepo().pickRandom({ position: this.state.position, limit: 1, category })
        const firstQ = questions[0]
        if (firstQ) {
          this.state.currentQuestionText = firstQ.main_text
          this.state.currentQuestionExpectedPoints = firstQ.expected_points ?? undefined
          this.state.currentQuestionId = firstQ.id
        }
      }
    }

    const previousTurns = dbTurns.map((t) => ({ kind: t.kind, text: t.text }))
    const reply = await askInterviewerV2({
      state: this.state.currentState,
      stateContext: {
        position: this.state.position,
        targetCompany: this.state.targetCompany ?? undefined,
        jobDescription: this.state.jobDescription ?? undefined,
        resumeSummary: availableProjects.map((p) => p.name).join('、'),
        skills: [],
        totalTurns: dbTurns.length,
        elapsedMinutes,
        currentProject,
        projectsDiscussed: this.state.projectsDiscussed,
        selectedProjects: this.state.currentState === 'PROJECT_CROSS'
          ? availableProjects.filter((p) => this.state.projectsDiscussed.includes(p.id)).slice(0, 2)
          : undefined,
        topicsCovered: this.state.topicsCovered,
        currentTopic: STATE_TOPIC_MAP[this.state.currentState],
        followUpCount: this.state.followUpCount,
      },
      previousTurns,
      currentQuestion: this.state.currentQuestionText,
      currentQuestionExpectedPoints: this.state.currentQuestionExpectedPoints,
    })

    // 插入面试官 turn
    const ivKind = reply.decision === 'follow_up' ? 'interviewer_followup' : 'interviewer_main'
    this.appendTurn({
      kind: ivKind,
      text: reply.reply,
      state: this.state.currentState,
      phase: this.state.currentState.startsWith('QNA_') ? 'q_and_a' : this.state.currentState.startsWith('PROJECT_') ? 'project_single' : 'self_intro',
      projectId: currentProject?.id,
      topic: STATE_TOPIC_MAP[this.state.currentState],
      questionId: this.state.currentQuestionId,
    })

    // 更新当前面试官问题（无论是否提供回答）
    this.state.currentQuestionText = reply.reply

    if (reply.decision === 'end') {
      await this.finalize()
      this.state.lastEvent = 'end'
      this.state.lastDetail = 'LLM决定结束面试'
      saveState(this.state, this.stateFilePath)
      return { event: 'end', state: 'END', text: reply.reply, detail: 'LLM决定结束面试', done: true }
    }

    // 如果没有提供回答，返回等待输入
    if (answerText === undefined) {
      this.state.lastEvent = 'interviewer_question'
      this.state.lastDetail = reply.decision
      saveState(this.state, this.stateFilePath)
      return { event: 'interviewer_question', state: this.state.currentState, text: reply.reply, detail: `decision: ${reply.decision}`, done: false }
    }

    // 插入 candidate turn
    this.appendTurn({
      kind: 'candidate',
      text: answerText,
      state: this.state.currentState,
      phase: this.state.currentState.startsWith('QNA_') ? 'q_and_a' : this.state.currentState.startsWith('PROJECT_') ? 'project_single' : 'self_intro',
      projectId: currentProject?.id,
      topic: STATE_TOPIC_MAP[this.state.currentState],
      questionId: this.state.currentQuestionId,
    })

    // 更新 followUpCount
    if (reply.decision === 'follow_up') {
      this.state.followUpCount++
    } else {
      this.state.followUpCount = 0
    }

    // 检查状态转换
    let transitioned = false
    if (reply.decision === 'next_question' || shouldTransition(this.state.currentState, this.state.followUpCount)) {
      const hasSecondProject = availableProjects.length >= 2 && this.state.currentState === 'PROJECT_SINGLE_1'
      const nextState = getNextState(this.state.currentState, { hasSecondProject, elapsedMinutes, type: trainingType })

      if (nextState !== this.state.currentState && nextState !== 'END') {
        const transition = TRANSITION_MESSAGES[nextState]
        if (transition) {
          this.appendTurn({
            kind: 'interviewer_main',
            text: transition,
            state: nextState,
            phase: nextState.startsWith('QNA_') ? 'q_and_a' : nextState.startsWith('PROJECT_') ? 'project_single' : 'self_intro',
            topic: STATE_TOPIC_MAP[nextState],
          })
        }

        if (nextState === 'PROJECT_SINGLE_1' || nextState === 'PROJECT_SINGLE_2') {
          const undiscussed = availableProjects.filter((p) => !this.state.projectsDiscussed.includes(p.id))
          const nextProject = undiscussed[0] ?? availableProjects[0]
          if (nextProject) {
            this.state.currentProjectId = nextProject.id
            if (!this.state.projectsDiscussed.includes(nextProject.id)) {
              this.state.projectsDiscussed = [...this.state.projectsDiscussed, nextProject.id]
            }
          }
        }
        if (nextState.startsWith('QNA_')) {
          const topic = STATE_TOPIC_MAP[nextState]
          if (topic && !this.state.topicsCovered.includes(topic)) {
            this.state.topicsCovered = [...this.state.topicsCovered, topic]
          }
          this.state.currentQuestionId = null
          this.state.currentQuestionText = ''
          this.state.currentQuestionExpectedPoints = undefined
        }

        this.repo().updateState(this.state.sessionId, {
          currentState: nextState,
          projectsDiscussed: this.state.projectsDiscussed,
          topicsCovered: this.state.topicsCovered,
          currentProjectId: this.state.currentProjectId,
          currentTopic: STATE_TOPIC_MAP[nextState],
        })

        this.state.currentState = nextState
        this.state.followUpCount = 0
        transitioned = true
      } else if (nextState === 'END') {
        await this.finalize()
        this.state.lastEvent = 'end'
        this.state.lastDetail = '面试正常结束'
        saveState(this.state, this.stateFilePath)
        return { event: 'end', state: 'END', text: '面试正常结束', detail: `共${this.state.turnIndex}轮对话`, done: true }
      }
    }

    this.state.lastEvent = transitioned ? 'state_transition' : 'candidate_answer'
    this.state.lastDetail = transitioned ? `转换至 ${this.state.currentState}` : 'candidate回答已记录'
    saveState(this.state)

    return {
      event: transitioned ? 'state_transition' : 'candidate_answer',
      state: this.state.currentState,
      text: answerText,
      detail: this.state.lastDetail,
      done: false,
    }
  }

  private async handleSelfIntro(answerText?: string): Promise<StepResult> {
    // SELF_INTRO: 先显示问题（开场白已经在start中插入了）
    if (answerText === undefined) {
      this.state.lastEvent = 'interviewer_question'
      this.state.lastDetail = '请自我介绍'
      saveState(this.state, this.stateFilePath)
      return { event: 'interviewer_question', state: 'SELF_INTRO', text: '你好，我是今天的面试官。请先做个简单的自我介绍。', done: false }
    }

    this.appendTurn({ kind: 'candidate', text: answerText, state: 'SELF_INTRO', phase: 'self_intro' })

    const trainingType = (this.state.type ?? 'full') as TrainingType
    const nextIntroState = getNextState('SELF_INTRO', { type: trainingType })

    if (nextIntroState === 'END') {
      await this.finalize()
      this.state.lastEvent = 'end'
      saveState(this.state, this.stateFilePath)
      return { event: 'end', state: 'END', text: answerText, detail: '自我介绍专项结束', done: true }
    }

    const transition = TRANSITION_MESSAGES[nextIntroState]
    this.appendTurn({ kind: 'interviewer_main', text: transition, state: 'SELF_INTRO', phase: 'self_intro' })

    this.state.currentState = nextIntroState
    const availableProjects = this.getAvailableProjects()
    if (nextIntroState === 'PROJECT_SINGLE_1') {
      const firstProject = availableProjects[0]
      if (firstProject && !this.state.projectsDiscussed.includes(firstProject.id)) {
        this.state.projectsDiscussed = [...this.state.projectsDiscussed, firstProject.id]
      }
      this.state.currentProjectId = firstProject?.id ?? null

      const projectList = availableProjects.map((p) => `- ${p.name}`).join('\n')
      const projectPrompt = `请介绍一下你的项目经历，我们先从你最有代表性的项目开始。\n\n你的项目列表：\n${projectList}`
      this.appendTurn({ kind: 'interviewer_main', text: projectPrompt, state: nextIntroState, phase: 'project_single' })
    }

    this.repo().updateState(this.state.sessionId, {
      currentState: nextIntroState,
      projectsDiscussed: this.state.projectsDiscussed,
      currentProjectId: this.state.currentProjectId,
    })

    this.state.lastEvent = 'state_transition'
    this.state.lastDetail = `自我介绍完成，转换至 ${nextIntroState}`
    saveState(this.state)

    return { event: 'state_transition', state: nextIntroState, text: answerText, detail: this.state.lastDetail, done: false }
  }

  async finalize(): Promise<void> {
    if (this.state.completed) return
    this.repo().end(this.state.sessionId)
    this.repo().updateState(this.state.sessionId, {
      currentState: 'END',
      projectsDiscussed: this.state.projectsDiscussed,
      topicsCovered: this.state.topicsCovered,
      currentProjectId: this.state.currentProjectId,
    })

    // 更新时间戳
    const dbTurns = this.loadTurnsFromDb()
    for (let i = 0; i < dbTurns.length; i++) {
      const turnTime = this.state.startedAt + i * 90000
      const turn = dbTurns[i]
      if (turn) this.db.prepare('UPDATE training_turns SET created_at = ? WHERE id = ?').run(turnTime, turn.id)
    }

    this.state.completed = true
    this.state.currentState = 'END'
    saveState(this.state)
  }

  async generateReview(): Promise<void> {
    const phaseReviewRepo = createPhaseReviewRepository(this.db)
    const fullReviewRepo = createFullReviewRepository(this.db)
    const dbTurns = this.loadTurnsFromDb()

    const phaseTurnsMap = new Map<string, Array<{ kind: string; text: string; index: number; project_id: string | null; question_id: string | null }>>()
    for (const turn of dbTurns) {
      const phaseType = PHASE_TO_TYPE[turn.phase ?? '']
      if (!phaseType) continue
      if (!phaseTurnsMap.has(phaseType)) phaseTurnsMap.set(phaseType, [])
      phaseTurnsMap.get(phaseType)!.push({ kind: turn.kind, text: turn.text, index: turn.index, project_id: turn.project_id, question_id: turn.question_id })
    }

    const phaseTypes = resolvePhaseTypes(this.state.type)
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
      if (phaseType === 'project_qa') projectInfo = buildProjectInfoText(this.db, phaseTurns)
      if (phaseType === 'random_qa') questions = buildQuestionsText(this.db, phaseTurns)

      const firstTurn = phaseTurns[0]!
      const lastTurn = phaseTurns[phaseTurns.length - 1]!
      const elapsedMinutes = Math.max(1, Math.floor((lastTurn.index * 90000) / 60000))

      const result = await generatePhaseReview({
        phaseType,
        phaseIndex: i,
        position: this.state.position,
        targetCompany: this.state.targetCompany ?? undefined,
        jobDescription: this.state.jobDescription ?? undefined,
        turns: phaseTurns.map((t) => ({ kind: t.kind, text: t.text, index: t.index })),
        projectInfo,
        questions,
        elapsedMinutes,
      })

      const phaseReview = phaseReviewRepo.create({
        sessionId: this.state.sessionId,
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
      console.log(`[review] ${phaseType}: ${result.totalScore.toFixed(2)}`)
    }

    if (this.state.type === 'full' && phaseResults.length > 0) {
      const elapsedMinutes = Math.floor((Date.now() - this.state.startedAt) / 60000)
      const fullResult = await generateFullReview({
        position: this.state.position,
        targetCompany: this.state.targetCompany ?? undefined,
        jobDescription: this.state.jobDescription ?? undefined,
        phaseResults: phaseResults.map((p) => ({ phaseType: p.phaseType, phaseIndex: p.phaseIndex, result: p.result })),
        sessionInfo: {
          type: this.state.type,
          totalTurns: dbTurns.length,
          elapsedMinutes,
          trainingType: this.state.type,
        },
      })

      fullReviewRepo.create({
        sessionId: this.state.sessionId,
        phaseReviewIds: phaseResults.map((p) => p.reviewId),
        phaseScoresSummary: phaseResults.map((p) => ({ phaseType: p.phaseType, score: p.result.totalScore, duration: 0 })),
        coherenceScore: fullResult.coherenceScore,
        jdMatchScore: fullResult.jdMatchScore,
        overallPersona: fullResult.overallPersona,
        consolidatedImprovements: fullResult.consolidatedImprovements,
        overallEvaluation: fullResult.overallEvaluation,
        overallScore: fullResult.overallScore,
      })
      console.log(`[review] Full: ${fullResult.overallScore.toFixed(2)}`)
    }
  }
}

// ======== CLI 命令 ========

export function listSessions(): void {
  console.log('可 replay 的 session：\n')
  for (const [name, account] of Object.entries(ACCOUNTS)) {
    console.log(`${account.user.name} (${name})：`)
    for (let i = 0; i < account.sessions.length; i++) {
      const s = account.sessions[i]!
      console.log(`  [${i}] ${s.type} | ${s.position}${s.targetCompany ? ' @ ' + s.targetCompany : ''}`)
    }
    console.log()
  }
}

export function printStatus(status: EngineStatus): void {
  console.log('\n' + '═'.repeat(60))
  console.log(`账号: ${status.accountName} | Session #${status.sessionIndex}`)
  console.log(`类型: ${status.sessionType} | 岗位: ${status.position}`)
  if (status.targetCompany) console.log(`目标公司: ${status.targetCompany}`)
  console.log(`状态: ${status.state} | 轮次: ${status.turnCount}`)
  console.log('─'.repeat(60))

  if (status.completed) {
    console.log('✅ 面试已结束')
  } else {
    console.log(`🎤 面试官: ${status.lastInterviewerQuestion}`)
    console.log(`\n💡 请输入你的回答（用 interactive-demo.ts answer --text "..."）`)
  }
  console.log('═'.repeat(60) + '\n')
}

export { clearState }
