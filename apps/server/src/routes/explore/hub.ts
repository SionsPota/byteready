// 探索 hub 聚合端点：一次性返回 4 类条目（面经/趋势/项目/题库）的预览 + 全局 tag 列表。
// V1 简单做：tag 过滤用 SQL 直接构造，搜索字段也直接 LIKE。题库走 FTS5。

import { Hono } from 'hono'
import { ok } from '@byteready/shared'
import { getDb } from '../../lib/db/client.ts'
import {
  decodeIndustryTrend,
  type IndustryTrendRow,
} from '../../lib/explore/trends.repository.ts'
import {
  decodeLearningProject,
  type LearningProjectRow,
} from '../../lib/explore/projects.repository.ts'
import { searchInterviewQa, getInterviewQaCount } from '../../lib/questions/search.ts'

export const hubRoute = new Hono()

const SECTION_LIMIT = 6
const TAG_LIMIT = 30

interface TagCount {
  name: string
  count: number
}

interface ExperiencePreview {
  id: string
  title: string
  contentPreview: string
  companyName: string | null
  companyColor: string | null
  position: string | null
  interviewRound: string | null
  interviewType: string | null
  difficulty: number | null
  tags: string[]
}

interface TrendPreview {
  id: string
  title: string
  category: string
  description: string
  relatedRole: string | null
  relevanceBase: number
  tags: string[]
}

interface ProjectPreview {
  id: string
  name: string
  description: string
  language: string | null
  category: string | null
  stars: number | null
  impactScore: number
  techStack: string[]
  tags: string[]
}

interface QuestionPreview {
  id: number
  question: string
  answerPreview: string
}

const safeParseArr = (s: string | null): string[] => {
  if (!s) return []
  try {
    const v = JSON.parse(s)
    return Array.isArray(v) ? (v as string[]) : []
  } catch {
    return []
  }
}

