// 基于 tag 名称的跨类型互引：给定一组 tag，返回不属于自身的其他类型条目预览。
// V1 简单做：对每类做一次 SQL 查询，限 5 条。
// 题库（interview_qa）无 tag 列，将 tag 名作为 FTS5 关键词搜索；屏蔽通用 meta tag 避免命中过宽。

import type { DatabaseSync } from 'node:sqlite'
import { searchInterviewQa } from '../questions/search.ts'

export interface CrossRefExperience {
  id: string
  title: string
  companyName: string | null
  companyColor: string | null
  interviewRound: string | null
}

export interface CrossRefTrend {
  id: string
  title: string
  category: string
  relevanceBase: number
}

export interface CrossRefProject {
  id: string
  name: string
  description: string
  language: string | null
  stars: number | null
  impactScore: number
}

export interface CrossRefQuestion {
  id: number
  question: string
  answerPreview: string
}

export interface CrossRefs {
  experiences: CrossRefExperience[]
  trends: CrossRefTrend[]
  projects: CrossRefProject[]
  questions: CrossRefQuestion[]
}

const LIMIT_PER_TYPE = 5

// 通用/meta 标签，作为 FTS 关键词时命中过宽（年份、轮次、笼统岗位、学习路径等元概念），过滤掉。
const GENERIC_TAGS = new Set<string>([
  '面试热点',
  '面试题',
  '面试指南',
  '面试资料',
  '面试',
  '学习路线',
  '学习路径',
  '高频考点',
  '高频',
  '一面',
  '二面',
  '三面',
  '四面',
  '五面',
  '六面',
  'HR面',
  '技术面',
  '综合面',
  '行为面',
  '后端开发',
  '前端开发',
  '全栈开发',
  '算法工程师',
  '架构师',
  '实习生',
  '后端',
  '前端',
  '全栈',
  '算法',
])

const isGenericTag = (name: string): boolean => {
  if (GENERIC_TAGS.has(name)) return true
  // 形如 "2025趋势" / "2024热点" / "2025" 的年份 meta 标签
  if (/^20\d{2}(年)?(趋势|热点|预测)?$/.test(name)) return true
  return false
}

const dedupe = (arr: string[]): string[] => Array.from(new Set(arr.filter(Boolean)))

export const findRelatedByTags = (
  db: DatabaseSync,
  tagNames: string[],
  exclude: { type: 'experience' | 'trend' | 'project'; id: string },
): CrossRefs => {
  const tags = dedupe(tagNames)
  if (tags.length === 0) {
    return { experiences: [], trends: [], projects: [], questions: [] }
  }
  const placeholders = tags.map(() => '?').join(',')

  // 面经：通过 explore_tags + experience_tags 反查
  const expQuery = `
    SELECT e.id, e.title, e.interview_round, cp.name AS company_name, cp.color AS company_color,
           COUNT(DISTINCT t.id) AS overlap
    FROM experiences e
    JOIN experience_tags et ON et.experience_id = e.id
    JOIN explore_tags t ON t.id = et.tag_id
    LEFT JOIN company_profiles cp ON cp.id = e.company_id
    WHERE t.name IN (${placeholders})
      AND ${exclude.type === 'experience' ? 'e.id != ?' : '1=1'}
    GROUP BY e.id
    ORDER BY overlap DESC, e.created_at DESC
    LIMIT ?
  `
  const expParams: (string | number)[] = [...tags]
  if (exclude.type === 'experience') expParams.push(exclude.id)
  expParams.push(LIMIT_PER_TYPE)
  const experiences = (db.prepare(expQuery).all(...expParams) as Array<{
    id: string
    title: string
    interview_round: string | null
    company_name: string | null
    company_color: string | null
  }>).map((r) => ({
    id: r.id,
    title: r.title,
    interviewRound: r.interview_round,
    companyName: r.company_name,
    companyColor: r.company_color,
  }))

  // 趋势：通过 json_each 内嵌 tags 反查
  const trendQuery = `
    SELECT it.id, it.title, it.category, it.relevance_base, COUNT(*) AS overlap
    FROM industry_trends it, json_each(it.tags) je
    WHERE je.value IN (${placeholders})
      AND ${exclude.type === 'trend' ? 'it.id != ?' : '1=1'}
    GROUP BY it.id
    ORDER BY overlap DESC, it.relevance_base DESC
    LIMIT ?
  `
  const trendParams: (string | number)[] = [...tags]
  if (exclude.type === 'trend') trendParams.push(exclude.id)
  trendParams.push(LIMIT_PER_TYPE)
  const trends = (db.prepare(trendQuery).all(...trendParams) as Array<{
    id: string
    title: string
    category: string
    relevance_base: number
  }>).map((r) => ({
    id: r.id,
    title: r.title,
    category: r.category,
    relevanceBase: r.relevance_base,
  }))

  // 学习项目：同上
  const projectQuery = `
    SELECT lp.id, lp.name, lp.description, lp.language, lp.stars, lp.impact_score, COUNT(*) AS overlap
    FROM learning_projects lp, json_each(lp.tags) je
    WHERE je.value IN (${placeholders})
      AND ${exclude.type === 'project' ? 'lp.id != ?' : '1=1'}
    GROUP BY lp.id
    ORDER BY overlap DESC, lp.impact_score DESC, COALESCE(lp.stars,0) DESC
    LIMIT ?
  `
  const projParams: (string | number)[] = [...tags]
  if (exclude.type === 'project') projParams.push(exclude.id)
  projParams.push(LIMIT_PER_TYPE)
  const projects = (db.prepare(projectQuery).all(...projParams) as Array<{
    id: string
    name: string
    description: string
    language: string | null
    stars: number | null
    impact_score: number
  }>).map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    language: r.language,
    stars: r.stars,
    impactScore: r.impact_score,
  }))

  // 题库：FTS5 关键词搜索；过滤掉通用 meta tag（"面试热点"、"2025趋势"、"一面" 等）
  // 剩余 tag 用空格连接走 FTS OR 模式（searchInterviewQa 默认 OR）
  const ftsTags = tags.filter((t) => !isGenericTag(t))
  let questions: CrossRefQuestion[] = []
  if (ftsTags.length > 0) {
    const ftsQuery = ftsTags.join(' ')
    try {
      const result = searchInterviewQa(db, { q: ftsQuery, page: 1, limit: LIMIT_PER_TYPE })
      questions = result.rows.map((r) => ({
        id: r.id,
        question: r.question,
        answerPreview: r.answer.slice(0, 140),
      }))
    } catch {
      // FTS 异常时降级为空
      questions = []
    }
  }

  return { experiences, trends, projects, questions }
}
