import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, Filter, X, Eye, Star, ChevronLeft, ChevronRight, Building2 } from 'lucide-react'
import { useApi } from '../hooks/useApi.ts'

interface Tag {
  id: string
  name: string
  color: string | null
  category: 'tech' | 'process' | 'role' | 'other'
}

interface Company {
  id: string
  name: string
  description: string | null
  interviewStyle: string | null
  industry: string | null
  color: string | null
  experienceCount: number
}

interface ExperienceItem {
  id: string
  companyId: string | null
  companyName: string | null
  companyColor: string | null
  title: string
  position: string | null
  contentPreview: string
  difficulty: number | null
  result: 'passed' | 'failed' | 'pending' | 'ghosted' | null
  viewCount: number
  interviewRound: string | null
  interviewType: string | null
  tags: Tag[]
}

interface ListData {
  total: number
  page: number
  limit: number
  items: ExperienceItem[]
}

const RESULT_LABELS: Record<NonNullable<ExperienceItem['result']>, { label: string; color: string }> = {
  passed: { label: '通过', color: '#22C55E' },
  failed: { label: '未通过', color: '#EF4444' },
  pending: { label: '等待中', color: '#EAB308' },
  ghosted: { label: '无回应', color: '#6B7280' },
}

const PAGE_SIZE = 10

