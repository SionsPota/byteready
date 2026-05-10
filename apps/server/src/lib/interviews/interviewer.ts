import { getKimiClient, KIMI_INSTANT_MODE, KIMI_MODEL } from '../llm/kimi.ts'
import { loadSkill } from '../skills/prompt.ts'

export type Decision = 'follow_up' | 'next_question' | 'end'

export interface InterviewerReply {
  reply: string
  decision: Decision
}

export interface ResumeProjectBrief {
  name: string
  summary?: string
  keywords?: string[]
}

export interface InterviewContext {
  position: string
  targetCompany?: string
  resumeProjects?: ResumeProjectBrief[]
  currentQuestion: string
  currentQuestionExpectedPoints?: string
  previousTurns: { kind: string; text: string }[]
  followUpCount: number
}

function renderResumeSection(
  projects: ResumeProjectBrief[] | undefined,
): string {
  if (!projects || projects.length === 0) return ''
  return (
    '候选人简历中的项目经历：\n' +
    projects
      .map(
        (p) =>
          `- ${p.name}${p.summary ? ': ' + p.summary : ''}${p.keywords ? ' [' + p.keywords.join(', ') + ']' : ''}`,
      )
      .join('\n')
  )
}

function renderTranscript(
  turns: { kind: string; text: string }[],
): string {
  if (turns.length === 0) return '（本场面试刚开始）'
  return turns
    .map((t) => `${t.kind === 'candidate' ? '候选人' : '面试官'}: ${t.text}`)
    .join('\n')
}

export async function askInterviewer(
  ctx: InterviewContext,
  opts?: { personaName?: string },
): Promise<InterviewerReply> {
  const personaName = opts?.personaName ?? 'interviewer-persona'

  const [persona, task] = await Promise.all([
    loadSkill(personaName),
    loadSkill('task-interviewer', {
      position: ctx.position,
      resume_section: renderResumeSection(ctx.resumeProjects),
      current_question: ctx.currentQuestion,
      expected_points: ctx.currentQuestionExpectedPoints ?? '',
      transcript: renderTranscript(ctx.previousTurns),
      follow_up_count: String(ctx.followUpCount),
    }),
  ])

  const systemPrompt = `${persona.systemPrompt}\n\n--- 任务指令 ---\n\n${task.systemPrompt}`

  const response = await getKimiClient().chat.completions.create({
    model: KIMI_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content:
          '请以上述面试官身份给出回复，严格按 JSON 格式输出。',
      },
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' },
    ...KIMI_INSTANT_MODE,
  })

  const content = response.choices[0]?.message?.content ?? ''
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>
    const decision = String(parsed.decision ?? 'follow_up')
    const validDecision: Decision = ['follow_up', 'next_question', 'end'].includes(decision)
      ? (decision as Decision)
      : 'follow_up'
    return {
      reply: String(parsed.reply ?? '请继续。'),
      decision: validDecision,
    }
  } catch {
    return { reply: content || '请继续。', decision: 'follow_up' }
  }
}
