import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  X,
  BookOpen,
  TrendingUp,
  Rocket,
  Award,
  Eye,
  Star,
  ChevronRight,
} from 'lucide-react'
import { useApi } from '../hooks/useApi'

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

interface HubData {
  allTags: TagCount[]
  sections: {
    experiences: { total: number; items: ExperiencePreview[] }
    trends: { total: number; items: TrendPreview[] }
    projects: { total: number; items: ProjectPreview[] }
    questions: { total: number; items: QuestionPreview[] }
  }
}

const useDebounced = <T, >(value: T, delay: number): T => {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export function ExplorePage() {
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState<string | null>(null)
  const debouncedQuery = useDebounced(query, 300)

  const url = useMemo(() => {
    const p = new URLSearchParams()
    if (debouncedQuery.trim()) p.set('q', debouncedQuery.trim())
    if (tag) p.set('tag', tag)
    const qs = p.toString()
    return `/api/explore/hub${qs ? `?${qs}` : ''}`
  }, [debouncedQuery, tag])

  const { data, loading } = useApi<HubData>(url, { ttl: 15_000 })

  const inputRef = useRef<HTMLInputElement>(null)

  const allTags = data?.allTags ?? []
  const sections = data?.sections
  const hasFilter = Boolean(tag) || debouncedQuery.trim().length > 0
  const totalAll =
    (sections?.experiences.total ?? 0) +
    (sections?.trends.total ?? 0) +
    (sections?.projects.total ?? 0) +
    (sections?.questions.total ?? 0)

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">探索</h1>
        <p className="text-sm text-slate-500 mt-1">
          面试情报站 · 共 {totalAll} 条 · 跨 4 类条目用同一标签互引
        </p>
      </div>

      {/* 搜索框 */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索面经 / 行业趋势 / 学习项目 / 题库..."
          className="input-field w-full pl-11 pr-10 py-3.5 text-sm"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('')
              inputRef.current?.focus()
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* 全局 tag 条 */}
      {allTags.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-500 font-medium">高频标签（点击在 4 个模块中联动筛选）</span>
            {tag && (
              <button
                onClick={() => setTag(null)}
                className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-1 transition-colors"
              >
                <X size={11} />
                清除
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTag(null)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                !tag
                  ? 'bg-slate-700 text-slate-100 border-slate-600'
                  : 'bg-transparent text-slate-500 border-slate-800 hover:text-slate-300 hover:border-slate-600'
              }`}
            >
              全部
            </button>
            {allTags.map((t) => {
              const active = t.name === tag
              return (
                <button
                  key={t.name}
                  onClick={() => setTag(active ? null : t.name)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    active
                      ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-900/20'
                      : 'bg-transparent text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-600'
                  }`}
                >
                  {t.name}
                  <span className={`ml-1.5 text-[10px] ${active ? 'opacity-80' : 'text-slate-600'}`}>
                    {t.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {loading && !sections ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-8 h-8 border-2 border-slate-700 border-t-purple-500 rounded-full animate-spin" />
        </div>
      ) : !sections || (totalAll === 0 && hasFilter) ? (
        <div className="text-center py-12 card border-dashed">
          <Search size={24} className="mx-auto text-slate-600 mb-3" />
          <p className="text-slate-500">没有匹配的条目</p>
          <button
            onClick={() => {
              setQuery('')
              setTag(null)
            }}
            className="text-sm text-purple-400 hover:text-purple-300 mt-2 transition-colors"
          >
            清除筛选条件
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ExperiencesSection
            data={sections.experiences}
            tag={tag}
            query={debouncedQuery}
          />
          <TrendsSection data={sections.trends} tag={tag} query={debouncedQuery} />
          <ProjectsSection data={sections.projects} tag={tag} query={debouncedQuery} />
          <QuestionsSection
            data={sections.questions}
            tag={tag}
            query={debouncedQuery}
          />
        </div>
      )}
    </div>
  )
}

// ========== 子模块 sections ==========

interface SectionShell {
  title: string
  total: number
  to: string
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  accentColor: string
  empty?: string
  facetLabel?: string
  facets?: { name: string; count: number; isActive: boolean; onClick: () => void }[]
  children: React.ReactNode
}

function SectionFrame({
  title,
  total,
  to,
  icon,
  iconBg,
  iconColor,
  accentColor,
  empty,
  facetLabel,
  facets,
  children,
}: SectionShell) {
  return (
    <div className="card p-5 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center ring-1 ring-white/5`}>
            <span className={iconColor}>{icon}</span>
          </div>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-slate-100">{title}</h2>
            <span className="text-xs text-slate-500">({total})</span>
          </div>
        </div>
        <Link
          to={to}
          className={`text-xs flex items-center gap-0.5 transition-colors ${accentColor}`}
        >
          查看全部
          <ChevronRight size={12} />
        </Link>
      </div>

      {facets && facets.length > 0 && (
        <div className="mb-3">
          {facetLabel && <p className="text-[10px] text-slate-600 mb-1.5">{facetLabel}</p>}
          <div className="flex flex-wrap gap-1.5">
            {facets.map((f) => (
              <button
                key={f.name}
                onClick={f.onClick}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  f.isActive
                    ? 'bg-slate-700 text-slate-100'
                    : 'bg-slate-950/60 text-slate-500 hover:text-slate-300'
                }`}
              >
                {f.name}
                <span className="ml-1 text-[10px] text-slate-600">{f.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {total === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm text-slate-500">{empty ?? '暂无条目'}</p>
        </div>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </div>
  )
}

function uniqueCounts<T>(items: T[], pick: (it: T) => string | null | undefined): { name: string; count: number }[] {
  const m = new Map<string, number>()
  for (const it of items) {
    const v = pick(it)
    if (!v) continue
    m.set(v, (m.get(v) ?? 0) + 1)
  }
  return [...m].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
}

function ExperiencesSection({
  data,
  tag,
  query,
}: {
  data: { total: number; items: ExperiencePreview[] }
  tag: string | null
  query: string
}) {
  const [round, setRound] = useState<string | null>(null)
  const counts = useMemo(() => uniqueCounts(data.items, (it) => it.interviewRound), [data.items])
  const filtered = round ? data.items.filter((it) => it.interviewRound === round) : data.items
  const queryParam = useMemo(() => {
    const p = new URLSearchParams()
    if (query.trim()) p.set('search', query.trim())
    return p.toString() ? `?${p.toString()}` : ''
  }, [query])

  return (
    <SectionFrame
      title="面经"
      total={data.total}
      to={`/explore/experiences${queryParam}`}
      icon={<BookOpen size={18} />}
      iconBg="bg-purple-500/10"
      iconColor="text-purple-400"
      accentColor="text-purple-400 hover:text-purple-300"
      empty={tag ? `没有"${tag}"标签的面经` : '暂无面经'}
      facetLabel={counts.length > 0 ? '按面试轮次' : undefined}
      facets={
        counts.length > 1
          ? [
              {
                name: '全部',
                count: data.items.length,
                isActive: !round,
                onClick: () => setRound(null),
              },
              ...counts.map((c) => ({
                name: c.name,
                count: c.count,
                isActive: c.name === round,
                onClick: () => setRound(c.name === round ? null : c.name),
              })),
            ]
          : undefined
      }
    >
      {filtered.map((it) => (
        <Link
          key={it.id}
          to={`/explore/experiences/${it.id}`}
          className="block p-3 rounded-lg border border-slate-800 hover:border-purple-700/40 hover:bg-slate-800/30 transition-all group"
        >
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            {it.companyName && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-md font-medium"
                style={{
                  backgroundColor: `${it.companyColor ?? '#6366F1'}20`,
                  color: it.companyColor ?? '#818cf8',
                }}
              >
                {it.companyName}
              </span>
            )}
            {it.interviewRound && (
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-950/50 text-purple-300 border border-purple-900/30">
                {it.interviewRound}
              </span>
            )}
            {it.position && <span className="text-[10px] text-slate-500">{it.position}</span>}
            {it.difficulty != null && (
              <span className="text-[10px] text-yellow-500 ml-auto">
                {'★'.repeat(it.difficulty)}
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-slate-200 line-clamp-1 group-hover:text-purple-200 transition-colors">{it.title}</p>
          <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
            {it.contentPreview}
          </p>
        </Link>
      ))}
    </SectionFrame>
  )
}

function TrendsSection({
  data,
  tag,
  query: _query,
}: {
  data: { total: number; items: TrendPreview[] }
  tag: string | null
  query: string
}) {
  const [category, setCategory] = useState<string | null>(null)
  const counts = useMemo(() => uniqueCounts(data.items, (it) => it.category), [data.items])
  const filtered = category ? data.items.filter((it) => it.category === category) : data.items

  return (
    <SectionFrame
      title="行业趋势"
      total={data.total}
      to="/explore/trends"
      icon={<TrendingUp size={18} />}
      iconBg="bg-emerald-500/10"
      iconColor="text-emerald-400"
      accentColor="text-emerald-400 hover:text-emerald-300"
      empty={tag ? `没有"${tag}"标签的趋势` : '暂无趋势'}
      facetLabel={counts.length > 1 ? '按领域' : undefined}
      facets={
        counts.length > 1
          ? [
              {
                name: '全部',
                count: data.items.length,
                isActive: !category,
                onClick: () => setCategory(null),
              },
              ...counts.map((c) => ({
                name: c.name,
                count: c.count,
                isActive: c.name === category,
                onClick: () => setCategory(c.name === category ? null : c.name),
              })),
            ]
          : undefined
      }
    >
      {filtered.map((t) => (
        <Link
          key={t.id}
          to={`/explore/trends/${t.id}`}
          className="block p-3 rounded-lg border border-slate-800 hover:border-emerald-700/40 hover:bg-slate-800/30 transition-all group"
        >
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-950/50 text-emerald-300 border border-emerald-900/30">
              {t.category}
            </span>
            {t.relatedRole && (
              <span className="text-[10px] text-slate-500">面向 {t.relatedRole}</span>
            )}
            <span className="text-[10px] text-emerald-400 ml-auto font-bold">
              {t.relevanceBase}/10+
            </span>
          </div>
          <p className="text-sm font-medium text-slate-200 line-clamp-1 group-hover:text-emerald-200 transition-colors">{t.title}</p>
          <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">{t.description}</p>
        </Link>
      ))}
    </SectionFrame>
  )
}

function ProjectsSection({
  data,
  tag,
  query: _query,
}: {
  data: { total: number; items: ProjectPreview[] }
  tag: string | null
  query: string
}) {
  const [language, setLanguage] = useState<string | null>(null)
  const counts = useMemo(() => uniqueCounts(data.items, (it) => it.language), [data.items])
  const filtered = language ? data.items.filter((it) => it.language === language) : data.items

  return (
    <SectionFrame
      title="学习项目"
      total={data.total}
      to="/explore/projects"
      icon={<Rocket size={18} />}
      iconBg="bg-amber-500/10"
      iconColor="text-amber-400"
      accentColor="text-amber-400 hover:text-amber-300"
      empty={tag ? `没有"${tag}"标签的项目` : '暂无项目'}
      facetLabel={counts.length > 1 ? '按语言' : undefined}
      facets={
        counts.length > 1
          ? [
              {
                name: '全部',
                count: data.items.length,
                isActive: !language,
                onClick: () => setLanguage(null),
              },
              ...counts.map((c) => ({
                name: c.name,
                count: c.count,
                isActive: c.name === language,
                onClick: () => setLanguage(c.name === language ? null : c.name),
              })),
            ]
          : undefined
      }
    >
      {filtered.map((p) => (
        <Link
          key={p.id}
          to={`/explore/projects/${p.id}`}
          className="block p-3 rounded-lg border border-slate-800 hover:border-amber-700/40 hover:bg-slate-800/30 transition-all group"
        >
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            {p.language && (
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                {p.language}
              </span>
            )}
            {p.category && <span className="text-[10px] text-slate-500">{p.category}</span>}
            {p.stars != null && (
              <span className="text-[10px] text-yellow-500 flex items-center gap-0.5">
                <Star size={9} />
                {p.stars >= 1000 ? `${Math.round(p.stars / 100) / 10}k` : p.stars}
              </span>
            )}
            <span className="text-[10px] text-amber-400 ml-auto font-bold">
              {p.impactScore}/10
            </span>
          </div>
          <p className="text-sm font-medium text-slate-200 line-clamp-1 group-hover:text-amber-200 transition-colors">{p.name}</p>
          <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">{p.description}</p>
        </Link>
      ))}
    </SectionFrame>
  )
}

function QuestionsSection({
  data,
  tag,
  query,
}: {
  data: { total: number; items: QuestionPreview[] }
  tag: string | null
  query: string
}) {
  const queryParam = useMemo(() => {
    const p = new URLSearchParams()
    if (query.trim()) p.set('q', query.trim())
    else if (tag) p.set('q', tag)
    return p.toString() ? `?${p.toString()}` : ''
  }, [query, tag])

  return (
    <SectionFrame
      title="题库搜索"
      total={data.total}
      to={`/explore/questions${queryParam}`}
      icon={<Award size={18} />}
      iconBg="bg-rose-500/10"
      iconColor="text-rose-400"
      accentColor="text-rose-400 hover:text-rose-300"
      empty={query || tag ? '题库中没有匹配的题目' : '题库未导入'}
    >
      {data.items.map((q) => (
        <Link
          key={q.id}
          to={`/explore/questions${queryParam}#${q.id}`}
          className="block p-3 rounded-lg border border-slate-800 hover:border-rose-700/40 hover:bg-slate-800/30 transition-all group"
        >
          <p className="text-sm font-medium text-slate-200 line-clamp-2 group-hover:text-rose-200 transition-colors">{q.question}</p>
          <p className="text-xs text-slate-500 line-clamp-2 mt-1.5 flex items-start gap-1.5 leading-relaxed">
            <Eye size={10} className="mt-0.5 text-slate-600 shrink-0" />
            {q.answerPreview}
          </p>
        </Link>
      ))}
    </SectionFrame>
  )
}
