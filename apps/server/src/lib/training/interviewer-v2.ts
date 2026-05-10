import { getKimiClient, KIMI_INSTANT_MODE, KIMI_MODEL } from '../llm/kimi.ts'
import { loadSkill } from '../skills/prompt.ts'
import { renderSystemPrompt, type InterviewState, type StateContext } from './state-machine.ts'

export type Decision = 'follow_up' | 'next_question' | 'end'

export interface InterviewerReply {
  reply: string
  decision: Decision
}

export interface InterviewContextV2 {
  state: InterviewState
  stateContext: StateContext
  previousTurns: { kind: string; text: string }[]
  currentQuestion?: string
  currentQuestionExpectedPoints?: string
}

export async function askInterviewerV2(
  ctx: InterviewContextV2,
  opts?: { personaName?: string },
): Promise<InterviewerReply> {
  const personaName = opts?.personaName ?? 'interviewer-persona'

  const persona = await loadSkill(personaName)
  const dynamicPrompt = renderSystemPrompt(ctx.state, ctx.stateContext)

  const systemPrompt = [
    persona.systemPrompt,
    '',
    '--- 面试上下文 ---',
    '',
    dynamicPrompt,
    '',
    '## 输出格式（严格 JSON）',
    '{',
    '  "reply": "面试官的回复内容",',
    '  "decision": "follow_up" | "next_question" | "end"',
    '}',
    '',
    '- follow_up: 继续追问当前问题',
    '- next_question: 切换到下一道主问题',
    '- end: 结束整场面试',
  ].join('\n')

  const transcriptText = ctx.previousTurns.length > 0
    ? ctx.previousTurns.map((t) => `${t.kind === 'candidate' ? '候选人' : '面试官'}: ${t.text}`).join('\n')
    : '（本场面试刚开始）'

  const userPrompt = ctx.currentQuestion
    ? `当前问题：${ctx.currentQuestion}${ctx.currentQuestionExpectedPoints ? '\n期望考察要点：' + ctx.currentQuestionExpectedPoints : ''}\n\n面试历史：\n${transcriptText}\n\n请以上述面试官身份给出回复，严格按 JSON 格式输出。`
    : `面试历史：\n${transcriptText}\n\n请以上述面试官身份给出回复，严格按 JSON 格式输出。`

  const response = await getKimiClient().chat.completions.create({
    model: KIMI_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' },
    ...KIMI_INSTANT_MODE,
  })

  const content = response.choices[0]?.message?.content ?? ''
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>
    const decision = String(parsed.decision ?? 'follow_up')
    const validDecision: Decision = ['follow_up', 'next_question', 'end'].includes(decision) ? (decision as Decision) : 'follow_up'
    return {
      reply: String(parsed.reply ?? '请继续。'),
      decision: validDecision,
    }
  } catch {
    return { reply: content || '请继续。', decision: 'follow_up' }
  }
}
