import { env } from '../env.ts'
import { getDb, closeDb } from '../lib/db/client.ts'
import { InteractiveEngine } from '../lib/demo/interactive-engine.ts'
import { getKimiClient, KIMI_INSTANT_MODE, KIMI_MODEL } from '../lib/llm/kimi.ts'
import { seedAccount } from '../lib/demo/seed.ts'
import { frontendAccount } from '../lib/demo/frontend-data.ts'
import { aiAgentAccount } from '../lib/demo/ai-agent-data.ts'

interface SessionConfig {
  accountName: string
  sessionIndex: number
  stateFile: string
  quality: 'poor' | 'medium' | 'good'
  label: string
}

const SESSIONS: SessionConfig[] = [
  // 陈明远 - 前端工程师
  { accountName: 'frontend', sessionIndex: 0, stateFile: 'data/.state-fe0.json', quality: 'poor', label: '陈明远-字节跳动-差' },
  { accountName: 'frontend', sessionIndex: 1, stateFile: 'data/.state-fe1.json', quality: 'medium', label: '陈明远-阿里巴巴-中' },
  { accountName: 'frontend', sessionIndex: 2, stateFile: 'data/.state-fe2.json', quality: 'good', label: '陈明远-蚂蚁集团-好' },
  { accountName: 'frontend', sessionIndex: 3, stateFile: 'data/.state-fe3.json', quality: 'medium', label: '陈明远-自我介绍-中' },
  { accountName: 'frontend', sessionIndex: 4, stateFile: 'data/.state-fe4.json', quality: 'medium', label: '陈明远-项目问答-中' },
  { accountName: 'frontend', sessionIndex: 5, stateFile: 'data/.state-fe5.json', quality: 'medium', label: '陈明远-随机问答-中' },
  // 林晓薇 - AI Agent工程师
  { accountName: 'ai-agent', sessionIndex: 0, stateFile: 'data/.state-ai0.json', quality: 'poor', label: '林晓薇-智谱AI-差' },
  { accountName: 'ai-agent', sessionIndex: 1, stateFile: 'data/.state-ai1.json', quality: 'medium', label: '林晓薇-MiniMax-中' },
  { accountName: 'ai-agent', sessionIndex: 2, stateFile: 'data/.state-ai2.json', quality: 'good', label: '林晓薇-月之暗面-好' },
  { accountName: 'ai-agent', sessionIndex: 3, stateFile: 'data/.state-ai3.json', quality: 'medium', label: '林晓薇-自我介绍-中' },
  { accountName: 'ai-agent', sessionIndex: 4, stateFile: 'data/.state-ai4.json', quality: 'medium', label: '林晓薇-项目问答-中' },
  { accountName: 'ai-agent', sessionIndex: 5, stateFile: 'data/.state-ai5.json', quality: 'medium', label: '林晓薇-随机问答-中' },
]

function qualityPrompt(quality: 'poor' | 'medium' | 'good'): string {
  switch (quality) {
    case 'poor':
      return `你是一个面试经验不足的候选人，回答质量很差：
- 回答简短、缺乏结构，经常卡壳（用"呃"、"嗯"开头）
- 没有量化成果，技术深度不足
- 面对追问时容易露怯，诚实承认"我没参与设计""我只是执行"
- 用"应该""好像"等推测性词汇
- 自我介绍只有姓名+学校+工作年限，没有亮点
- 项目描述只停留在"用了什么技术"，说不出为什么选这个技术、踩过什么坑
- 不要硬编，诚实承认不足`
    case 'medium':
      return `你是一个有一定经验的候选人，回答质量中等：
- 自我介绍有结构（背景+项目+技术栈），有1-2个量化数字
- 项目问答能说清楚技术选型和实现方案，但Trade-off分析不够深入
- 技术问答概念基本正确，能写代码但边界条件考虑不全
- 面对追问能给出一定深度的回答，但偶尔卡壳
- 有准备但不够充分，有亮点但不够突出`
    case 'good':
      return `你是一个资深工程师，回答质量优秀：
- 自我介绍钩子开场（业务痛点/技术挑战），3个以上量化成果
- 项目问答：决策链路完整（谁提议→对比过什么方案→为什么选A）
- 故障排查时间线清晰（现象→定位→根因→修复→预防）
- 技术问答：原理+源码+实践结合，主动延伸相关知识点
- 表达流畅自信，用STAR法则描述项目
- 对目标公司和岗位有了解，主动展示匹配度`
  }
}

