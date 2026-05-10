import { describe, it, expect } from 'vitest'
import {
  detectRole,
  identifyGaps,
  recommendTrends,
  recommendProjects,
  type TrendForRecommend,
  type ProjectForRecommend,
} from './recommender.ts'

describe('detectRole', () => {
  it('纯前端 skills → frontend', () => {
    expect(detectRole(['React', 'TypeScript', 'CSS', '性能优化'])).toBe('frontend')
  })

  it('纯后端 skills → backend', () => {
    expect(detectRole(['Java', 'Redis', 'Kafka', '分布式系统'])).toBe('backend')
  })

  it('AI 技能优先 → ai', () => {
    expect(detectRole(['Python', '深度学习', 'RAG', '向量数据库'])).toBe('ai')
  })

  it('简历里直接写"前端工程师" → frontend', () => {
    expect(detectRole(['前端工程师'])).toBe('frontend')
  })

  it('空 skills → fullstack', () => {
    expect(detectRole([])).toBe('fullstack')
  })

  it('完全不沾边的 skills → fullstack 兜底', () => {
    expect(detectRole(['烹饪', '太极'])).toBe('fullstack')
  })
})

describe('identifyGaps', () => {
  it('frontend 已有 React 仍缺微前端等', () => {
    const gaps = identifyGaps(['React', 'TypeScript'], 'frontend')
    expect(gaps.some((g) => g.skill === '微前端')).toBe(true)
    expect(gaps.every((g) => g.category === 'missing')).toBe(true)
  })

  it('backend 全覆盖时 gaps 为空', () => {
    const skills = ['高并发', 'Kubernetes', '可观测性', 'CI/CD', '安全加固']
    const gaps = identifyGaps(skills, 'backend')
    expect(gaps.length).toBe(0)
  })
})

describe('recommendTrends', () => {
  const trends: TrendForRecommend[] = [
    { id: 'a', related_role: 'frontend', related_skills: ['React'], relevance_base: 7 },
    { id: 'b', related_role: 'backend', related_skills: ['Kubernetes'], relevance_base: 8 },
    { id: 'c', related_role: 'frontend', related_skills: ['Vue'], relevance_base: 6 },
  ]

  it('frontend 用户优先看到 frontend 趋势', () => {
    const result = recommendTrends(['React'], 'frontend', trends)
    expect(result[0]?.item.id).toBe('a') // 角色 + 技能双命中
    // backend 趋势应排到最后
    expect(result[result.length - 1]?.item.id).toBe('b')
  })

  it('无简历时按 relevance_base 倒序', () => {
    const result = recommendTrends([], null, trends)
    expect(result[0]?.item.id).toBe('b') // base 8 最高
  })
})

describe('recommendProjects', () => {
  const projects: ProjectForRecommend[] = [
    {
      id: 'p1',
      related_role: 'frontend',
      related_skills: ['React'],
      gap_addressed: '微前端',
      impact_score: 8,
      project_type: 'deep_dive',
      difficulty: 'advanced',
    },
    {
      id: 'p2',
      related_role: 'backend',
      related_skills: ['Go'],
      gap_addressed: '高并发',
      impact_score: 9,
      project_type: 'weekend_build',
      difficulty: 'intermediate',
    },
  ]

  it('frontend gap 命中时项目得分提升', () => {
    const result = recommendProjects(
      ['React'],
      'frontend',
      [{ skill: '微前端', category: 'missing', importance: 8 }],
      projects,
    )
    expect(result[0]?.item.id).toBe('p1')
  })
})
