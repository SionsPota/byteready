import { getKimiClient, KIMI_INSTANT_MODE, KIMI_MODEL } from '../llm/kimi.ts'
import { loadSkill } from '../skills/prompt.ts'
import type { PhaseReviewResult } from './phase-generator.ts'

export interface FullReviewInput {
  position: string
  targetCompany?: string
  jobDescription?: string
  phaseResults: Array<{
    phaseType: string
    phaseIndex: number
    result: PhaseReviewResult
  }>
  sessionInfo: {
    type: string
    totalTurns: number
    elapsedMinutes: number
    trainingType: string
  }
}

export interface ConsolidatedImprovement {
  priority: 'high' | 'medium' | 'low'
  sourcePhases: string[]
  suggestion: string
}

export interface FullReviewResult {
  scores: { dimension: string; score: number; weight: number; weighted: number; evidence: string }[]
  overallScore: number
  coherenceScore: number
  jdMatchScore: number
  overallPersona: string
  overallEvaluation: string
  consolidatedImprovements: ConsolidatedImprovement[]
}

function resolveCoachSkill(trainingType: string): string {
  if (trainingType === 'self_intro') {
    return 'introduction-coach'
  }
  return 'interview-coach'
}

function renderVariables(input: FullReviewInput): Record<string, string> {
  const phaseSummaries = input.phaseResults
    .map((p) => {
      const typeLabel =
        p.phaseType === 'self_intro'
          ? '自我介绍'
          : p.phaseType === 'project_qa'
            ? '项目问答'
            : p.phaseType === 'random_qa'
              ? '自由提问'
              : p.phaseType

      const scoreSummary = p.result.scores
        .map((s) => `  - ${s.dimension}: ${s.score}/${s.weighted.toFixed(3)} (${s.evidence})`)
        .join('\n')

      return `## ${typeLabel}（阶段 ${p.phaseIndex}）
- 总分：${p.result.totalScore.toFixed(2)}
- 评价：${p.result.evaluation}
- 面试官反思：${p.result.interviewerReflection}
- 评分详情：
${scoreSummary}
- 改进建议：${p.result.improvementSuggestions.map((s) => `[${s.priority}] ${s.suggestion}`).join('; ')}`
    })
    .join('\n\n')

  return {
    position: input.position,
    target_company: input.targetCompany ?? '未指定',
    job_description: input.jobDescription ?? '未提供',
    phase_summaries: phaseSummaries || '（无阶段复盘数据）',
    session_info: `训练类型：${input.sessionInfo.type}，总轮次：${input.sessionInfo.totalTurns}，总用时：${input.sessionInfo.elapsedMinutes} 分钟`,
  }
}

export async function generateFullReview(input: FullReviewInput): Promise<FullReviewResult> {
  const coachSkillName = resolveCoachSkill(input.sessionInfo.trainingType)

  const [reviewer, coach, task] = await Promise.all([
    loadSkill('interviewer-review'),
    loadSkill(coachSkillName),
    loadSkill('task-full-review', renderVariables(input)),
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
      { role: 'user', content: '请严格按 JSON 格式输出整面综合复盘评估。' },
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
        dimension: String(s.dimension ?? ''),
        score: Math.max(0, Math.min(5, Number(s.score) || 0)),
        weight: Number(s.weight) || 0.2,
        weighted: Number(s.weighted) || 0,
        evidence: String(s.evidence ?? ''),
      }))

    const rawImprovements = Array.isArray(parsed.consolidated_improvements) ? parsed.consolidated_improvements : []
    const consolidatedImprovements: ConsolidatedImprovement[] = rawImprovements
      .filter((i): i is Record<string, unknown> => typeof i === 'object' && i !== null)
      .map((i) => ({
        priority: ['high', 'medium', 'low'].includes(String(i.priority)) ? (String(i.priority) as 'high' | 'medium' | 'low') : 'medium',
        sourcePhases: Array.isArray(i.source_phases) ? i.source_phases.filter((p): p is string => typeof p === 'string') : [],
        suggestion: String(i.suggestion ?? ''),
      }))

    return {
      scores,
      overallScore: Math.max(0, Math.min(5, Number(parsed.overall_score) || 0)),
      coherenceScore: Math.max(0, Math.min(5, Number(parsed.coherence_score) || 0)),
      jdMatchScore: Math.max(0, Math.min(5, Number(parsed.jd_match_score) || 0)),
      overallPersona: String(parsed.overall_persona ?? ''),
      overallEvaluation: String(parsed.overall_evaluation ?? ''),
      consolidatedImprovements,
    }
  } catch {
    return {
      scores: [],
      overallScore: 0,
      coherenceScore: 0,
      jdMatchScore: 0,
      overallPersona: '',
      overallEvaluation: content || '整面复盘生成失败',
      consolidatedImprovements: [],
    }
  }
}