async function generateAnswer(
  question: string,
  quality: 'poor' | 'medium' | 'good',
  context: { position: string; targetCompany: string; currentState: string },
  history: { role: string; text: string }[],
): Promise<string> {
  const client = getKimiClient()

  const historyText = history
    .slice(-6)
    .map((h) => `${h.role}: ${h.text.slice(0, 200)}`)
    .join('\n')

  const prompt = `${qualityPrompt(quality)}

## 当前面试上下文
- 岗位: ${context.position}
- 目标公司: ${context.targetCompany}
- 当前阶段: ${context.currentState}

## 面试历史（最近几轮）
${historyText}

## 面试官最新问题
${question}

## 要求
1. 用第一人称回答，直接给出候选人的回答文本
2. 回答长度控制在 100-300 字之间
3. 不要添加任何解释、分析或"以下是回答"之类的引导语
4. 直接输出回答内容，就像候选人在面试中开口说话一样`

  const response = await client.chat.completions.create({
    model: KIMI_MODEL,
    messages: [
      { role: 'system', content: '你是一个面试候选人回答生成器。根据给定的质量目标和面试官问题，生成真实的候选人回答。只输出回答文本，不要添加任何额外内容。' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 500,
    ...KIMI_INSTANT_MODE,
  })

  const content = response.choices[0]?.message?.content ?? ''
  // 清理可能的引导语
  return content
    .replace(/^["']|["']$/g, '')
    .replace(/^(以下是回答[:：]|回答[:：]|Answer[:：])/i, '')
    .trim()
    .slice(0, 500)
}

async function replayOneSession(
  db: ReturnType<typeof getDb>,
  config: SessionConfig,
): Promise<{ label: string; turns: number; score?: number }> {
  console.log(`[${config.label}] 启动...`)

  // Seed base data
  const account = config.accountName === 'frontend' ? frontendAccount : aiAgentAccount
  seedAccount(db, account)

  // Create engine
  const engine = InteractiveEngine.create(
    db,
    config.accountName,
    config.sessionIndex,
    config.stateFile,
  )

  const history: { role: string; text: string }[] = []
  let stepCount = 0
  const maxSteps = 60

  while (stepCount < maxSteps) {
    stepCount++

    // Step 1: 获取面试官问题
    const qResult = await engine.step()

    if (qResult.event === 'interviewer_question') {
      history.push({ role: '面试官', text: qResult.text })

      // Step 2: 用 LLM 生成候选人回答
      const status = engine.getStatus()
      const answer = await generateAnswer(
        qResult.text,
        config.quality,
        { position: status.position, targetCompany: status.targetCompany ?? '', currentState: status.state },
        history,
      )

      history.push({ role: '候选人', text: answer })

      // Step 3: 提交回答
      const aResult = await engine.step(answer)

      if (aResult.event === 'end') {
        console.log(`[${config.label}] 面试结束，${engine.getStatus().turnCount} 轮`)
        break
      }
    } else if (qResult.event === 'end') {
      console.log(`[${config.label}] 面试结束，${engine.getStatus().turnCount} 轮`)
      break
    }
  }

  // Finalize
  await engine.finalize()

  // Generate review
  console.log(`[${config.label}] 生成复盘...`)
  await engine.generateReview()

  // Read scores
  const phaseReviewRepo = (await import('../lib/phase-reviews/repository.ts')).createPhaseReviewRepository(db)
  const fullReviewRepo = (await import('../lib/full-reviews/repository.ts')).createFullReviewRepository(db)
  const sid = engine.getStatus().sessionId
  const phaseReviews = phaseReviewRepo.listBySession(sid)
  const fullReview = fullReviewRepo.getBySessionId(sid)

  const scores = phaseReviews.map((p) => `${p.phase_type}:${p.total_score?.toFixed(2)}`).join(' ')
  const overall = fullReview?.overall_score?.toFixed(2) ?? 'N/A'
  console.log(`[${config.label}] ✅ 完成 | 阶段: ${scores} | 整面: ${overall}`)

  return {
    label: config.label,
    turns: engine.getStatus().turnCount,
    score: fullReview?.overall_score ?? undefined,
  }
}

async function main() {
  if (!env.KIMI_API_KEY) {
    console.error('❌ KIMI_API_KEY not configured')
    process.exit(1)
  }

  const db = getDb()

  console.log('════════════════════════════════════════════════════════════')
  console.log('  ByteReady 全自动并行 Replay - 12 Session')
  console.log('════════════════════════════════════════════════════════════')
  console.log(`启动时间: ${new Date().toLocaleString()}`)
  console.log(`并发数: ${SESSIONS.length}`)
  console.log('')

  const startTime = Date.now()

  // 并行执行所有 session
  const results = await Promise.all(
    SESSIONS.map((config) => replayOneSession(db, config).catch((e) => {
      console.error(`[${config.label}] ❌ 失败:`, e.message)
      return { label: config.label, turns: 0, score: undefined }
    })),
  )

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1)

  console.log('')
  console.log('════════════════════════════════════════════════════════════')
  console.log('  全部完成')
  console.log('════════════════════════════════════════════════════════════')
  console.log(`总耗时: ${elapsed} 分钟`)
  console.log('')

  for (const r of results) {
    console.log(`  ${r.label}: ${r.turns} 轮${r.score ? ` | 得分: ${r.score.toFixed(2)}` : ''}`)
  }

  closeDb()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
