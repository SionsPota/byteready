import { env } from '../env.ts'
import { getDb, closeDb } from '../lib/db/client.ts'
import { InteractiveEngine, listSessions, printStatus, clearState } from '../lib/demo/interactive-engine.ts'

// 解析参数，支持 --state-file
const args = process.argv.slice(2)
const stateFileFlag = args.indexOf('--state-file')
let stateFilePath: string | undefined
if (stateFileFlag !== -1 && args[stateFileFlag + 1]) {
  stateFilePath = args[stateFileFlag + 1]
  args.splice(stateFileFlag, 2)
}
const command = args[0]

function help() {
  console.log(`
用法: pnpm interactive:demo <command> [options] [--state-file <path>]

命令:
  list                           列出所有可 replay 的 session
  start <account> <index>        启动一个 session（如: frontend 0）
  status                         查看当前 session 状态
  answer --text "<回答>"         提交回答并推进一轮
  auto                           使用预编脚本自动运行剩余步骤
  review                         生成真实复盘（调用 LLM）
  reset                          清除当前 session 状态

并行隔离选项:
  --state-file <path>            指定独立的状态文件路径（用于多终端并行）
                                  默认: data/.demo-replay-state.json

示例:
  pnpm interactive:demo list
  pnpm interactive:demo start frontend 0
  pnpm interactive:demo start frontend 1 --state-file data/.state-s1.json
  pnpm interactive:demo status --state-file data/.state-s1.json
  pnpm interactive:demo answer --text "..." --state-file data/.state-s1.json
  pnpm interactive:demo review --state-file data/.state-s1.json
`)
}

async function main() {
  if (!env.KIMI_API_KEY) {
    console.error('❌ KIMI_API_KEY not configured')
    process.exit(1)
  }

  const db = getDb()

  try {
    switch (command) {
      case 'list':
        listSessions()
        break

      case 'start': {
        const accountName = args[1] ?? ''
        const sessionIndex = parseInt(args[2] ?? '', 10)
        if (!accountName || isNaN(sessionIndex)) {
          console.error('用法: start <account> <session-index>')
          console.error('如: start frontend 0')
          process.exit(1)
        }
        const engine = InteractiveEngine.create(db, accountName, sessionIndex, stateFilePath)
        const status = engine.getStatus()
        console.log(`✅ Session 已启动: ${status.sessionType} | ${status.position}`)
        if (stateFilePath) console.log(`📁 状态文件: ${stateFilePath}`)
        printStatus(status)
        break
      }

      case 'status': {
        const engine = InteractiveEngine.load(db, stateFilePath)
        if (!engine) {
          console.log('没有正在运行的 session，先用 start 命令启动')
          break
        }
        printStatus(engine.getStatus())
        break
      }

      case 'answer': {
        const textFlag = args.indexOf('--text')
        if (textFlag === -1 || !args[textFlag + 1]) {
          console.error('用法: answer --text "你的回答"')
          process.exit(1)
        }
        const answerText = args[textFlag + 1]

        const engine = InteractiveEngine.load(db, stateFilePath)
        if (!engine) {
          console.error('没有正在运行的 session，先用 start 命令启动')
          process.exit(1)
        }

        const result = await engine.step(answerText)
        console.log(`\n🙋 [候选人]: ${answerText!.slice(0, 80)}${answerText!.length > 80 ? '...' : ''}`)

        if (result.event === 'state_transition') {
          console.log(`\n➡️  状态转换: ${result.detail}`)
          const nextResult = await engine.step()
          if (nextResult.event === 'interviewer_question') {
            console.log(`\n🎤 [面试官]: ${nextResult.text}`)
          }
        } else if (result.event === 'end') {
          console.log(`\n🏁 ${result.detail}`)
        }

        const status = engine.getStatus()
        if (!status.completed) {
          console.log(`\n📍 当前状态: ${status.state} | 轮次: ${status.turnCount}`)
          console.log(`💡 继续输入回答，或运行 review 生成复盘`)
        } else {
          console.log(`\n✅ 面试结束，运行 review 生成复盘`)
        }
        break
      }

      case 'auto': {
        const engine = InteractiveEngine.load(db, stateFilePath)
        if (!engine) {
          console.error('没有正在运行的 session')
          process.exit(1)
        }

        const { frontendAccount } = await import('../lib/demo/frontend-data.ts')
        const { aiAgentAccount } = await import('../lib/demo/ai-agent-data.ts')
        const ACCOUNTS: Record<string, typeof frontendAccount> = { frontend: frontendAccount, 'ai-agent': aiAgentAccount }
        const status = engine.getStatus()
        const account = ACCOUNTS[status.accountName]
        const session = account?.sessions[status.sessionIndex]
        const scriptAnswers = session?.turns.filter((t) => t.kind === 'candidate').map((t) => t.text) ?? []

        let stepCount = 0
        let scriptIdx = 0
        const maxSteps = 80

        console.log(`🤖 自动运行中（使用预编脚本，共 ${scriptAnswers.length} 个回答）...\n`)

        while (stepCount < maxSteps) {
          stepCount++
          const qResult = await engine.step()

          if (qResult.event === 'interviewer_question') {
            console.log(`🎤 [面试官]: ${qResult.text.slice(0, 120)}${qResult.text.length > 120 ? '...' : ''}`)
          } else if (qResult.event === 'end') {
            console.log(`\n🏁 面试结束`)
            break
          }

          if (scriptIdx < scriptAnswers.length) {
            const answerText = scriptAnswers[scriptIdx]!
            scriptIdx++
            const aResult = await engine.step(answerText)

            if (aResult.event === 'candidate_answer') {
              console.log(`🙋 [候选人]: ${answerText.slice(0, 120)}${answerText.length > 120 ? '...' : ''}`)
            } else if (aResult.event === 'state_transition') {
              console.log(`➡️  ${aResult.detail}`)
            } else if (aResult.event === 'end') {
              console.log(`\n🏁 面试结束`)
              break
            }
          } else {
            console.log('⚠️ 预编脚本用完，停止自动运行')
            break
          }
        }

        console.log(`\n✅ 自动运行完成，共 ${stepCount} 步`)
        break
      }

      case 'review': {
        const engine = InteractiveEngine.load(db, stateFilePath)
        if (!engine) {
          console.error('没有正在运行的 session')
          process.exit(1)
        }

        console.log('📝 正在生成真实复盘（调用 LLM）...')
        await engine.generateReview()
        console.log('✅ 复盘生成完成')
        break
      }

      case 'reset':
        clearState(stateFilePath)
        console.log(`✅ 状态已重置${stateFilePath ? ' (' + stateFilePath + ')' : ''}`)
        break

      default:
        help()
        process.exit(1)
    }
  } catch (e) {
    console.error('❌ 错误:', e)
    process.exit(1)
  } finally {
    closeDb()
  }
}

main()
