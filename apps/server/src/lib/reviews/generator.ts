import { getKimiClient, KIMI_INSTANT_MODE, KIMI_MODEL } from '../llm/kimi.ts'

export interface ReviewInput {
  resumeProjects: { name: string; summary?: string; keywords?: string[] }[]
  questions: { id: string; text: string; expectedPoints?: string }[]
  turns: { kind: string; text: string; questionId?: string | null }[]
}

export interface ReviewResult {
  scores: { axis: string; value: number; evidence: string }[]
  perQuestions: { questionId: string; yourSummary: string; keyGaps: string[]; improvements: string[] }[]
  overallText: string
}

const REVIEW_PROMPT = `你是一位资深技术面试评估专家。请根据以下面试 transcript 给出结构化复盘报告。

## 简历项目摘要
{resume_projects}

## 面试问题列表
{questions}

## 完整对话记录
{transcript}

## 评分任务
请从以下 5 个维度给出 0-5 分的评分（可保留一位小数），每个评分附带一句话证据（引用 transcript 片段）：
1. 专业知识深度：技术概念准确度、边界条件、原理理解
2. 项目复述质量：简历项目 vs 面试讲述的匹配度与深度
3. 表达与结构(STAR)：回答是否结构化（情境-任务-行动-结果）
4. 逻辑与问题解决：思维路径清晰度、应变
5. 沟通自然度：语速/卡顿/填充词/中英混用流畅

## 逐题点评
对每道主问题给出：
- your_summary: 候选人回答摘要（1-2 句话）
- key_gaps: 关键缺失点数组
- improvements: 改进建议数组

## 总评
overall_text: 200 字左右的总体评价

## 输出格式（严格 JSON）
{
  "scores": [
    { "axis": "专业知识深度", "value": 3.5, "evidence": "..." },
    ...
  ],
  "per_questions": [
    { "question_id": "...", "your_summary": "...", "key_gaps": ["..."], "improvements": ["..."] },
    ...
  ],
  "overall_text": "..."
}`

const VALID_AXES = ['专业知识深度', '项目复述质量', '表达与结构', '逻辑与问题解决', '沟通自然度']

function renderPrompt(input: ReviewInput): string {
  const projectsText = input.resumeProjects.length > 0
    ? input.resumeProjects.map((p) => `- ${p.name}${p.summary ? ': ' + p.summary : ''}${p.keywords ? ' [' + p.keywords.join(', ') + ']' : ''}`).join('\n')
    : '（无简历项目）'

  const questionsText = input.questions.map((q, i) => `${i + 1}. ${q.text}${q.expectedPoints ? ' [期望: ' + q.expectedPoints + ']' : ''}`).join('\n')

  const transcriptText = input.turns.map((t) => {
    const role = t.kind === 'candidate' ? '候选人' : t.kind === 'interviewer_main' ? '面试官(主问题)' : t.kind === 'interviewer_followup' ? '面试官(追问)' : '系统'
    return `${role}: ${t.text}`
  }).join('\n')

  return REVIEW_PROMPT
    .replace('{resume_projects}', projectsText)
    .replace('{questions}', questionsText)
    .replace('{transcript}', transcriptText)
}

export async function generateReview(input: ReviewInput): Promise<ReviewResult> {
  const response = await getKimiClient().chat.completions.create({
    model: KIMI_MODEL,
    messages: [
      { role: 'system', content: renderPrompt(input) },
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

    // 确保 5 个轴都有
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
        improvements: Array.isArray(p.improvements) ? p.improvements.filter((i): i is string => typeof i === 'string') : [],
      }))

    return {
      scores,
      perQuestions,
      overallText: String(parsed.overall_text ?? '暂无总评'),
    }
  } catch {
    // 降级：返回空评分 + 原文
    return {
      scores: VALID_AXES.map((axis) => ({ axis, value: 0, evidence: 'LLM 返回解析失败' })),
      perQuestions: [],
      overallText: content || '复盘生成失败',
    }
  }
}
