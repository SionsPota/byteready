import { getKimiClient, KIMI_INSTANT_MODE, KIMI_MODEL } from '../llm/kimi.ts'

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
  level: string
  targetCompany?: string
  resumeProjects?: ResumeProjectBrief[]
  currentQuestion: string
  currentQuestionExpectedPoints?: string
  previousTurns: { kind: string; text: string }[]
  followUpCount: number
}

const INTERVIEWER_PROMPT = `你是一名资深 {position} 面试官，正在面试一位 {level} 候选人。

{resume_section}

当前正在考察的问题：{current_question}
{expected_points}

面试历史：
{transcript}

## 追问准则
1. 每道主问题在 3-5 轮内决定是否切换
2. 候选人答得深 → 进一步技术追问；答得浅 → 引导补充
3. 不要照本宣科，做"压力测试"型追问
4. 用中文，中英技术术语保持英文原词
5. 你已追问 {follow_up_count} 轮，请判断是否继续追问、切换下一题或结束面试

## 输出格式（严格 JSON）
{
  "reply": "面试官的回复内容",
  "decision": "follow_up" 或 "next_question" 或 "end"
}

- follow_up: 继续追问当前问题
- next_question: 当前问题已充分考察，切换到下一道主问题
- end: 面试已足够，结束整场面试`

function renderPrompt(ctx: InterviewContext): string {
  let prompt = INTERVIEWER_PROMPT
    .replace('{position}', ctx.position)
    .replace('{level}', ctx.level)
    .replace('{current_question}', ctx.currentQuestion)
    .replace('{follow_up_count}', String(ctx.followUpCount))

  if (ctx.targetCompany) {
    prompt = prompt.replace('{targetCompany}', `目标公司倾向：${ctx.targetCompany}\n`)
  } else {
    prompt = prompt.replace('{targetCompany}\n', '')
  }

  // 简历项目段：有就拼完整描述，没有就置为空字符串（避免对 Kimi 暴露伪条件模板字符）
  const resumeSection =
    ctx.resumeProjects && ctx.resumeProjects.length > 0
      ? '候选人简历中的项目经历：\n' +
        ctx.resumeProjects
          .map(
            (p) =>
              `- ${p.name}${p.summary ? ': ' + p.summary : ''}${p.keywords ? ' [' + p.keywords.join(', ') + ']' : ''}`,
          )
          .join('\n')
      : ''
  prompt = prompt.replace('{resume_section}', resumeSection)
  // 兼容旧 placeholder（如果上游还有引用）
  prompt = prompt.replace('{resume_projects}', '')

  if (ctx.currentQuestionExpectedPoints) {
    prompt = prompt.replace('{expected_points}', `期望考察要点：${ctx.currentQuestionExpectedPoints}`)
  } else {
    prompt = prompt.replace('{expected_points}', '')
  }

  const transcriptText = ctx.previousTurns.length > 0
    ? ctx.previousTurns.map((t) => `${t.kind === 'candidate' ? '候选人' : '面试官'}: ${t.text}`).join('\n')
    : '（本场面试刚开始）'
  prompt = prompt.replace('{transcript}', transcriptText)

  return prompt
}

export async function askInterviewer(ctx: InterviewContext): Promise<InterviewerReply> {
  const response = await getKimiClient().chat.completions.create({
    model: KIMI_MODEL,
    messages: [
      { role: 'system', content: renderPrompt(ctx) },
      { role: 'user', content: '请以上述面试官身份给出回复，严格按 JSON 格式输出。' },
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
