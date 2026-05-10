import { getDb, closeDb } from '../lib/db/client.ts'

const DEMO_EMAILS = ['demo-frontend@byteready.com', 'demo-ai-agent@byteready.com']

interface SessionRow {
  id: string
  owner_id: string
  type: string
  target_company: string | null
  status: string
  current_state: string
  created_at: number
  email: string
  has_full_review: number
  full_score: number | null
  phase_review_count: number
}

function listDemoSessions(db: ReturnType<typeof getDb>): SessionRow[] {
  return db.prepare(`
    SELECT
      s.id, s.owner_id, s.type, s.target_company, s.status, s.current_state, s.created_at,
      u.email,
      CASE WHEN fr.id IS NOT NULL THEN 1 ELSE 0 END AS has_full_review,
      fr.overall_score AS full_score,
      (SELECT COUNT(*) FROM phase_reviews WHERE session_id = s.id) AS phase_review_count
    FROM training_sessions s
    JOIN users u ON s.owner_id = u.id
    LEFT JOIN full_reviews fr ON fr.session_id = s.id
    WHERE u.email IN (?, ?)
    ORDER BY s.created_at DESC
  `).all(DEMO_EMAILS[0]!, DEMO_EMAILS[1]!) as unknown as SessionRow[]
}

function pickKeeper(group: SessionRow[]): SessionRow | null {
  const ended = group.filter((s) => s.status === 'ended')
  if (ended.length === 0) return null

  const isFull = group[0]!.type === 'full'
  if (isFull) {
    const withFull = ended
      .filter((s) => s.has_full_review === 1 && (s.full_score ?? 0) > 0)
      .sort((a, b) => b.created_at - a.created_at)
    if (withFull.length > 0) return withFull[0]!
  } else {
    const withPhase = ended
      .filter((s) => s.phase_review_count > 0)
      .sort((a, b) => b.created_at - a.created_at)
    if (withPhase.length > 0) return withPhase[0]!
  }

  return ended.sort((a, b) => b.created_at - a.created_at)[0]!
}

function groupKey(s: SessionRow): string {
  if (s.type === 'full') return `${s.email}|full|${s.target_company ?? ''}`
  return `${s.email}|${s.type}`
}

function deleteSession(db: ReturnType<typeof getDb>, sessionId: string): void {
  db.prepare('DELETE FROM training_turns WHERE session_id = ?').run(sessionId)
  db.prepare('DELETE FROM phase_reviews WHERE session_id = ?').run(sessionId)
  db.prepare('DELETE FROM full_reviews WHERE session_id = ?').run(sessionId)
  db.prepare('DELETE FROM training_sessions WHERE id = ?').run(sessionId)
}

function formatRow(s: SessionRow): string {
  const company = s.target_company ?? '-'
  const score = s.full_score != null ? s.full_score.toFixed(2) : 'N/A'
  const time = new Date(s.created_at).toISOString().slice(0, 19).replace('T', ' ')
  return `  ${s.email.replace('@byteready.com','').replace('demo-','').padEnd(10)} | ${s.type.padEnd(10)} | ${company.padEnd(10)} | ${s.status}/${s.current_state.padEnd(20)} | full:${score} | phases:${s.phase_review_count} | ${time}`
}

function main(): void {
  const db = getDb()
  console.log('═════════════════════════════════════════════════════════')
  console.log('  Demo Session Cleanup')
  console.log('═════════════════════════════════════════════════════════')

  const all = listDemoSessions(db)
  console.log(`\n现状: ${all.length} 个 demo session`)

  const groups = new Map<string, SessionRow[]>()
  for (const s of all) {
    const k = groupKey(s)
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(s)
  }

  console.log(`\n分组: ${groups.size} 组`)

  const keepIds = new Set<string>()
  const dropIds: SessionRow[] = []

  for (const [key, group] of groups) {
    const keeper = pickKeeper(group)
    console.log(`\n[${key}] ${group.length} 个候选`)
    for (const s of group) {
      const tag = keeper && s.id === keeper.id ? '✅ KEEP' : '❌ DROP'
      console.log(`${tag} ${formatRow(s)}`)
      if (keeper && s.id === keeper.id) keepIds.add(s.id)
      else dropIds.push(s)
    }
  }

  console.log('\n─────────────────────────────────────────────────────────')
  console.log(`计划保留: ${keepIds.size} | 计划删除: ${dropIds.length}`)

  if (dropIds.length === 0) {
    console.log('✅ 无需清理')
    closeDb()
    return
  }

  const dryRun = process.argv.includes('--dry-run')
  if (dryRun) {
    console.log('\n[DRY RUN] 不执行删除')
    closeDb()
    return
  }

  console.log('\n开始清理...')
  let deleted = 0
  db.exec('BEGIN')
  try {
    for (const s of dropIds) {
      deleteSession(db, s.id)
      deleted++
    }
    db.exec('COMMIT')
    console.log(`✅ 已删除 ${deleted} 个 session 及其关联数据`)
  } catch (e) {
    db.exec('ROLLBACK')
    console.error('❌ 清理失败，已回滚:', e)
    process.exit(1)
  }

  const after = listDemoSessions(db)
  console.log(`\n清理后: ${after.length} 个 demo session`)
  for (const s of after) {
    console.log(formatRow(s))
  }

  closeDb()
}

main()
