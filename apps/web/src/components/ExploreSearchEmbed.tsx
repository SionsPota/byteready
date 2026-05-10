// 可复用的 Explore 检索嵌入组件
// 让其他模块（复盘、训练、Dashboard 等）一行调用即可展示与某主题相关的探索条目。
//
// 用法示例：
//   <ExploreSearchEmbed query="AI 大模型" />              // 文本检索
//   <ExploreSearchEmbed tag="React" />                     // tag 检索
//   <ExploreSearchEmbed query="..." types={['experiences','trends']} />
//   <ExploreSearchEmbed query="..." title="复盘相关参考" limit={3} />
//
// 后端复用 /api/explore/hub（同探索页 hub 端点），不新增 API。
// 当 query/tag 都为空时不渲染（避免误展示全集）。

import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen,
  TrendingUp,
  Rocket,
  Award,
  Star,
  ChevronRight,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { useApi } from '../hooks/useApi.ts'

type ExploreType = 'experiences' | 'trends' | 'projects' | 'questions'

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

interface HubData {
  allTags: { name: string; count: number }[]
  sections: {
    experiences: { total: number; items: ExperiencePreview[] }
    trends: { total: number; items: TrendPreview[] }
    projects: { total: number; items: ProjectPreview[] }
    questions: { total: number; items: QuestionPreview[] }
  }
}

export interface ExploreSearchEmbedProps {
  /** 文本检索关键词 */
  query?: string
  /** 标签筛选（精确匹配 tag 名） */
  tag?: string
  /** 限定展示的类型（默认 4 类全展示） */
  types?: ExploreType[]
  /** 区块顶部标题（默认 "相关探索条目"） */
  title?: string
  /** 每类最多展示几条（默认 3，最大 6） */
  limit?: number
  /** 紧凑模式：单列布局 + 更小的内边距 */
  compact?: boolean
  /** 当无任何匹配项时是否渲染外壳。默认 false（无结果时整体不显示，避免占位空块） */
  showWhenEmpty?: boolean
  /** 自定义跳转目标的 query string 透传（用于在搜索结果页保留筛选） */
  className?: string
}

const ALL_TYPES: ExploreType[] = ['experiences', 'trends', 'projects', 'questions']

const TYPE_META: Record<
  ExploreType,
  { label: string; icon: typeof BookOpen; color: string; toBase: string }
> = {
  experiences: {
    label: '面经',
    icon: BookOpen,
    color: 'text-purple-400',
    toBase: '/explore/experiences',
  },
  trends: {
    label: '趋势',
    icon: TrendingUp,
    color: 'text-emerald-400',
    toBase: '/explore/trends',
  },
  projects: {
    label: '项目',
    icon: Rocket,
    color: 'text-amber-400',
    toBase: '/explore/projects',
  },
  questions: {
    label: '题库',
    icon: Award,
    color: 'text-rose-400',
    toBase: '/explore/questions',
  },
}

