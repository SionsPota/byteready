import { getKimiClient, KIMI_INSTANT_MODE, KIMI_MODEL } from '../llm/kimi.ts'
import { loadSkill } from '../skills/prompt.ts'

export interface ResumeProjectBrief {
  name: string
  summary?: string
  keywords?: string[]
}

export interface TurnWithPhase {
  kind: string
  text: string
  questionId?: string | null
  phase?: string | null
  state?: string | null
  projectId?: string | null
}

export interface QuestionBrief {
  id: string
  text: string
  expectedPoints?: string
}

export interface ReviewInput {
  type: 'interview' | 'project' | 'custom'
  resumeProjects: ResumeProjectBrief[]
  questions: QuestionBrief[]
  turns: TurnWithPhase[]
}

export interface PhaseReview {
  phase: string
  duration?: string
  evaluation: string
  suggestions: string[]
}

export interface ProjectMatchReview {
  projectName: string
  matchScore: number
  resumeDescription: string
  interviewDescription: string
  gaps: string[]
}

export interface ReviewResult {
  scores: { axis: string; value: number; evidence: string }[]
  phaseReviews: PhaseReview[]
  projectMatches?: ProjectMatchReview[]
  perQuestions: { questionId: string; yourSummary: string; keyGaps: string[]; improvements: string[] }[]
  overallText: string
}

const VALID_AXES = ['专业知识深度', '项目复述质量', '表达与结构', '逻辑与问题解决', '沟通自然度']

function renderVariables(input: ReviewInput): Record<string, string> {
  const typeText =
    input.type === 'interview'
      ? '模拟面试'
      : input.type === 'project'
        ? '项目复盘'
        : '自定义复盘'

  const projectsText =
    input.resumeProjects.length > 0
      ? input.resumeProjects
          .map(
            (p) =>
              `- ${p.name}${p.summary ? ': ' + p.summary : ''}${p.keywords ? ' [' + p.keywords.join(', ') + ']' : ''}`,
          )
          .join('\n')
      : '（无简历项目）'

  const questionsText = input.questions
    .map((q, i) => `${i + 1}. ${q.text}${q.expectedPoints ? ' [期望: ' + q.expectedPoints + ']' : ''}`)
    .join('\n')

  const phaseGroups = new Map<string, { kind: string; text: string }[]>()
  for (const t of input.turns) {
    const phase = t.phase ?? t.state ?? '其他'
    if (!phaseGroups.has(phase)) phaseGroups.set(phase, [])
    const role =
      t.kind === 'candidate'
        ? '候选人'
        : t.kind === 'interviewer_main'
          ? '面试官(主问题)'
          : t.kind === 'interviewer_followup'
            ? '面试官(追问)'
            : '系统'
    phaseGroups.get(phase)!.push({ kind: role, text: t.text })
  }

  const phaseTranscriptText = Array.from(phaseGroups.entries())
    .map(([phase, turns]) => {
      const turnsText = turns.map((t) => `${t.kind}: ${t.text}`).join('\n')
      return `### ${phase}\n${turnsText}`
    })
    .join('\n\n')

  const transcriptText = input.turns
    .map((t) => {
      const role =
        t.kind === 'candidate'
          ? '候选人'
          : t.kind === 'interviewer_main'
            ? '面试官(主问题)'
            : t.kind === 'interviewer_followup'
              ? '面试官(追问)'
              : '系统'
      return `${role}: ${t.text}`
    })
    .join('\n')

  return {
    type: typeText,
    resume_projects: projectsText,
    questions: questionsText,
    phase_transcript: phaseTranscriptText,
    transcript: transcriptText,
  }
}

function resolveCoachSkill(type: ReviewInput['type']): string {
  if (type === 'interview' || type === 'project') {
    return 'interview-coach'
  }
  return 'introduction-coach'
}

export async function generateReview(input: ReviewInput): Promise<ReviewResult> {
  const coachSkillName = resolveCoachSkill(input.type)

  const [reviewer, coach, task] = await Promise.all([
    loadSkill('interviewer-review'),
    loadSkill(coachSkillName),
    loadSkill('task-review-generator', renderVariables(input)),
  ])

  const systemPrompt = [
    reviewer.systemPrompt,
    '',
    '--- 辅助视角 ---',
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
      { role: 'user', content: '请严格按 JSON 格式输出复盘报告。' },
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' },
    ...KIMI_INSTANT_MODE,
  })

  const content = response.choices[0]?.message?.content ?? ''

  try {
    const parsed = JSON.parse(content) as Record<string, unknown>

    const rawScores = Array.isArray(parsed.scores) ? parsed.scores : []
    const scores = rawScores
      .filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null)
      .map((s) => ({
        axis: VALID_AXES.includes(String(s.axis)) ? String(s.axis) : '专业知识深度',
        value: Math.max(0, Math.min(5, Number(s.value) || 0)),
        evidence: String(s.evidence ?? ''),
      }))

    const existingAxes = new Set(scores.map((s) => s.axis))
    for (const axis of VALID_AXES) {
      if (!existingAxes.has(axis)) {
        scores.push({ axis, value: 0, evidence: '未评估' })
      }
    }

    const rawPq = Array.isArray(parsed.per_questions) ? parsed.per_questions : []
    const perQuestions = rawPq
      .filter((p): p is Record<string, unknown> => typeof p === 'object' && p !== null)
      .map((p) => ({
        questionId: String(p.question_id ?? ''),
        yourSummary: String(p.your_summary ?? ''),
        keyGaps: Array.isArray(p.key_gaps) ? p.key_gaps.filter((k): k is string => typeof k === 'string') : [],
        improvements: Array.isArray(p.improvements)
          ? p.improvements.filter((i): i is string => typeof i === 'string')
          : [],
      }))

    const rawPhaseReviews = Array.isArray(parsed.phase_reviews) ? parsed.phase_reviews : []
    const phaseReviews = rawPhaseReviews
      .filter((p): p is Record<string, unknown> => typeof p === 'object' && p !== null)
      .map((p) => ({
        phase: String(p.phase ?? ''),
        evaluation: String(p.evaluation ?? ''),
        suggestions: Array.isArray(p.suggestions) ? p.suggestions.filter((s): s is string => typeof s === 'string') : [],
      }))

    const rawProjectMatches = Array.isArray(parsed.project_matches) ? parsed.project_matches : []
    const projectMatches = rawProjectMatches
      .filter((p): p is Record<string, unknown> => typeof p === 'object' && p !== null)
      .map((p) => ({
        projectName: String(p.project_name ?? ''),
        matchScore: Math.max(0, Math.min(5, Number(p.match_score) || 0)),
        resumeDescription: String(p.resume_description ?? ''),
        interviewDescription: String(p.interview_description ?? ''),
        gaps: Array.isArray(p.gaps) ? p.gaps.filter((g): g is string => typeof g === 'string') : [],
      }))

    return {
      scores,
      phaseReviews,
      projectMatches: projectMatches.length > 0 ? projectMatches : undefined,
      perQuestions,
      overallText: String(parsed.overall_text ?? '暂无总评'),
    }
  } catch {
    return {
      scores: VALID_AXES.map((axis) => ({ axis, value: 0, evidence: 'LLM 返回解析失败' })),
      phaseReviews: [],
      perQuestions: [],
      overallText: content || '复盘生成失败',
    }
  }
}
