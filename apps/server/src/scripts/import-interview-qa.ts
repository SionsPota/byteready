import { createRequire } from 'node:module'
import { randomUUID } from 'node:crypto'
import { getDb, closeDb } from '../lib/db/client.ts'

const require = createRequire(import.meta.url)

interface QaItem {
  instruction: string
  input: string
  output: string
  system: string
}

const DATA_PATH = 'D:/Code/byteready/apps/server/data/Chinese_interview_large.json'

export async function importInterviewQa(): Promise<{ imported: number; duration: number }> {
  const start = Date.now()
  const db = getDb()

  // 检查是否已导入
  const check = db.prepare('SELECT COUNT(*) as cnt FROM interview_qa').get() as { cnt: number }
  if (check.cnt > 0) {
    console.log(`[import-qa] 已存在 ${check.cnt} 条记录，跳过导入`)
    return { imported: 0, duration: 0 }
  }

  console.log('[import-qa] 读取 JSON 数据...')
  const data: QaItem[] = require(DATA_PATH)
  console.log(`[import-qa] 共 ${data.length} 条记录，开始导入...`)

  // 批量插入（每批 1000 条）
  const BATCH_SIZE = 1000
  const insert = db.prepare(
    'INSERT INTO interview_qa (question, answer, source, created_at) VALUES (?, ?, ?, ?)'
  )

  db.exec('BEGIN TRANSACTION')
  let imported = 0
  const now = Date.now()

  try {
    for (let i = 0; i < data.length; i++) {
      const item = data[i]
      if (!item) continue
      const question = (item.instruction ?? '').trim()
      const answer = (item.output ?? '').trim()
      if (!question) continue

      insert.run(question, answer, 'chinese_interview_large', now)
      imported++

      if (imported % BATCH_SIZE === 0) {
        db.exec('COMMIT')
        db.exec('BEGIN TRANSACTION')
        const pct = ((i / data.length) * 100).toFixed(1)
        console.log(`[import-qa] ${pct}% (${imported}/${data.length})`)
      }
    }

    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }

  // 重建 FTS 索引（批量导入后重建比触发器更高效）
  console.log('[import-qa] 重建 FTS 索引...')
  db.exec("INSERT INTO interview_qa_fts(interview_qa_fts) VALUES ('rebuild')")

  const duration = Date.now() - start
  console.log(`[import-qa] 导入完成: ${imported} 条，耗时 ${(duration / 1000).toFixed(1)}s`)

  return { imported, duration }
}

// 独立运行: node apps/server/src/scripts/import-interview-qa.ts
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  importInterviewQa()
    .then((r) => {
      console.log(r)
      closeDb()
      process.exit(0)
    })
    .catch((err) => {
      console.error('[import-qa] 失败:', err)
      closeDb()
      process.exit(1)
    })
}
