import { env } from '../env.ts'
import { getDb, closeDb } from '../lib/db/client.ts'
import { SessionReplayer } from '../lib/demo/replay-engine.ts'
import { seedAccount } from '../lib/demo/seed.ts'
import { frontendAccount } from '../lib/demo/frontend-data.ts'
import { aiAgentAccount } from '../lib/demo/ai-agent-data.ts'
import type { DemoAccount, DemoSession } from '../lib/demo/seed.ts'

function extractCandidateScript(session: DemoSession): string[] {
  return session.turns.filter((t) => t.kind === 'candidate').map((t) => t.text)
}

async function replayAccount(db: ReturnType<typeof getDb>, account: DemoAccount): Promise<void> {
  seedAccount(db, account)

  // 清理已有 session
  const sessions = db.prepare('SELECT id FROM training_sessions WHERE owner_id = ?').all(account.user.id) as Array<{ id: string }>
  for (const s of sessions) {
    db.prepare('DELETE FROM training_turns WHERE session_id = ?').run(s.id)
    db.prepare('DELETE FROM phase_reviews WHERE session_id = ?').run(s.id)
    db.prepare('DELETE FROM full_reviews WHERE session_id = ?').run(s.id)
    db.prepare('DELETE FROM training_sessions WHERE id = ?').run(s.id)
  }
  console.log(`[replay] Cleaned up ${sessions.length} existing sessions for ${account.user.name}`)

  const projectIds = account.projects.map((p) => p.id)

  for (const session of account.sessions) {
    const script = extractCandidateScript(session)
    console.log(`[replay] Replaying ${account.user.name} - ${session.type} (${script.length} answers)...`)

    const replayer = new SessionReplayer(
      db,
      account.user.id,
      account.resume.id,
      projectIds,
      session,
      script,
    )

    // 开场
    replayer.start()

    // 自动运行所有步骤
    let done = false
    let stepCount = 0
    while (!done && stepCount < 60) {
      stepCount++
      const result = await replayer.step()
      if (result.done) {
        done = true
      }
    }

    await replayer.finalize()
    console.log(`[replay] Session ended: ${replayer.totalTurns} turns, state: ${replayer.state}`)

    // 生成真实复盘
    await replayer.generateReviews()
  }
}

async function main() {
  if (!env.KIMI_API_KEY) {
    console.error('[replay] KIMI_API_KEY not configured')
    process.exit(1)
  }

  const db = getDb()
  try {
    await replayAccount(db, frontendAccount)
    await replayAccount(db, aiAgentAccount)
    console.log('[replay] All sessions replayed successfully')
  } catch (e) {
    console.error('[replay] Failed:', e)
    throw e
  } finally {
    closeDb()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