// GET /api/explore/hub?q=&tag=
hubRoute.get('/', (c) => {
  const db = getDb()
  const q = (c.req.query('q') ?? '').trim()
  const tag = (c.req.query('tag') ?? '').trim()
  const like = q ? `%${q}%` : null

  // ========== 1. 面经（experience_tags M:N） ==========
  let expFilter = ''
  const expParams: (string | number)[] = []
  if (q) {
    expFilter += `(e.title LIKE ? OR e.content LIKE ? OR e.position LIKE ? OR e.answer_key_points LIKE ?) `
    expParams.push(like!, like!, like!, like!)
  }
  if (tag) {
    if (expFilter) expFilter += 'AND '
    expFilter += `e.id IN (SELECT et.experience_id FROM experience_tags et JOIN explore_tags t ON t.id = et.tag_id WHERE t.name = ?) `
    expParams.push(tag)
  }
  const expWhere = expFilter ? `WHERE ${expFilter}` : ''
  const expTotal = (db
    .prepare(`SELECT COUNT(*) AS cnt FROM experiences e ${expWhere}`)
    .get(...expParams) as { cnt: number }).cnt
  const expRows = db
    .prepare(
      `SELECT e.id, e.title, e.content, e.position, e.interview_round, e.interview_type, e.difficulty,
              cp.name AS company_name, cp.color AS company_color
       FROM experiences e
       LEFT JOIN company_profiles cp ON cp.id = e.company_id
       ${expWhere}
       ORDER BY e.created_at DESC
       LIMIT ?`,
    )
    .all(...expParams, SECTION_LIMIT) as Array<{
    id: string
    title: string
    content: string | null
    position: string | null
    interview_round: string | null
    interview_type: string | null
    difficulty: number | null
    company_name: string | null
    company_color: string | null
  }>
  const expIds = expRows.map((r) => r.id)
  const expTagsMap = new Map<string, string[]>()
  if (expIds.length > 0) {
    const placeholders = expIds.map(() => '?').join(',')
    const tagRows = db
      .prepare(
        `SELECT et.experience_id, t.name
         FROM experience_tags et
         JOIN explore_tags t ON t.id = et.tag_id
         WHERE et.experience_id IN (${placeholders})`,
      )
      .all(...expIds) as Array<{ experience_id: string; name: string }>
    for (const tr of tagRows) {
      const list = expTagsMap.get(tr.experience_id) ?? []
      list.push(tr.name)
      expTagsMap.set(tr.experience_id, list)
    }
  }
  const experiences: ExperiencePreview[] = expRows.map((r) => ({
    id: r.id,
    title: r.title,
    contentPreview: (r.content ?? '').slice(0, 140),
    companyName: r.company_name,
    companyColor: r.company_color,
    position: r.position,
    interviewRound: r.interview_round,
    interviewType: r.interview_type,
    difficulty: r.difficulty,
    tags: expTagsMap.get(r.id) ?? [],
  }))

  // ========== 2. 趋势（tags 内嵌 JSON） ==========
  let trendFilter = ''
  const trendParams: (string | number)[] = []
  if (q) {
    trendFilter += `(title LIKE ? OR description LIKE ? OR category LIKE ? OR interview_hotspots LIKE ?) `
    trendParams.push(like!, like!, like!, like!)
  }
  if (tag) {
    if (trendFilter) trendFilter += 'AND '
    trendFilter += `EXISTS (SELECT 1 FROM json_each(industry_trends.tags) WHERE value = ?) `
    trendParams.push(tag)
  }
  const trendWhere = trendFilter ? `WHERE ${trendFilter}` : ''
  const trendTotal = (db
    .prepare(`SELECT COUNT(*) AS cnt FROM industry_trends ${trendWhere}`)
    .get(...trendParams) as { cnt: number }).cnt
  const trendRows = db
    .prepare(
      `SELECT * FROM industry_trends ${trendWhere}
       ORDER BY relevance_base DESC, created_at DESC
       LIMIT ?`,
    )
    .all(...trendParams, SECTION_LIMIT) as unknown as IndustryTrendRow[]
  const trends: TrendPreview[] = trendRows.map(decodeIndustryTrend).map((t) => ({
    id: t.id,
    title: t.title,
    category: t.category,
    description: t.description,
    relatedRole: t.relatedRole,
    relevanceBase: t.relevanceBase,
    tags: t.tags,
  }))

  // ========== 3. 项目（tags 内嵌 JSON） ==========
  let projFilter = ''
  const projParams: (string | number)[] = []
  if (q) {
    projFilter += `(name LIKE ? OR description LIKE ? OR category LIKE ? OR language LIKE ? OR tech_stack LIKE ?) `
    projParams.push(like!, like!, like!, like!, like!)
  }
  if (tag) {
    if (projFilter) projFilter += 'AND '
    projFilter += `EXISTS (SELECT 1 FROM json_each(learning_projects.tags) WHERE value = ?) `
    projParams.push(tag)
  }
  const projWhere = projFilter ? `WHERE ${projFilter}` : ''
  const projTotal = (db
    .prepare(`SELECT COUNT(*) AS cnt FROM learning_projects ${projWhere}`)
    .get(...projParams) as { cnt: number }).cnt
  const projRows = db
    .prepare(
      `SELECT * FROM learning_projects ${projWhere}
       ORDER BY impact_score DESC, COALESCE(stars,0) DESC, created_at DESC
       LIMIT ?`,
    )
    .all(...projParams, SECTION_LIMIT) as unknown as LearningProjectRow[]
  const projects: ProjectPreview[] = projRows.map(decodeLearningProject).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    language: p.language,
    category: p.category,
    stars: p.stars,
    impactScore: p.impactScore,
    techStack: p.techStack,
    tags: p.tags,
  }))

  // ========== 4. 题库（FTS5；无 tag 概念，tag 选中时用 tag 作为关键词降级搜索） ==========
  const qaQuery = q || tag
  let questions: QuestionPreview[] = []
  let questionsTotal = 0
  if (qaQuery) {
    const result = searchInterviewQa(db, { q: qaQuery, page: 1, limit: SECTION_LIMIT })
    questionsTotal = result.total
    questions = result.rows.map((r) => ({
      id: r.id,
      question: r.question,
      answerPreview: r.answer.slice(0, 140),
    }))
  } else {
    // 无搜索词时返回随机/最早 N 条作为预览
    questionsTotal = getInterviewQaCount(db)
    const rows = db
      .prepare('SELECT id, question, answer FROM interview_qa LIMIT ?')
      .all(SECTION_LIMIT) as Array<{ id: number; question: string; answer: string }>
    questions = rows.map((r) => ({
      id: r.id,
      question: r.question,
      answerPreview: r.answer.slice(0, 140),
    }))
  }

  // ========== 5. 全局 tag 列表（合并 experiences/trends/projects 的 tag 名称，按出现频次倒序） ==========
  // 5.1 experiences 来源（M:N）
  const expTagCounts = db
    .prepare(
      `SELECT t.name, COUNT(*) AS cnt
       FROM explore_tags t
       JOIN experience_tags et ON et.tag_id = t.id
       GROUP BY t.name`,
    )
    .all() as Array<{ name: string; cnt: number }>

  // 5.2 trends 来源（JSON）
  const trendTagCounts = db
    .prepare(
      `SELECT je.value AS name, COUNT(*) AS cnt
       FROM industry_trends, json_each(industry_trends.tags) je
       WHERE industry_trends.tags IS NOT NULL
       GROUP BY je.value`,
    )
    .all() as Array<{ name: string; cnt: number }>

  // 5.3 projects 来源（JSON）
  const projTagCounts = db
    .prepare(
      `SELECT je.value AS name, COUNT(*) AS cnt
       FROM learning_projects, json_each(learning_projects.tags) je
       WHERE learning_projects.tags IS NOT NULL
       GROUP BY je.value`,
    )
    .all() as Array<{ name: string; cnt: number }>

  const tagMap = new Map<string, number>()
  for (const r of [...expTagCounts, ...trendTagCounts, ...projTagCounts]) {
    if (!r.name) continue
    tagMap.set(r.name, (tagMap.get(r.name) ?? 0) + r.cnt)
  }
  const allTags: TagCount[] = [...tagMap]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, TAG_LIMIT)

  return c.json(
    ok({
      allTags,
      sections: {
        experiences: { total: expTotal, items: experiences },
        trends: { total: trendTotal, items: trends },
        projects: { total: projTotal, items: projects },
        questions: { total: questionsTotal, items: questions },
      },
    }),
  )
})
