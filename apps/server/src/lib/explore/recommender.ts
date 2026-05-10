// 探索模块的角色映射推荐器：基于简历 skills 推角色，再按角色与缺口给趋势/项目排序。
// 算法参考 refer/project-and-trend/app/api/{project,trend}-router.ts，做了纯函数化以便测试。
// V1 留接口（detectRole/identifyGaps/recommendTrends/recommendProjects），V2 可换 LLM/RAG 实现。

import {
  ROLE_KEYS,
  ROLE_REQUIREMENTS,
  ROLE_ALIASES,
  type RoleKey,
} from './role-data.ts'

export interface SkillGap {
  skill: string
  category: 'missing'
  importance: number
}

export interface TrendForRecommend {
  id: string
  related_role: string | null
  related_skills: string[]
  relevance_base: number
}

export interface ProjectForRecommend {
  id: string
  related_role: string | null
  related_skills: string[]
  gap_addressed: string | null
  impact_score: number
  project_type: 'quick_win' | 'weekend_build' | 'deep_dive' | null
  difficulty: 'beginner' | 'intermediate' | 'advanced' | null
}

export interface ScoredItem<T> {
  item: T
  score: number
}

const lower = (s: string): string => s.toLowerCase().trim()

const fuzzyContains = (a: string, b: string): boolean => {
  const la = lower(a)
  const lb = lower(b)
  if (!la || !lb) return false
  return la.includes(lb) || lb.includes(la)
}

const intersectionSize = (a: string[], b: string[]): number => {
  if (a.length === 0 || b.length === 0) return 0
  let count = 0
  for (const x of a) {
    if (b.some((y) => fuzzyContains(x, y))) count++
  }
  return count
}

/**
 * 根据 skills 匹配最可能的角色。
 * - 同时考虑 ROLE_REQUIREMENTS.skills（技能匹配）和 ROLE_ALIASES（角色名直接出现）
 * - 无明显匹配时回退到 'fullstack'
 */
export const detectRole = (skills: string[]): RoleKey => {
  if (!skills || skills.length === 0) return 'fullstack'
  const skillsLower = skills.map(lower).filter(Boolean)

  const scores: Record<RoleKey, number> = {
    frontend: 0,
    backend: 0,
    fullstack: 0,
    ai: 0,
    data: 0,
    devops: 0,
    mobile: 0,
    product: 0,
  }

  for (const role of ROLE_KEYS) {
    // skills 命中 → +2
    const reqSkills = ROLE_REQUIREMENTS[role].skills
    for (const reqSkill of reqSkills) {
      if (skillsLower.some((s) => fuzzyContains(s, reqSkill))) {
        scores[role] += 2
      }
    }
    // alias 命中（用户简历直接写"前端"/"frontend"等）→ +3
    const aliases = ROLE_ALIASES[role]
    for (const alias of aliases) {
      if (skillsLower.some((s) => fuzzyContains(s, alias))) {
        scores[role] += 3
      }
    }
  }

  let best: RoleKey = 'fullstack'
  let bestScore = -1
  for (const role of ROLE_KEYS) {
    if (scores[role] > bestScore) {
      best = role
      bestScore = scores[role]
    }
  }
  return bestScore > 0 ? best : 'fullstack'
}

/**
 * 找出该角色画像中缺失的技能。
 */
export const identifyGaps = (skills: string[], role: RoleKey): SkillGap[] => {
  const req = ROLE_REQUIREMENTS[role]
  const skillsLower = (skills ?? []).map(lower).filter(Boolean)
  const gaps: SkillGap[] = []
  for (const gap of req.gaps) {
    const covered = skillsLower.some((s) => fuzzyContains(s, gap))
    if (!covered) {
      gaps.push({ skill: gap, category: 'missing', importance: 8 })
    }
  }
  return gaps
}

/**
 * 给趋势打分排序：相关技能交集 ×2 + 角色匹配 +5 + relevance_base
 */
export const recommendTrends = <T extends TrendForRecommend>(
  skills: string[],
  role: RoleKey | null,
  trends: T[],
): ScoredItem<T>[] => {
  const skillsArr = skills ?? []
  const scored: ScoredItem<T>[] = trends.map((trend) => {
    const overlap = intersectionSize(skillsArr, trend.related_skills ?? [])
    const roleHit = role && trend.related_role && trend.related_role === role ? 5 : 0
    const score = overlap * 2 + roleHit + (trend.relevance_base ?? 7)
    return { item: trend, score }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored
}

/**
 * 给项目打分排序：技能交集 ×2 + 角色匹配 +5 + 缺口命中 +3/项 + impact_score
 */
export const recommendProjects = <T extends ProjectForRecommend>(
  skills: string[],
  role: RoleKey | null,
  gaps: SkillGap[],
  projects: T[],
): ScoredItem<T>[] => {
  const skillsArr = skills ?? []
  const gapNames = (gaps ?? []).map((g) => g.skill)
  const scored: ScoredItem<T>[] = projects.map((project) => {
    const overlap = intersectionSize(skillsArr, project.related_skills ?? [])
    const roleHit = role && project.related_role && project.related_role === role ? 5 : 0
    const gapAddressed = project.gap_addressed ?? ''
    const gapHit = gapNames.some((g) => fuzzyContains(gapAddressed, g)) ? 3 : 0
    const score = overlap * 2 + roleHit + gapHit + (project.impact_score ?? 7)
    return { item: project, score }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored
}
