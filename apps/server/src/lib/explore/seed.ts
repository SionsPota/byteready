// 探索模块种子数据。启动时幂等填充：核心表非空则跳过。
// 数据源：apps/server/src/lib/explore/data/{interviews,trends,projects}.json
// 来自 internet_career_hub.db，共 96 面经 + 26 趋势 + 102 项目。
// 公司表手工维护：已知大厂填齐 industry/color/interview_style，长尾默认值。

import type { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createCompanyRepository } from './companies.repository.ts'
import { createTagRepository, type TagCategory } from './tags.repository.ts'
import { createExperienceRepository } from './experiences.repository.ts'
import { createIndustryTrendRepository } from './trends.repository.ts'
import {
  createLearningProjectRepository,
  type ProjectDifficulty,
  type ProjectType,
} from './projects.repository.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(HERE, 'data')

// ========== 类型 ==========

interface RawInterview {
  id: number
  target_company: string
  position: string
  interview_round: string | null
  interview_type: string | null
  content: string
  answer_key_points: string | null
  difficulty: string | null
  source_url: string | null
  tags: string | null // JSON 字符串数组
  related_trend_ids: string | null // JSON 数字数组
  related_project_ids: string | null
  create_time: string
  update_time: string
}

interface RawTrend {
  id: number
  title: string
  category: string
  description: string
  key_technologies: string | null
  market_impact: string | null
  interview_hotspots: string | null
  source_urls: string | null
  year: string | null
  tags: string | null
  related_project_ids: string | null
  create_time: string
  update_time: string
}

interface RawProject {
  id: number
  name: string
  description: string
  github_url: string
  stars: number | null
  forks: number | null
  language: string | null
  tech_stack: string | null
  difficulty_level: string | null
  category: string
  is_interview_related: number
  learning_path: string | null
  tags: string | null
  related_trend_ids: string | null
  create_time: string
  update_time: string
}

// ========== 公司画像（27 家，覆盖外部所有 target_company） ==========

interface CompanyMeta {
  id: string
  name: string
  industry: string
  color: string
  description?: string
  interviewStyle?: string
}

