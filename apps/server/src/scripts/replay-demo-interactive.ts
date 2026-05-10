import readline from 'node:readline'
import { env } from '../env.ts'
import { getDb, closeDb } from '../lib/db/client.ts'
import { SessionReplayer } from '../lib/demo/replay-engine.ts'
import { seedAccount } from '../lib/demo/seed.ts'
import { frontendAccount } from '../lib/demo/frontend-data.ts'
import { aiAgentAccount } from '../lib/demo/ai-agent-data.ts'
import type { DemoAccount, DemoSession } from '../lib/demo/seed.ts'

const ACCOUNTS: DemoAccount[] = [frontendAccount, aiAgentAccount]

function extractCandidateScript(session: DemoSession): string[] {
  return session.turns.filter((t) => t.kind === 'candidate').map((t) => t.text)
}

function ask(prompt: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

function printDivider() {
  console.log('\n' + '─'.repeat(60))
}

function printState(state: string) {
  const emoji: Record<string, string> = {
    SELF_INTRO: '👤',
    PROJECT_SINGLE_1: '📁',
    PROJECT_SINGLE_2: '📁',
    PROJECT_CROSS: '🔗',
    QNA_TECH: '💡',
    QNA_ALGO: '🧮',
    QNA_SCENE: '🏗️',
    END: '✅',
  }
  console.log(`\n${emoji[state] ?? '▶️'}  当前状态: ${state}`)
}

async function replaySessionInteractive(
  db: ReturnType<typeof getDb>,
  account: DemoAccount,
  session: DemoSession,
  autoMode: boolean,
): Promise<void> {
  const script = extractCandidateScript(session)
  const replayer = new SessionReplayer(
    db,
    account.user.id,
    account.resume.id,
    account.projects.map((p) => p.id),
    session,
    script,
  )

  printDivider()
  console.log(`🎬 Session: ${session.type} | 岗位: ${session.position}`)
  if (session.targetCompany) console.log(`   目标公司: ${session.targetCompany}`)
  console.log(`   预编回答: ${script.length} 个`)
  printDivider()

  // 开场白
  const startResult = replayer.start()
  printState(startResult.state)
  console.log(`🎤 [面试官]: ${startResult.text}`)

  let done = false
  let stepCount = 0
  const maxSteps = 60

  while (!done && stepCount < maxSteps) {
    stepCount++

    if (!autoMode) {
      const cmd = await ask('\n[Enter] 下一步  [a] 自动运行  [q] 退出 > ')
      if (cmd === 'q') {
        console.log('👋 已退出交互模式')
        await replayer.finalize()
        return
      }
      if (cmd === 'a') autoMode = true
    } else {
      // 自动模式下短暂停顿，方便观察
      await new Promise((r) => setTimeout(r, 300))
    }

    const result = await replayer.step()

    if (result.event === 'interviewer_question') {
      printState(result.state)
      console.log(`🎤 [面试官]: ${result.text}`)
    } else if (result.event === 'candidate_answer') {
      console.log(`🙋 [候选人]: ${result.text}`)
      console.log(`   ${result.detail}`)
    } else if (result.event === 'state_transition') {
      printState(result.state)
      if (result.text) console.log(`🙋 [候选人]: ${result.text}`)
      console.log(`   ➡️  ${result.detail}`)
    } else if (result.event === 'end') {
      printState('END')
      console.log(`🏁 面试结束: ${result.text}`)
      if (result.detail) console.log(`   ${result.detail}`)
      done = true
    }
  }

  if (!done) {
    console.log('⚠️ 达到最大步数限制，强制结束')
    await replayer.finalize()
  }

  // 生成复盘
  printDivider()
  console.log('📝 正在生成真实复盘（调用 LLM）...')
  await replayer.generateReviews()

  // 读取并显示复盘结果
  const phaseReviewRepo = (await import('../lib/phase-reviews/repository.ts')).createPhaseReviewRepository(db)
  const fullReviewRepo = (await import('../lib/full-reviews/repository.ts')).createFullReviewRepository(db)

  const phaseReviews = phaseReviewRepo.listBySession(replayer.id)
  console.log('\n📊 阶段复盘:')
  for (const pr of phaseReviews) {
    const scores = pr.scores ? (JSON.parse(pr.scores) as Array<{ dimension: string; score: number }>) : []
    console.log(`   ${pr.phase_type}: ${pr.total_score?.toFixed(2) ?? 'N/A'}`)
    for (const s of scores) {
      console.log(`      ${s.dimension}: ${s.score}`)
    }
  }

  const fullReview = fullReviewRepo.getBySessionId(replayer.id)
  if (fullReview) {
    console.log(`\n📊 整面复盘:`)
    console.log(`   总评分: ${fullReview.overall_score?.toFixed(2) ?? 'N/A'}`)
    console.log(`   连贯性: ${fullReview.coherence_score?.toFixed(2) ?? 'N/A'}`)
    console.log(`   JD匹配: ${fullReview.jd_match_score?.toFixed(2) ?? 'N/A'}`)
    console.log(`   评价: ${fullReview.overall_evaluation.slice(0, 100)}...`)
  }

  console.log(`\n✅ Session ${replayer.id} replay 完成，共 ${replayer.totalTurns} 轮`)
}

async function main() {
  if (!env.KIMI_API_KEY) {
    console.error('❌ KIMI_API_KEY not configured')
    process.exit(1)
  }

  const db = getDb()

  // 确保基础数据存在
  for (const account of ACCOUNTS) {
    seedAccount(db, account)
  }

  console.log('╔══════════════════════════════════════════════════════════╗')
  console.log('║     ByteReady Demo Replay - 交互式训练链路回放           ║')
  console.log('╚══════════════════════════════════════════════════════════╝')
  console.log('\n说明: 候选人回答已预编，面试官问题由 Kimi 实时生成，')
  console.log('      复盘也由 LLM 实时生成。')
  console.log()

  while (true) {
    console.log('\n选择账号:')
    for (let i = 0; i < ACCOUNTS.length; i++) {
      const a = ACCOUNTS[i]!
      console.log(`  [${i + 1}] ${a.user.name} (${a.user.email})`)
    }
    console.log('  [3] 全部账号（批量运行）')
    console.log('  [q] 退出')

    const accountChoice = await ask('\n> ')
    if (accountChoice === 'q') break

    const accountIndex = parseInt(accountChoice, 10) - 1
    if (accountIndex < 0 || accountIndex >= ACCOUNTS.length) {
      if (accountChoice === '3') {
        // 批量模式
        for (const account of ACCOUNTS) {
          for (const session of account.sessions) {
            await replaySessionInteractive(db, account, session, true)
          }
        }
        console.log('\n🎉 全部 replay 完成')
        continue
      }
      console.log('无效选择')
      continue
    }

    const account = ACCOUNTS[accountIndex]!

    // 选择 session
    console.log(`\n${account.user.name} 的训练记录:`)
    for (let i = 0; i < account.sessions.length; i++) {
      const s = account.sessions[i]!
      console.log(`  [${i + 1}] ${s.type} | ${s.position}${s.targetCompany ? ' @ ' + s.targetCompany : ''}`)
    }
    console.log('  [a] 全部')

    const sessionChoice = await ask('\n> ')
    const sessionsToReplay: DemoSession[] = []

    if (sessionChoice === 'a') {
      sessionsToReplay.push(...account.sessions)
    } else {
      const idx = parseInt(sessionChoice, 10) - 1
      if (idx >= 0 && idx < account.sessions.length) {
        sessionsToReplay.push(account.sessions[idx]!)
      } else {
        console.log('无效选择')
        continue
      }
    }

    // 选择模式
    const mode = await ask('\n模式: [i] 交互式(逐轮观察)  [a] 自动运行 > ')
    const autoMode = mode === 'a'

    for (const session of sessionsToReplay) {
      await replaySessionInteractive(db, account, session, autoMode)
    }
  }

  closeDb()
  console.log('\n👋 再见')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