export function ExperiencesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [companyId, setCompanyId] = useState<string>(searchParams.get('companyId') ?? '')
  const [result, setResult] = useState<string>(searchParams.get('result') ?? '')
  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    const t = searchParams.get('tagIds')
    return t ? t.split(',').filter(Boolean) : []
  })
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(parseInt(searchParams.get('page') ?? '1', 10) || 1)

  const queryUrl = useMemo(() => {
    const params = new URLSearchParams()
    if (search.trim()) params.set('search', search.trim())
    if (companyId) params.set('companyId', companyId)
    if (result) params.set('result', result)
    if (selectedTags.length > 0) params.set('tagIds', selectedTags.join(','))
    params.set('page', String(page))
    params.set('limit', String(PAGE_SIZE))
    return `/api/explore/experiences?${params.toString()}`
  }, [search, companyId, result, selectedTags, page])

  const { data, loading } = useApi<ListData>(queryUrl, { ttl: 15_000 })
  const { data: companies } = useApi<Company[]>('/api/explore/companies', { ttl: 60_000 })
  const { data: tags } = useApi<Tag[]>('/api/explore/tags', { ttl: 60_000 })

  const total = data?.total ?? 0
  const items = data?.items ?? []
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const sortedCompanies = useMemo(() => {
    return [...(companies ?? [])].sort((a, b) => b.experienceCount - a.experienceCount)
  }, [companies])

  const activeCompany = useMemo(
    () => sortedCompanies.find((c) => c.id === companyId),
    [sortedCompanies, companyId],
  )

  const syncUrl = (next: {
    search?: string
    companyId?: string
    result?: string
    tags?: string[]
    page?: number
  }) => {
    const params = new URLSearchParams()
    const s = next.search ?? search
    const cid = next.companyId ?? companyId
    const r = next.result ?? result
    const t = next.tags ?? selectedTags
    const p = next.page ?? page
    if (s.trim()) params.set('search', s.trim())
    if (cid) params.set('companyId', cid)
    if (r) params.set('result', r)
    if (t.length > 0) params.set('tagIds', t.join(','))
    if (p > 1) params.set('page', String(p))
    setSearchParams(params)
  }

  const selectCompany = (id: string) => {
    const next = id === companyId ? '' : id
    setCompanyId(next)
    setPage(1)
    syncUrl({ companyId: next, page: 1 })
  }

  const clearFilters = () => {
    setSearch('')
    setCompanyId('')
    setResult('')
    setSelectedTags([])
    setPage(1)
    setSearchParams({})
  }

  const toggleTag = (id: string) => {
    setPage(1)
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    )
  }

  const hasFilters = search || companyId || result || selectedTags.length > 0

  const tagsByCategory = useMemo(() => {
    const groups: Record<string, Tag[]> = { tech: [], process: [], role: [], other: [] }
    for (const t of tags ?? []) {
      groups[t.category]?.push(t)
    }
    return groups
  }, [tags])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">面经浏览</h1>
          <p className="text-sm text-slate-500 mt-1">真实面试经历，按公司分类筛选</p>
        </div>
        <Link
          to="/explore"
          className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          返回探索
        </Link>
      </div>

      {/* 公司筛选条 */}
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-slate-500 flex items-center gap-1.5">
            <Building2 size={12} />
            按公司筛选
          </span>
          {activeCompany && (
            <button
              onClick={() => selectCompany('')}
              className="text-xs text-slate-500 hover:text-slate-200 flex items-center gap-1"
            >
              <X size={11} />
              清除
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => selectCompany('')}
            className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
              !companyId
                ? 'bg-slate-800 text-slate-100 border border-slate-700'
                : 'bg-slate-950 text-slate-500 border border-slate-800 hover:text-slate-300'
            }`}
          >
            全部 ({total > 0 || !hasFilters ? sortedCompanies.reduce((sum, c) => sum + c.experienceCount, 0) : 0})
          </button>
          {sortedCompanies.map((c) => {
            const active = c.id === companyId
            const color = c.color ?? '#6366F1'
            return (
              <button
                key={c.id}
                onClick={() => selectCompany(c.id)}
                title={c.interviewStyle ?? c.industry ?? c.name}
                className={`px-2.5 py-1 rounded-md text-xs transition-all border flex items-center gap-1.5 ${
                  active ? 'border-transparent' : 'border-slate-800 hover:border-slate-700'
                }`}
                style={{
                  backgroundColor: active ? `${color}25` : 'transparent',
                  color: active ? color : '#94A3B8',
                  borderColor: active ? `${color}80` : undefined,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full inline-block"
                  style={{ backgroundColor: color }}
                />
                {c.name}
                <span className={`text-[10px] ${active ? 'opacity-80' : 'text-slate-600'}`}>
                  {c.experienceCount}
                </span>
              </button>
            )
          })}
        </div>
        {activeCompany && (
          <div className="mt-3 pt-3 border-t border-slate-800 text-xs flex items-start gap-3">
            <div
              className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold shrink-0"
              style={{
                backgroundColor: `${activeCompany.color ?? '#6366F1'}20`,
                color: activeCompany.color ?? '#6366F1',
              }}
            >
              {activeCompany.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-200">{activeCompany.name}</span>
                {activeCompany.industry && (
                  <span className="text-slate-500">{activeCompany.industry}</span>
                )}
              </div>
              {activeCompany.interviewStyle && (
                <p
                  className="italic mt-0.5"
                  style={{ color: activeCompany.color ?? '#A855F7' }}
                >
                  "{activeCompany.interviewStyle}"
                </p>
              )}
              {activeCompany.description && (
                <p className="text-slate-500 mt-0.5 line-clamp-1">{activeCompany.description}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 搜索栏 */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            onKeyDown={(e) => e.key === 'Enter' && syncUrl({ search, page: 1 })}
            placeholder="搜索标题、内容、岗位..."
            className="w-full pl-10 pr-3 py-2 rounded-md bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-slate-600"
          />
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`px-3 py-2 rounded-md border text-sm flex items-center gap-1.5 transition-colors ${
            showFilters
              ? 'border-purple-700 bg-purple-950/30 text-purple-200'
              : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Filter size={14} />
          标签 / 结果
        </button>
      </div>

      {showFilters && (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">标签 / 结果筛选</span>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-1"
              >
                <X size={12} />
                清除全部
              </button>
            )}
          </div>
          <div className="mb-3">
            <label className="text-xs text-slate-500 mb-1 block">面试结果</label>
            <select
              value={result}
              onChange={(e) => {
                setResult(e.target.value)
                setPage(1)
              }}
              className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-slate-600"
            >
              <option value="">全部结果</option>
              <option value="passed">通过</option>
              <option value="failed">未通过</option>
              <option value="pending">等待中</option>
              <option value="ghosted">无回应</option>
            </select>
          </div>
          {Object.entries(tagsByCategory).map(([cat, list]) =>
            list.length === 0 ? null : (
              <div key={cat} className="mb-2">
                <p className="text-xs text-slate-500 mb-1">
                  {cat === 'tech' ? '技术' : cat === 'process' ? '流程' : cat === 'role' ? '岗位' : '其他'}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {list.map((t) => {
                    const active = selectedTags.includes(t.id)
                    return (
                      <button
                        key={t.id}
                        onClick={() => toggleTag(t.id)}
                        className="px-2 py-0.5 rounded-full text-xs border transition-all"
                        style={{
                          backgroundColor: active ? `${t.color ?? '#A855F7'}30` : 'transparent',
                          color: active ? (t.color ?? '#A855F7') : '#94A3B8',
                          borderColor: active ? `${t.color ?? '#A855F7'}80` : '#1E293B',
                        }}
                      >
                        {t.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            ),
          )}
          <div className="flex justify-end mt-3">
            <button
              onClick={() => syncUrl({})}
              className="px-4 py-1.5 rounded-md bg-purple-600 text-white text-sm hover:bg-purple-500"
            >
              应用筛选
            </button>
          </div>
        </div>
      )}

      {/* 列表 */}
      {loading && items.length === 0 ? (
        <p className="text-slate-500">加载中...</p>
      ) : items.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-800 rounded-lg">
          <p className="text-slate-500">没有匹配的面经</p>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-purple-400 hover:underline mt-2"
            >
              清除筛选条件
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <Link
              key={it.id}
              to={`/explore/experiences/${it.id}`}
              className="block p-4 rounded-lg border border-slate-800 bg-slate-900 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                {it.companyName && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: `${it.companyColor ?? '#6366F1'}20`,
                      color: it.companyColor ?? '#6366F1',
                    }}
                  >
                    {it.companyName}
                  </span>
                )}
                {it.interviewRound && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-950/40 text-purple-300">
                    {it.interviewRound}
                  </span>
                )}
                {it.interviewType && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950/40 text-cyan-300">
                    {it.interviewType}
                  </span>
                )}
                {it.result && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${RESULT_LABELS[it.result].color}20`,
                      color: RESULT_LABELS[it.result].color,
                    }}
                  >
                    {RESULT_LABELS[it.result].label}
                  </span>
                )}
                {it.position && (
                  <span className="text-xs text-slate-500">{it.position}</span>
                )}
              </div>
              <h3 className="text-sm font-medium text-slate-100">{it.title}</h3>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                {it.contentPreview}...
              </p>
              {it.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {it.tags.slice(0, 6).map((t) => (
                    <span
                      key={t.id}
                      className="text-xs px-1.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${t.color ?? '#A855F7'}15`,
                        color: t.color ?? '#A855F7',
                      }}
                    >
                      {t.name}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs text-slate-600">
                <span className="flex items-center gap-1">
                  <Eye size={12} />
                  {it.viewCount}
                </span>
                {it.difficulty != null && (
                  <span className="flex items-center gap-1">
                    <Star size={12} className="text-yellow-500" />
                    {'★'.repeat(it.difficulty)}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 分页 */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-md border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200 disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-slate-500 px-3">
            第 {page} / {totalPages} 页 · 共 {total} 条
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="p-2 rounded-md border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200 disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