const COMPANY_META: CompanyMeta[] = [
  { id: 'co-bytedance', name: '字节跳动', industry: '互联网', color: '#00C9A7', description: '抖音/TikTok 母公司', interviewStyle: '技术深度 + 项目深挖' },
  { id: 'co-tencent', name: '腾讯', industry: '互联网', color: '#0052D9', description: '社交、游戏、云生态', interviewStyle: '基础知识 + 项目经验' },
  { id: 'co-alibaba', name: '阿里巴巴', industry: '电商/云计算', color: '#FF6A00', description: '淘宝/天猫/阿里云', interviewStyle: '八股文 + 场景设计' },
  { id: 'co-meituan', name: '美团', industry: '本地生活', color: '#FFD100', description: '外卖、到店、酒旅', interviewStyle: '高并发 + 系统设计' },
  { id: 'co-baidu', name: '百度', industry: 'AI/搜索', color: '#2932E1', description: '搜索引擎与 AI 大模型', interviewStyle: '工程实践 + AI 基础' },
  { id: 'co-huawei', name: '华为', industry: '通信/硬件', color: '#CF0A2C', description: '通信设备、终端、云', interviewStyle: '基础扎实 + 综合素质' },
  { id: 'co-xiaomi', name: '小米', industry: '智能硬件', color: '#FF6900', description: '手机、智能硬件、IoT', interviewStyle: '产品理解 + 工程能力' },
  { id: 'co-jd', name: '京东', industry: '电商', color: '#E4393C', description: '自营电商、物流、零售', interviewStyle: '后端深度 + 业务场景' },
  { id: 'co-netease', name: '网易', industry: '游戏/互联网', color: '#C20C0C', description: '游戏、有道、严选', interviewStyle: '基础+项目均衡' },
  { id: 'co-kuaishou', name: '快手', industry: '短视频', color: '#FE3666', description: '短视频与直播', interviewStyle: '推荐系统与大数据' },
  { id: 'co-pdd', name: '拼多多', industry: '电商', color: '#E02020', description: '社交电商、农产品上行', interviewStyle: '高并发 + 业务理解' },
  { id: 'co-didi', name: '滴滴', industry: '出行', color: '#FF7F00', description: '网约车与出行平台', interviewStyle: '调度算法 + 分布式' },
  { id: 'co-ant', name: '蚂蚁集团', industry: '金融科技', color: '#1677FF', description: '支付宝、金融服务', interviewStyle: '稳健性 + 安全' },
  { id: 'co-xiaohongshu', name: '小红书', industry: '社区/电商', color: '#FF2741', description: '生活方式社区', interviewStyle: '推荐 + 产品体验' },
  { id: 'co-360', name: '360', industry: '安全/搜索', color: '#019844', description: '安全软件与搜索', interviewStyle: '基础+安全' },
  { id: 'co-oppo', name: 'OPPO', industry: '智能硬件', color: '#22A767', description: '手机与 IoT', interviewStyle: '终端 + 综合' },
  { id: 'co-shein', name: 'SHEIN', industry: '跨境电商', color: '#000000', description: '跨境快时尚', interviewStyle: '前端 + 数据驱动' },
  { id: 'co-keep', name: 'Keep', industry: '健身/互联网', color: '#0FCDA1', description: '健身科技', interviewStyle: '产品 + 技术' },
  { id: 'co-zuoyebang', name: '作业帮', industry: '教育', color: '#36A6FF', description: '在线教育', interviewStyle: '业务 + 技术' },
  { id: 'co-yinxiang', name: '印象笔记', industry: '工具/SaaS', color: '#00A82D', description: '笔记工具', interviewStyle: '产品 + 工程' },
  { id: 'co-tongcheng', name: '同程旅行', industry: '在线旅游', color: '#0086F0', description: '旅游平台', interviewStyle: '业务系统 + 高并发' },
  { id: 'co-cmb', name: '招商银行', industry: '金融', color: '#C7000B', description: '商业银行', interviewStyle: '稳健 + 基础' },
  { id: 'co-kunlun', name: '昆仑万维', industry: 'AI/互联网', color: '#7232E2', description: 'AI 与社交娱乐', interviewStyle: 'AI 应用 + 工程' },
  { id: 'co-lixiang', name: '理想汽车', industry: '智能汽车', color: '#000000', description: '智能电动车', interviewStyle: '车载与 AI' },
  { id: 'co-tencentcloud', name: '腾讯云', industry: '云计算', color: '#0052D9', description: '腾讯云生态', interviewStyle: '云原生 + 分布式' },
  { id: 'co-nio', name: '蔚来', industry: '智能汽车', color: '#00BFB2', description: '智能电动车', interviewStyle: '车载 + 全栈' },
  { id: 'co-alicloud', name: '阿里云', industry: '云计算', color: '#FF6A00', description: '阿里云生态', interviewStyle: '云原生 + 高可用' },
]

const COMPANY_BY_NAME = new Map(COMPANY_META.map((c) => [c.name, c]))

// ========== 工具 ==========

const TAG_COLOR_BY_CATEGORY: Record<TagCategory, string[]> = {
  tech: ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#EC4899'],
  process: ['#F472B6', '#FB7185', '#E879F9', '#C084FC', '#A78BFA'],
  role: ['#10B981', '#14B8A6', '#22D3EE', '#60A5FA', '#818CF8'],
  other: ['#94A3B8', '#64748B', '#475569'],
}

const PROCESS_TAG_NAMES = new Set([
  '一面', '二面', '三面', '四面', '五面', '六面', 'HR面', '技术面', '综合面', '行为面',
])
const ROLE_TAG_NAMES = new Set([
  '后端', '前端', '全栈', '算法', 'AI', '架构师', '实习生', 'SRE', '安全', '测试',
  '后端开发', '前端开发', '全栈开发', '算法工程师',
])

const guessTagCategory = (name: string): TagCategory => {
  if (PROCESS_TAG_NAMES.has(name)) return 'process'
  if (ROLE_TAG_NAMES.has(name)) return 'role'
  // "面试热点" / "2025趋势" / "2024趋势" 等放 other
  if (/^\d{4}(趋势|热点)?$/.test(name) || name === '面试热点' || name === '面试题' || name === '面试指南' || name === '面试资料' || name === '学习路线') {
    return 'other'
  }
  return 'tech'
}

const slugifyTag = (name: string): string => {
  // 去除非字母数字字符，转小写，加 tag- 前缀
  const cleaned = name
    .toLowerCase()
    .replace(/[\s/+]/g, '-')
    .replace(/[^a-z0-9一-鿿-]/g, '')
  return cleaned ? `tag-${cleaned}` : `tag-${Math.abs(hashString(name))}`
}

