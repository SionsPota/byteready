import type { DatabaseSync } from 'node:sqlite'

export interface InterviewQaRow {
  id: number
  question: string
  answer: string
  source: string | null
  created_at: number
}

export interface SearchResult {
  rows: InterviewQaRow[]
  total: number
  page: number
  limit: number
}

/**
 * 基于 FTS5 的关键词搜索 Repository
 *
 * 用法：
 *   search(db, { q: 'TCP 三次握手', page: 1, limit: 20 })
 *   search(db, { q: 'redis 缓存', page: 1, limit: 20, mode: 'AND' })
 */
export const searchInterviewQa = (
  db: DatabaseSync,
  opts: {
    q: string
    page?: number
    limit?: number
    mode?: 'AND' | 'OR'
  },
): SearchResult => {
  const page = Math.max(1, opts.page ?? 1)
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20))
  const offset = (page - 1) * limit
  const mode = opts.mode ?? 'OR'

  const raw = opts.q.trim()
  if (!raw) {
    return { rows: [], total: 0, page, limit }
  }

  // 分词：按空格/标点拆分，过滤空串和停用词
  const tokens = raw
    .split(/[\s\p{P}]+/u)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
    .filter((t) => !STOP_WORDS.has(t))

  if (tokens.length === 0) {
    //  fallback 到 LIKE 精确匹配
    const likePattern = `%${raw}%`
    const countSql = 'SELECT COUNT(*) as total FROM interview_qa WHERE question LIKE ?'
    const totalRow = db.prepare(countSql).get(likePattern) as { total: number }

    const listSql =
      'SELECT id, question, answer, source, created_at FROM interview_qa WHERE question LIKE ? LIMIT ? OFFSET ?'
    const rows = db.prepare(listSql).all(likePattern, limit, offset) as unknown as InterviewQaRow[]

    return { rows, total: totalRow.total, page, limit }
  }

  // 构建 FTS5 查询表达式
  // AND 模式: "TCP" + "三次" + "握手"
  // OR  模式: "TCP" OR "三次" OR "握手"
  const joiner = mode === 'AND' ? ' + ' : ' OR '
  const ftsQuery = tokens.map(escapeFts).join(joiner)

  // 先查总数
  const countSql = `
    SELECT COUNT(*) as total FROM interview_qa_fts
    WHERE interview_qa_fts MATCH ?
  `
  const totalRow = db.prepare(countSql).get(ftsQuery) as { total: number }

  // 查结果 + 按 rank 排序（FTS5 内置 BM25 排名）
  // 注意：MATCH 必须在原始表名对应的隐含列上执行，不能用别名
  const listSql = `
    SELECT qa.id, qa.question, qa.answer, qa.source, qa.created_at
    FROM interview_qa_fts
    JOIN interview_qa qa ON interview_qa_fts.rowid = qa.id
    WHERE interview_qa_fts MATCH ?
    ORDER BY rank
    LIMIT ? OFFSET ?
  `
  const rows = db.prepare(listSql).all(ftsQuery, limit, offset) as unknown as InterviewQaRow[]

  return { rows, total: totalRow.total, page, limit }
}

/** 获取单条详情 */
export const getInterviewQaById = (db: DatabaseSync, id: number): InterviewQaRow | null => {
  const row = db
    .prepare('SELECT id, question, answer, source, created_at FROM interview_qa WHERE id = ?')
    .get(id) as InterviewQaRow | undefined
  return row ?? null
}

/** 获取总条数 */
export const getInterviewQaCount = (db: DatabaseSync): number => {
  const row = db.prepare('SELECT COUNT(*) as cnt FROM interview_qa').get() as { cnt: number }
  return row.cnt
}

/** 检查是否已导入 */
export const isInterviewQaImported = (db: DatabaseSync): boolean => {
  return getInterviewQaCount(db) > 0
}

// ========== 内部工具 ==========

/** 转义 FTS5 查询中的特殊字符 */
function escapeFts(token: string): string {
  // FTS5 中特殊字符需要转义或加引号
  const safe = token.replace(/"/g, '""')
  return `"${safe}"`
}

/** 中文停用词（简单集合） */
const STOP_WORDS = new Set([
  '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也',
  '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '那',
  '吗', '呢', '吧', '啊', '哦', '嗯', '什么', '怎么', '如何', '为什么', '是否', '能否',
  '可以', '需要', '应该', '能够', '一下', '一些', '一个', '请问', '能否', '请问一下',
])
