import { getKimiClient, KIMI_INSTANT_MODE, KIMI_MODEL } from '../llm/kimi.ts'
import { loadSkill } from '../skills/prompt.ts'

export interface PhaseTurn {
  kind: string
  text: string
  index?: number
}

export interface PhaseReviewInput {
  phaseType: 'self_intro' | 'project_qa' | 'random_qa'
  phaseIndex: number
  position: string
  targetCompany?: string
  jobDescription?: string
  turns: PhaseTurn[]
  projectInfo?: string
  questions?: string
  elapsedMinutes?: number
}

export interface PhaseScoreEntry {
  dimension: string
  score: number
  weight: number
  weighted: number
  evidence: string
}

export interface ImprovementEntry {
  priority: 'high' | 'medium' | 'low'
  suggestion: string
  relatedTurnIndex?: number
}

export interface PhaseReviewResult {
  scores: PhaseScoreEntry[]
  totalScore: number
  evaluation: string
  interviewerReflection: string
  improvementSuggestions: ImprovementEntry[]
}

function resolveTaskSkill(phaseType: PhaseReviewInput['phaseType']): string {
  switch (phaseType) {
    case 'self_intro':
      return 'task-phase-review-self-intro'
    case 'project_qa':
      return 'task-phase-review-project'
    case 'random_qa':
      return 'task-phase-review-random'
  }
}

function resolveCoachSkill(phaseType: PhaseReviewInput['phaseType']): string {
  switch (phaseType) {
    case 'self_intro':
      return 'introduction-coach'
    case 'project_qa':
    case 'random_qa':
      return 'interview-coach'
  }
}

function renderVariables(input: PhaseReviewInput): Record<string, string> {
  const transcriptText = input.turns
    .map((t, i) => {
      const role =
        t.kind === 'candidate'
          ? '候选人'
          : t.kind === 'interviewer_main'
            ? '面试官(主问题)'
            : t.kind === 'interviewer_followup'
              ? '面试官(追问)'
              : '系统'
      return `[${i}] ${role}: ${t.text}`
    })
    .join('\n')

  return {
    position: input.position,
    target_company: input.targetCompany ?? '未指定',
    job_description: input.jobDescription ?? '未提供',
    phase_transcript: transcriptText || '（本阶段无对话记录）',
    turn_count: String(input.turns.length),
    elapsed_minutes: String(input.elapsedMinutes ?? 0),
    project_info: input.projectInfo ?? '（本阶段不涉及项目）',
    questions: input.questions ?? '（本阶段无预设问题）',
  }
}

export async function generatePhaseReview(input: PhaseReviewInput): Promise<PhaseReviewResult> {
  const taskSkillName = resolveTaskSkill(input.phaseType)
  const coachSkillName = resolveCoachSkill(input.phaseType)

  const [reviewer, coach, task] = await Promise.all([
    loadSkill('interviewer-review'),
    loadSkill(coachSkillName),
    loadSkill(taskSkillName, renderVariables(input)),
  ])

  const systemPrompt = [
    reviewer.systemPrompt,
    '',
    '--- 教练视角 ---',
    '',
    coach.systemPrompt,
    '',
    '--- 任务指令 ---',
    '',
    task.systemPrompt,
  ].join('\n')

  const response = await getKimiClient().chat.completions.create({
    model: KIMI_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: '请严格按 JSON 格式输出该阶段的复盘评估。' },
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' },
    ...KIMI_INSTANT_MODE,
  })

  const content = response.choices[0]?.message?.content ?? ''

  try {
    const parsed = JSON.parse(content) as Record<string, unknown>

    const rawScores = Array.isArray(parsed.scores) ? parsed.scores : []
    const scores: PhaseScoreEntry[] = rawScores
      .filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null)
      .map((s) => ({
        dimension: String(s.dimension ?? ''),
        score: Math.max(0, Math.min(5, Number(s.score) || 0)),
        weight: Number(s.weight) || 0.2,
        weighted: Number(s.weighted) || 0,
        evidence: String(s.evidence ?? ''),
      }))

    const rawSuggestions = Array.isArray(parsed.improvement_suggestions) ? parsed.improvement_suggestions : []
    const improvementSuggestions: ImprovementEntry[] = rawSuggestions
      .filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null)
      .map((s) => ({
        priority: ['high', 'medium', 'low'].includes(String(s.priority)) ? (String(s.priority) as 'high' | 'medium' | 'low') : 'medium',
        suggestion: String(s.suggestion ?? ''),
        relatedTurnIndex: s.related_turn_index !== undefined ? Number(s.related_turn_index) : undefined,
      }))

    return {
      scores,
      totalScore: Math.max(0, Math.min(5, Number(parsed.total_score) || 0)),
      evaluation: String(parsed.evaluation ?? ''),
      interviewerReflection: String(parsed.interviewer_reflection ?? ''),
      improvementSuggestions,
    }
  } catch {
    return {
      scores: [],
      totalScore: 0,
      evaluation: content || '阶段复盘生成失败',
      interviewerReflection: '解析失败',
      improvementSuggestions: [],
    }
  }
}
