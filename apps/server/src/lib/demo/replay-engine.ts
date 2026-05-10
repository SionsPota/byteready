import type { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'
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
import type { DemoSession } from './seed.ts'

export interface ReplayStepResult {
  done: boolean
  turnIndex: number
  state: InterviewState
  event: 'interviewer_question' | 'candidate_answer' | 'state_transition' | 'end'
  text: string
  detail?: string
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

export class SessionReplayer {
  private db: DatabaseSync
  private sessionId: string
  private sessionConfig: DemoSession
  private candidateScript: string[]
  private repo: ReturnType<typeof createTrainingRepository>
  private questionRepo: ReturnType<typeof createQuestionRepository>
  private projectRepo: ReturnType<typeof createProjectRepository>

  private currentState: InterviewState
  private turnIndex = 0
  private scriptIndex = 0
  private followUpCount = 0
  private turns: TrainingTurnRow[] = []
  private projectsDiscussed: string[] = []
  private topicsCovered: string[] = []
  private currentProjectId: string | null = null
  private currentQuestionId: string | null = null
  private currentQuestionText = ''
  private currentQuestionExpectedPoints: string | undefined
  private startedAt = 0
  private availableProjects: Array<{ id: string; name: string; summary?: string; role?: string; keywords?: string[] }> = []
  private trainingType: TrainingType
  private isStarted = false

  constructor(
    db: DatabaseSync,
    userId: string,
    resumeId: string,
    projectIds: string[],
    session: DemoSession,
    candidateScript: string[],
  ) {
    this.db = db
    this.sessionConfig = session
    this.candidateScript = candidateScript
    this.repo = createTrainingRepository(db)
    this.questionRepo = createQuestionRepository(db)
    this.projectRepo = createProjectRepository(db)
    this.trainingType = (session.type ?? 'full') as TrainingType
    this.currentState = getInitialStateForType(this.trainingType)

    // 创建 session
    const sess = this.repo.createSession({
      ownerId: userId,
      type: session.type,
      position: session.position,
      targetCompany: session.targetCompany ?? undefined,
      jobDescription: session.jobDescription ?? undefined,
      resumeId,
      projectIds,
    })
    this.sessionId = sess.id

    this.availableProjects = projectIds
      .map((pid) => this.projectRepo.getById(pid))
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .map((p) => ({
        id: p.id,
        name: p.name,
        summary: p.summary ?? undefined,
        role: p.role ?? undefined,
        keywords: p.keywords ? (JSON.parse(p.keywords) as string[]) : undefined,
      }))
  }

  get id(): string { return this.sessionId }
  get state(): InterviewState { return this.currentState }
  get totalTurns(): number { return this.turns.length }
  get scriptRemaining(): number { return this.candidateScript.length - this.scriptIndex }

  start(): ReplayStepResult {
    const initialState = getInitialStateForType(this.trainingType)
    this.repo.start(this.sessionId)
    this.repo.updateState(this.sessionId, { currentState: initialState })
    this.startedAt = Date.now()
    this.isStarted = true

    let introText = '你好，我是今天的面试官。'
    if (this.trainingType === 'full' || this.trainingType === 'self_intro') {
      introText += '请先做个简单的自我介绍。'
    } else if (this.trainingType === 'project_qa') {
      introText += '我们来聊聊你的项目经历。'
    } else if (this.trainingType === 'random_qa') {
      introText += '接下来进入技术问答环节。'
    }

    const s = this.repo.createTurn({ sessionId: this.sessionId, index: this.turnIndex++, kind: 'system', text: introText, state: initialState })
    this.turns.push(s)
    const i = this.repo.createTurn({ sessionId: this.sessionId, index: this.turnIndex++, kind: 'interviewer_main', text: introText, state: initialState })
    this.turns.push(i)
    this.currentQuestionText = introText

    return { done: false, turnIndex: this.turnIndex, state: this.currentState, event: 'interviewer_question', text: introText, detail: '开场白' }
  }

  async step(): Promise<ReplayStepResult> {
    if (!this.isStarted) return this.start()
    if (this.currentState === 'END') {
      return { done: true, turnIndex: this.turnIndex, state: 'END', event: 'end', text: '面试已结束' }
    }

    // SELF_INTRO 特殊处理
    if (this.currentState === 'SELF_INTRO') {
      return await this.handleSelfIntro()
    }

    // 调用 LLM 生成面试官问题
    const elapsedMinutes = Math.floor((Date.now() - this.startedAt) / 60000)
    const currentProject = this.currentProjectId ? this.availableProjects.find((p) => p.id === this.currentProjectId) : undefined

    // QNA 阶段抽题
    if (this.currentState.startsWith('QNA_') && (!this.currentQuestionId || this.followUpCount === 0)) {
      const category = STATE_TOPIC_MAP[this.currentState]
      if (category) {
        const questions = this.questionRepo.pickRandom({ position: this.sessionConfig.position, limit: 1, category })
        const firstQ = questions[0]
        if (firstQ) {
          this.currentQuestionText = firstQ.main_text
          this.currentQuestionExpectedPoints = firstQ.expected_points ?? undefined
          this.currentQuestionId = firstQ.id
        }
      }
    }

    const reply = await askInterviewerV2({
      state: this.currentState,
      stateContext: {
        position: this.sessionConfig.position,
        targetCompany: this.sessionConfig.targetCompany ?? undefined,
        jobDescription: this.sessionConfig.jobDescription ?? undefined,
        resumeSummary: this.availableProjects.map((p) => p.name).join('、'),
        skills: [],
        totalTurns: this.turns.length,
        elapsedMinutes,
        currentProject,
        projectsDiscussed: this.projectsDiscussed,
        selectedProjects: this.currentState === 'PROJECT_CROSS'
          ? this.availableProjects.filter((p) => this.projectsDiscussed.includes(p.id)).slice(0, 2)
          : undefined,
        topicsCovered: this.topicsCovered,
        currentTopic: STATE_TOPIC_MAP[this.currentState],
        followUpCount: this.followUpCount,
      },
      previousTurns: this.turns.map((t) => ({ kind: t.kind, text: t.text })),
      currentQuestion: this.currentQuestionText,
      currentQuestionExpectedPoints: this.currentQuestionExpectedPoints,
    })

    const kind = reply.decision === 'follow_up' ? 'interviewer_followup' : 'interviewer_main'
    const ivTurn = this.repo.createTurn({
      sessionId: this.sessionId, index: this.turnIndex++, kind,
      text: reply.reply,
      questionId: this.currentQuestionId,
      phase: this.currentState.startsWith('QNA_') ? 'q_and_a' : this.currentState.startsWith('PROJECT_') ? 'project_single' : 'self_intro',
      state: this.currentState,
      projectId: currentProject?.id,
      topic: STATE_TOPIC_MAP[this.currentState],
    })
    this.turns.push(ivTurn)

    if (reply.decision === 'end') {
      this.currentState = 'END'
      this.repo.end(this.sessionId)
      this.repo.updateState(this.sessionId, { currentState: 'END' })
      return { done: true, turnIndex: this.turnIndex, state: 'END', event: 'end', text: reply.reply, detail: 'LLM决定结束面试' }
    }

    // 脚本用完了，插入默认回答
    let candidateText: string
    if (this.scriptIndex < this.candidateScript.length) {
      candidateText = this.candidateScript[this.scriptIndex++] ?? '以上就是我的回答，谢谢面试官。'
    } else {
      candidateText = '以上就是我的回答，谢谢面试官。'
    }

    const candTurn = this.repo.createTurn({
      sessionId: this.sessionId, index: this.turnIndex++, kind: 'candidate', text: candidateText,
      questionId: this.currentQuestionId,
      phase: this.currentState.startsWith('QNA_') ? 'q_and_a' : this.currentState.startsWith('PROJECT_') ? 'project_single' : 'self_intro',
      state: this.currentState,
      projectId: currentProject?.id,
      topic: STATE_TOPIC_MAP[this.currentState],
    })
    this.turns.push(candTurn)

    // 更新 followUpCount
    if (reply.decision === 'follow_up') {
      this.followUpCount++
    } else {
      this.followUpCount = 0
    }

    // 检查状态转换
    let transitioned = false
    if (reply.decision === 'next_question' || shouldTransition(this.currentState, this.followUpCount)) {
      const hasSecondProject = this.availableProjects.length >= 2 && this.currentState === 'PROJECT_SINGLE_1'
      const nextState = getNextState(this.currentState, { hasSecondProject, elapsedMinutes, type: this.trainingType })

      if (nextState !== this.currentState && nextState !== 'END') {
        const transition = TRANSITION_MESSAGES[nextState]
        if (transition) {
          const transTurn = this.repo.createTurn({
            sessionId: this.sessionId, index: this.turnIndex++, kind: 'interviewer_main', text: transition,
            phase: nextState.startsWith('QNA_') ? 'q_and_a' : nextState.startsWith('PROJECT_') ? 'project_single' : 'self_intro',
            state: nextState,
            topic: STATE_TOPIC_MAP[nextState],
          })
          this.turns.push(transTurn)
        }

        const stateUpdate: Record<string, unknown> = { currentState: nextState }
        if (nextState === 'PROJECT_SINGLE_1' || nextState === 'PROJECT_SINGLE_2') {
          const undiscussed = this.availableProjects.filter((p) => !this.projectsDiscussed.includes(p.id))
          const nextProject = undiscussed[0] ?? this.availableProjects[0]
          if (nextProject) {
            this.currentProjectId = nextProject.id
            stateUpdate.currentProjectId = nextProject.id
            if (!this.projectsDiscussed.includes(nextProject.id)) {
              this.projectsDiscussed = [...this.projectsDiscussed, nextProject.id]
            }
            stateUpdate.projectsDiscussed = this.projectsDiscussed
          }
        }
        if (nextState.startsWith('QNA_')) {
          const topic = STATE_TOPIC_MAP[nextState]
          stateUpdate.currentTopic = topic
          if (topic && !this.topicsCovered.includes(topic)) {
            this.topicsCovered = [...this.topicsCovered, topic]
          }
          stateUpdate.topicsCovered = this.topicsCovered
          this.currentQuestionId = null
          this.currentQuestionText = ''
          this.currentQuestionExpectedPoints = undefined
        }
        this.repo.updateState(this.sessionId, stateUpdate as never)
        this.currentState = nextState
        this.followUpCount = 0
        transitioned = true
      } else if (nextState === 'END') {
        this.currentState = 'END'
        this.repo.end(this.sessionId)
        this.repo.updateState(this.sessionId, { currentState: 'END' })
        return { done: true, turnIndex: this.turnIndex, state: 'END', event: 'end', text: '面试正常结束', detail: `共${this.turnIndex}轮对话` }
      }
    }

    return {
      done: false,
      turnIndex: this.turnIndex,
      state: this.currentState,
      event: transitioned ? 'state_transition' : 'candidate_answer',
      text: candidateText,
      detail: transitioned ? `状态转换至 ${this.currentState}` : `candidate回答 (${this.scriptIndex}/${this.candidateScript.length})`,
    }
  }

  private async handleSelfIntro(): Promise<ReplayStepResult> {
    const candidateText = this.scriptIndex < this.candidateScript.length
      ? (this.candidateScript[this.scriptIndex++] ?? '以上就是我的自我介绍，谢谢。')
      : '以上就是我的自我介绍，谢谢。'

    const candTurn = this.repo.createTurn({
      sessionId: this.sessionId, index: this.turnIndex++, kind: 'candidate', text: candidateText,
      phase: 'self_intro', state: this.currentState,
    })
    this.turns.push(candTurn)

    const nextIntroState = getNextState('SELF_INTRO', { type: this.trainingType })
    if (nextIntroState === 'END') {
      this.currentState = 'END'
      this.repo.end(this.sessionId)
      this.repo.updateState(this.sessionId, { currentState: 'END' })
      return { done: true, turnIndex: this.turnIndex, state: 'END', event: 'end', text: candidateText, detail: '自我介绍专项结束' }
    }

    const transition = TRANSITION_MESSAGES[nextIntroState]
    const transTurn = this.repo.createTurn({
      sessionId: this.sessionId, index: this.turnIndex++, kind: 'interviewer_main', text: transition,
      phase: 'self_intro', state: this.currentState,
    })
    this.turns.push(transTurn)

    this.currentState = nextIntroState
    const stateUpdate: Record<string, unknown> = { currentState: nextIntroState }
    if (nextIntroState === 'PROJECT_SINGLE_1') {
      const firstProject = this.availableProjects[0]
      if (firstProject && !this.projectsDiscussed.includes(firstProject.id)) {
        this.projectsDiscussed = [...this.projectsDiscussed, firstProject.id]
      }
      stateUpdate.projectsDiscussed = this.projectsDiscussed
      stateUpdate.currentProjectId = firstProject?.id ?? null
      this.currentProjectId = firstProject?.id ?? null

      const projectList = this.availableProjects.map((p) => `- ${p.name}`).join('\n')
      const projectPrompt = `请介绍一下你的项目经历，我们先从你最有代表性的项目开始。\n\n你的项目列表：\n${projectList}`
      const promptTurn = this.repo.createTurn({
        sessionId: this.sessionId, index: this.turnIndex++, kind: 'interviewer_main', text: projectPrompt,
        phase: 'project_single', state: this.currentState,
      })
      this.turns.push(promptTurn)
    }
    this.repo.updateState(this.sessionId, stateUpdate as never)

    return {
      done: false,
      turnIndex: this.turnIndex,
      state: this.currentState,
      event: 'state_transition',
      text: candidateText,
      detail: `自我介绍完成，转换至 ${this.currentState}`,
    }
  }

  async finalize(): Promise<void> {
    // 确保结束
    if (this.currentState !== 'END') {
      this.repo.end(this.sessionId)
      this.repo.updateState(this.sessionId, { currentState: 'END' })
      this.currentState = 'END'
    }

    // 更新时间戳
    for (let i = 0; i < this.turns.length; i++) {
      const turnTime = this.startedAt + i * 90000
      const turn = this.turns[i]
      if (turn) this.db.prepare('UPDATE training_turns SET created_at = ? WHERE id = ?').run(turnTime, turn.id)
    }
  }

  async generateReviews(): Promise<void> {
    const phaseReviewRepo = createPhaseReviewRepository(this.db)
    const fullReviewRepo = createFullReviewRepository(this.db)
    const phaseTurnsMap = groupTurnsByPhaseType(this.turns)
    const phaseTypes = resolvePhaseTypes(this.sessionConfig.type)
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
      if (phaseType === 'project_qa') projectInfo = buildProjectInfoText(phaseTurns, this.projectRepo)
      if (phaseType === 'random_qa') questions = buildQuestionsText(phaseTurns, this.questionRepo)

      const firstTurn = phaseTurns[0]!
      const lastTurn = phaseTurns[phaseTurns.length - 1]!
      const elapsedMinutes = Math.max(1, Math.floor((lastTurn.created_at - firstTurn.created_at) / 60000))

      const result = await generatePhaseReview({
        phaseType,
        phaseIndex: i,
        position: this.sessionConfig.position,
        targetCompany: this.sessionConfig.targetCompany ?? undefined,
        jobDescription: this.sessionConfig.jobDescription ?? undefined,
        turns: phaseTurns.map((t) => ({ kind: t.kind, text: t.text, index: t.index })),
        projectInfo,
        questions,
        elapsedMinutes,
      })

      const phaseReview = phaseReviewRepo.create({
        sessionId: this.sessionId,
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
    }

    if (this.sessionConfig.type === 'full' && phaseResults.length > 0) {
      const elapsedMinutes = Math.floor((Date.now() - this.startedAt) / 60000)
      const fullReviewResult = await generateFullReview({
        position: this.sessionConfig.position,
        targetCompany: this.sessionConfig.targetCompany ?? undefined,
        jobDescription: this.sessionConfig.jobDescription ?? undefined,
        phaseResults: phaseResults.map((p) => ({ phaseType: p.phaseType, phaseIndex: p.phaseIndex, result: p.result })),
        sessionInfo: {
          type: this.sessionConfig.type,
          totalTurns: this.turns.length,
          elapsedMinutes,
          trainingType: this.sessionConfig.type,
        },
      })

      fullReviewRepo.create({
        sessionId: this.sessionId,
        phaseReviewIds: phaseResults.map((p) => p.reviewId),
        phaseScoresSummary: phaseResults.map((p) => ({ phaseType: p.phaseType, score: p.result.totalScore, duration: 0 })),
        coherenceScore: fullReviewResult.coherenceScore,
        jdMatchScore: fullReviewResult.jdMatchScore,
        overallPersona: fullReviewResult.overallPersona,
        consolidatedImprovements: fullReviewResult.consolidatedImprovements,
        overallEvaluation: fullReviewResult.overallEvaluation,
        overallScore: fullReviewResult.overallScore,
      })
    }
  }
}