const hashString = (s: string): number => {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return h
}

const safeJsonArray = <T>(s: string | null): T[] => {
  if (!s) return []
  try {
    const parsed = JSON.parse(s)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

const splitCsv = (s: string | null): string[] => {
  if (!s) return []
  return s
    .split(/[,，、]/)
    .map((x) => x.trim())
    .filter(Boolean)
}

// 难度文本 → 1-5 整数
const mapInterviewDifficulty = (s: string | null): number | null => {
  if (!s) return null
  if (s.includes('简单')) return 1
  if (s.includes('中等')) return 3
  if (s.includes('困难')) return 5
  return null
}

// 项目难度文本 → enum
const mapProjectDifficulty = (s: string | null): ProjectDifficulty | null => {
  if (!s) return null
  if (s.includes('初级') && !s.includes('中')) return 'beginner'
  if (s === '初级' || s === '初中级') return 'beginner'
  if (s === '高级' || s === '中高级' || s === '初中高级') return 'advanced'
  if (s === '中级' || s === '全级别') return 'intermediate'
  return null
}

// 趋势 category → role
const inferRoleFromTrendCategory = (category: string): string | null => {
  const c = category.toLowerCase()
  if (
    c.includes('ai') ||
    c.includes('agent') ||
    c.includes('rag') ||
    c.includes('mcp') ||
    c.includes('大模型') ||
    c.includes('向量') ||
    c.includes('国产算力') ||
    c.includes('具身') ||
    c.includes('多agent') ||
    c.includes('国产大模型') ||
    c.includes('低代码ai')
  ) {
    return 'ai'
  }
  if (c.includes('云原生')) return 'devops'
  if (c.includes('前端')) return 'frontend'
  if (c.includes('推荐系统') || c.includes('大数据')) return 'data'
  if (c.includes('低代码') || c.includes('web3')) return 'fullstack'
  if (c.includes('边缘计算')) return 'devops'
  return null
}

// 项目 category → role（用 / 前的部分）
const inferRoleFromProjectCategory = (category: string): string | null => {
  const head = category.split('/')[0] ?? ''
  if (head.includes('AI')) return 'ai'
  if (head === '后端') return 'backend'
  if (head === '前端') return 'frontend'
  if (head === '全栈') return 'fullstack'
  if (head === '云原生') return 'devops'
  if (head === '大数据') return 'data'
  if (head === '算法') return 'ai'
  if (head === '安全') return 'devops'
  if (head === '综合') return null
  return null
}

// 面经 position → role（粗推断；当前 seed 未落表，保留供后续路由侧使用）
export const inferRoleFromPosition = (position: string): string | null => {
  if (/前端|frontend/i.test(position)) return 'frontend'
  if (/AI|大模型|算法|machine\s?learning|nlp|cv/i.test(position)) return 'ai'
  if (/数据|data/i.test(position)) return 'data'
  if (/SRE|运维|infra|云/i.test(position)) return 'devops'
  if (/安全|security/i.test(position)) return 'devops'
  if (/产品|运营/i.test(position)) return 'product'
  if (/后端|backend|java|go|node/i.test(position)) return 'backend'
  if (/全栈/i.test(position)) return 'fullstack'
  return null
}

// stars → impact_score 启发式（用于外部 GitHub 项目）
const computeImpactScore = (stars: number | null | undefined): number => {
  if (!stars) return 6
  if (stars >= 50000) return 10
  if (stars >= 20000) return 9
  if (stars >= 5000) return 8
  if (stars >= 1000) return 7
  return 6
}

// stars → project_type 启发式：高星标多为深度学习项目，小项目可能是 quick_win
const computeProjectType = (
  stars: number | null | undefined,
  category: string,
): ProjectType | null => {
  if (category.includes('面试资料') || category.includes('学习')) return 'deep_dive'
  if (!stars) return null
  if (stars >= 20000) return 'deep_dive'
  if (stars >= 1000) return 'weekend_build'
  return 'quick_win'
}

// ========== Seed 入口 ==========

const readJson = <T>(name: string): T[] => {
  const path = join(DATA_DIR, name)
  const raw = readFileSync(path, 'utf-8')
  return JSON.parse(raw) as T[]
}

export const seedExploreIfEmpty = (
  db: DatabaseSync,
): { seeded: boolean; counts: Record<string, number> } => {
  const companyRepo = createCompanyRepository(db)
  const tagRepo = createTagRepository(db)
  const expRepo = createExperienceRepository(db)
  const trendRepo = createIndustryTrendRepository(db)
  const projectRepo = createLearningProjectRepository(db)

  if (companyRepo.countAll() > 0 || expRepo.countAll() > 0 || trendRepo.countAll() > 0) {
    return {
      seeded: false,
      counts: {
        companies: companyRepo.countAll(),
        tags: tagRepo.countAll(),
        experiences: expRepo.countAll(),
        trends: trendRepo.countAll(),
        projects: projectRepo.countAll(),
      },
    }
  }

  const interviews = readJson<RawInterview>('interviews.json')
  const trends = readJson<RawTrend>('trends.json')
  const projects = readJson<RawProject>('projects.json')

  const now = Date.now()

  // 1. 公司
  for (const c of COMPANY_META) {
    db.prepare(
      'INSERT INTO company_profiles (id, name, description, interview_style, positions, tags, logo, industry, color, updated_at) VALUES (?, ?, ?, ?, NULL, NULL, NULL, ?, ?, ?)',
    ).run(c.id, c.name, c.description ?? null, c.interviewStyle ?? null, c.industry, c.color, now)
  }

  // 2. 标签：从所有 interview tags 收集去重
  const tagSlugByName = new Map<string, string>()
  const tagsBatch = new Set<string>()
  for (const iv of interviews) {
    for (const t of safeJsonArray<string>(iv.tags)) {
      tagsBatch.add(t)
    }
  }
  // 也补几个 process tag（外部 interview_round/type 字段我们也想存为 tag 方便筛选）
  for (const iv of interviews) {
    if (iv.interview_round) tagsBatch.add(iv.interview_round)
    if (iv.interview_type) tagsBatch.add(iv.interview_type)
  }
  // 去重 slug：同 slug 加序号
  const usedSlugs = new Set<string>()
  for (const name of tagsBatch) {
    let slug = slugifyTag(name)
    let suffix = 1
    while (usedSlugs.has(slug)) {
      suffix += 1
      slug = `${slugifyTag(name)}-${suffix}`
    }
    usedSlugs.add(slug)
    tagSlugByName.set(name, slug)

    const category = guessTagCategory(name)
    const palette = TAG_COLOR_BY_CATEGORY[category]
    const color = palette[Math.abs(hashString(name)) % palette.length] ?? '#94A3B8'
    db.prepare(
      'INSERT OR IGNORE INTO explore_tags (id, name, color, category, created_at) VALUES (?, ?, ?, ?, ?)',
    ).run(slug, name, color, category, now)
  }

  // 3. 趋势（先建，因为 interview/project 会引用）
  // ID 映射：外部 INT id → 'tr-{n}'
  const trendIdByExternal = new Map<number, string>()
  for (const t of trends) {
    const id = `tr-${t.id}`
    trendIdByExternal.set(t.id, id)
    const role = inferRoleFromTrendCategory(t.category)
    const skills = splitCsv(t.key_technologies)
    const sourceUrls = splitCsv(t.source_urls)
    const tagsArr = safeJsonArray<string>(t.tags)
    db.prepare(
      `INSERT INTO industry_trends (id, category, title, description, key_points, learning_advice, source_url, source_title, related_skills, related_role, relevance_base, related_project_ids, market_impact, interview_hotspots, year, tags, created_at)
       VALUES (?, ?, ?, ?, NULL, NULL, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      t.category,
      t.title,
      t.description,
      sourceUrls.length > 0 ? sourceUrls.join(', ') : null,
      skills.length > 0 ? JSON.stringify(skills) : null,
      role,
      // 高频出现 + 有 related_project_ids 的趋势相关度高
      9,
      null, // related_project_ids 在第 4 步项目插完后回填
      t.market_impact,
      t.interview_hotspots,
      t.year,
      tagsArr.length > 0 ? JSON.stringify(tagsArr) : null,
      now,
    )
  }

  // 4. 项目
  const projectIdByExternal = new Map<number, string>()
  for (const p of projects) {
    const id = `pj-${p.id}`
    projectIdByExternal.set(p.id, id)
    const role = inferRoleFromProjectCategory(p.category)
    const techStack = splitCsv(p.tech_stack)
    const tagsArr = safeJsonArray<string>(p.tags)
    const relatedTrendIds = safeJsonArray<number>(p.related_trend_ids)
      .map((n) => trendIdByExternal.get(n))
      .filter((x): x is string => Boolean(x))
    const projectType = computeProjectType(p.stars, p.category)
    const difficulty = mapProjectDifficulty(p.difficulty_level)
    const impactScore = computeImpactScore(p.stars)

    db.prepare(
      `INSERT INTO learning_projects (id, name, project_type, difficulty, time_estimate, tech_stack, gap_addressed, description, core_features, tech_highlights, implementation_steps, resume_template, impact_score, source_url, related_role, related_skills, related_trend_ids, github_url, stars, forks, language, category, learning_path, is_interview_related, tags, created_at)
       VALUES (?, ?, ?, ?, NULL, ?, NULL, ?, NULL, NULL, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      p.name,
      projectType,
      difficulty,
      techStack.length > 0 ? JSON.stringify(techStack) : null,
      p.description,
      impactScore,
      p.github_url, // source_url 同步指向 GitHub
      role,
      techStack.length > 0 ? JSON.stringify(techStack) : null, // related_skills = tech_stack
      relatedTrendIds.length > 0 ? JSON.stringify(relatedTrendIds) : null,
      p.github_url,
      p.stars,
      p.forks,
      p.language,
      p.category,
      p.learning_path,
      p.is_interview_related,
      tagsArr.length > 0 ? JSON.stringify(tagsArr) : null,
      now,
    )
  }

  // 5. 回填 trends.related_project_ids（已知项目 ID 转换后的 slug）
  for (const t of trends) {
    const externalIds = safeJsonArray<number>(t.related_project_ids)
    const slugs = externalIds
      .map((n) => projectIdByExternal.get(n))
      .filter((x): x is string => Boolean(x))
    if (slugs.length > 0) {
      const trendId = trendIdByExternal.get(t.id)
      if (trendId) {
        trendRepo.updateRelatedProjects(trendId, slugs)
      }
    }
  }

  // 6. 面经
  for (const iv of interviews) {
    const id = `exp-${iv.id}`
    const company = COMPANY_BY_NAME.get(iv.target_company)
    const tagNames = safeJsonArray<string>(iv.tags)
    const tagIds: string[] = []
    for (const tn of tagNames) {
      const slug = tagSlugByName.get(tn)
      if (slug) tagIds.push(slug)
    }
    // 把 round/type 也作为 tag 关联（前端可基于此筛选）
    if (iv.interview_round) {
      const slug = tagSlugByName.get(iv.interview_round)
      if (slug) tagIds.push(slug)
    }
    if (iv.interview_type) {
      const slug = tagSlugByName.get(iv.interview_type)
      if (slug) tagIds.push(slug)
    }
    const relatedTrendIds = safeJsonArray<number>(iv.related_trend_ids)
      .map((n) => trendIdByExternal.get(n))
      .filter((x): x is string => Boolean(x))
    const relatedProjectIds = safeJsonArray<number>(iv.related_project_ids)
      .map((n) => projectIdByExternal.get(n))
      .filter((x): x is string => Boolean(x))

    db.prepare(
      `INSERT INTO experiences (id, company_id, title, company, position, content, source, source_url, difficulty, result, interview_date, view_count, interview_round, interview_type, answer_key_points, related_trend_ids, related_project_ids, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, NULL, NULL, 0, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      company?.id ?? null,
      // title 从 content 头一段截
      iv.content.length > 80 ? iv.content.slice(0, 80) + '...' : iv.content,
      iv.target_company,
      iv.position,
      iv.content,
      iv.source_url,
      mapInterviewDifficulty(iv.difficulty),
      iv.interview_round,
      iv.interview_type,
      iv.answer_key_points,
      relatedTrendIds.length > 0 ? JSON.stringify(relatedTrendIds) : null,
      relatedProjectIds.length > 0 ? JSON.stringify(relatedProjectIds) : null,
      now,
    )
    if (tagIds.length > 0) {
      const stmt = db.prepare(
        'INSERT OR IGNORE INTO experience_tags (experience_id, tag_id) VALUES (?, ?)',
      )
      for (const tagId of tagIds) {
        stmt.run(id, tagId)
      }
    }
  }

  // role 用于 inferRoleFromPosition；只用作辅助但本批未直接落表，故保留 helper

  return {
    seeded: true,
    counts: {
      companies: COMPANY_META.length,
      tags: tagSlugByName.size,
      experiences: interviews.length,
      trends: trends.length,
      projects: projects.length,
    },
  }
}