export function ExploreSearchEmbed({
  query = '',
  tag = '',
  types,
  title = '相关探索条目',
  limit = 3,
  compact = false,
  showWhenEmpty = false,
  className = '',
}: ExploreSearchEmbedProps) {
  const enabledTypes = types && types.length > 0 ? types : ALL_TYPES
  const trimmedQuery = query.trim()
  const trimmedTag = tag.trim()
  const skip = !trimmedQuery && !trimmedTag

  const url = useMemo(() => {
    if (skip) return null
    const p = new URLSearchParams()
    if (trimmedQuery) p.set('q', trimmedQuery)
    if (trimmedTag) p.set('tag', trimmedTag)
    return `/api/explore/hub?${p.toString()}`
  }, [skip, trimmedQuery, trimmedTag])

  const { data, loading, error } = useApi<HubData>(url, { ttl: 30_000 })

  if (skip) {
    // 提示调用方需要传 query 或 tag。生产模式下直接 null。
    return null
  }

  const sections = data?.sections
  const counts = enabledTypes.map((t) => sections?.[t].total ?? 0)
  const totalMatched = counts.reduce((sum, n) => sum + n, 0)

  if (!loading && !error && totalMatched === 0 && !showWhenEmpty) {
    return null
  }

  const cap = Math.min(Math.max(limit, 1), 6)

  return (
    <div className={`rounded-lg border border-slate-800 bg-slate-900 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Sparkles size={14} className="text-purple-400" />
          {title}
        </h3>
        <div className="flex items-center gap-2">
          {(trimmedQuery || trimmedTag) && (
            <span className="text-xs text-slate-500">
              {trimmedQuery && <span>「{trimmedQuery}」</span>}
              {trimmedTag && (
                <span className="ml-1 px-1.5 py-0.5 rounded bg-purple-950/40 text-purple-300">
                  #{trimmedTag}
                </span>
              )}
            </span>
          )}
          {loading && <Loader2 size={12} className="text-slate-500 animate-spin" />}
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-400">加载失败：{error}</p>
      )}

      {!error && totalMatched === 0 && (
        <p className="text-sm text-slate-500 py-3 text-center">
          没有找到相关条目
        </p>
      )}

      {totalMatched > 0 && sections && (
        <div className={compact ? 'space-y-3' : 'grid grid-cols-1 md:grid-cols-2 gap-3'}>
          {enabledTypes.map((type) => {
            const sec = sections[type]
            if (sec.total === 0) return null
            const Icon = TYPE_META[type].icon
            const items = renderSectionItems(type, sec, cap)
            if (items.length === 0) return null
            return (
              <div
                key={type}
                className="rounded border border-slate-800 bg-slate-950/50 p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium flex items-center gap-1.5">
                    <Icon size={12} className={TYPE_META[type].color} />
                    {TYPE_META[type].label}
                    <span className="text-slate-500 font-normal">({sec.total})</span>
                  </span>
                  {sec.total > cap && (
                    <Link
                      to={buildSeeAllLink(type, trimmedQuery, trimmedTag)}
                      className="text-xs text-slate-500 hover:text-slate-200 flex items-center gap-0.5"
                    >
                      查看全部
                      <ChevronRight size={11} />
                    </Link>
                  )}
                </div>
                <div className="space-y-1.5">{items}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ========== 内部渲染 ==========

function renderSectionItems(
  type: ExploreType,
  section:
    | { total: number; items: ExperiencePreview[] }
    | { total: number; items: TrendPreview[] }
    | { total: number; items: ProjectPreview[] }
    | { total: number; items: QuestionPreview[] },
  cap: number,
) {
  const slice = section.items.slice(0, cap)
  switch (type) {
    case 'experiences':
      return (slice as ExperiencePreview[]).map((it) => (
        <Link
          key={it.id}
          to={`/explore/experiences/${it.id}`}
          className="block px-2 py-1.5 rounded hover:bg-slate-800/60"
        >
          <div className="flex items-center gap-1 mb-0.5 flex-wrap">
            {it.companyName && (
              <span
                className="text-[10px] px-1 py-0.5 rounded font-medium shrink-0"
                style={{
                  backgroundColor: `${it.companyColor ?? '#6366F1'}30`,
                  color: it.companyColor ?? '#6366F1',
                }}
              >
                {it.companyName}
              </span>
            )}
            {it.interviewRound && (
              <span className="text-[10px] text-slate-500 shrink-0">{it.interviewRound}</span>
            )}
          </div>
          <p className="text-xs text-slate-200 line-clamp-1">{it.title}</p>
        </Link>
      ))
    case 'trends':
      return (slice as TrendPreview[]).map((t) => (
        <Link
          key={t.id}
          to={`/explore/trends/${t.id}`}
          className="block px-2 py-1.5 rounded hover:bg-slate-800/60"
        >
          <div className="flex items-center gap-1 mb-0.5 flex-wrap">
            <span className="text-[10px] px-1 py-0.5 rounded bg-emerald-950/40 text-emerald-300 shrink-0">
              {t.category}
            </span>
          </div>
          <p className="text-xs text-slate-200 line-clamp-1">{t.title}</p>
        </Link>
      ))
    case 'projects':
      return (slice as ProjectPreview[]).map((p) => (
        <Link
          key={p.id}
          to={`/explore/projects/${p.id}`}
          className="block px-2 py-1.5 rounded hover:bg-slate-800/60"
        >
          <div className="flex items-center gap-1 mb-0.5 flex-wrap">
            {p.language && (
              <span className="text-[10px] px-1 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0">
                {p.language}
              </span>
            )}
            {p.stars != null && (
              <span className="text-[10px] text-yellow-500 flex items-center gap-0.5 shrink-0">
                <Star size={9} />
                {p.stars >= 1000 ? `${Math.round(p.stars / 100) / 10}k` : p.stars}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-200 line-clamp-1">{p.name}</p>
        </Link>
      ))
    case 'questions':
      return (slice as QuestionPreview[]).map((q) => (
        <Link
          key={q.id}
          to={`/explore/questions?q=${encodeURIComponent(q.question.slice(0, 30))}#${q.id}`}
          className="block px-2 py-1.5 rounded hover:bg-slate-800/60"
        >
          <p className="text-xs text-slate-200 line-clamp-2">{q.question}</p>
        </Link>
      ))
    default:
      return []
  }
}

function buildSeeAllLink(type: ExploreType, query: string, tag: string): string {
  const base = TYPE_META[type].toBase
  const p = new URLSearchParams()
  if (type === 'experiences') {
    if (query) p.set('search', query)
    // 这里不直接透传 tag 到列表（列表用 tagIds 而非 tag 名），仅传 search
  } else if (type === 'questions') {
    if (query) p.set('q', query)
    else if (tag) p.set('q', tag)
  }
  // trends / projects 列表暂未支持 search 参数，跳裸列表即可
  const qs = p.toString()
  return qs ? `${base}?${qs}` : base
}
