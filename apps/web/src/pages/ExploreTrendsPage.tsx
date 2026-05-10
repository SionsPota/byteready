import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, Sparkles, Lightbulb, CheckCircle2, Calendar } from 'lucide-react'
import { useApi } from '../hooks/useApi.ts'

interface IndustryTrend {
  id: string
  category: string
  title: string
  description: string
  keyPoints: string[]
  learningAdvice: string | null
  sourceUrl: string | null
  sourceTitle: string | null
  relatedSkills: string[]
  relatedRole: string | null
  relevanceBase: number
  marketImpact: string | null
  interviewHotspots: string | null
  year: string | null
  tags: string[]
  score?: number
}

interface RecommendData {
  items: IndustryTrend[]
  role: string | null
  gaps: string[]
}

interface ResumeSummary {
  id: string
  title: string
}

export function ExploreTrendsPage() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [useRecommend, setUseRecommend] = useState(false)

  const { data: resumes } = useApi<ResumeSummary[]>('/api/resumes', { ttl: 60_000 })
  const firstResumeId = resumes?.[0]?.id

  const { data: allTrends, loading: loadingAll } = useApi<IndustryTrend[]>(
    '/api/explore/trends',
    { ttl: 60_000 },
  )
  const { data: recommended } = useApi<RecommendData>(
    useRecommend && firstResumeId
      ? `/api/explore/trends/recommend?resumeId=${firstResumeId}`
      : null,
    { ttl: 30_000 },
  )

  const trends = useRecommend && recommended ? recommended.items : allTrends ?? []

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, IndustryTrend[]> = {}
    for (const t of trends) {
      groups[t.category] = groups[t.category] ?? []
      groups[t.category]!.push(t)
    }
    return groups
  }, [trends])
  const categories = Object.keys(groupedByCategory)
  const filteredTrends = activeCategory ? groupedByCategory[activeCategory] ?? [] : trends

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="text-emerald-400" size={22} />
            行业趋势
          </h1>
          <p className="text-sm text-slate-500 mt-1">前沿技术资讯，扩展认知边界</p>
        </div>
        <Link to="/explore" className="text-sm text-slate-400 hover:text-slate-200">
          返回探索
        </Link>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-3 mb-4 flex items-center justify-between">
        <span className="text-sm text-slate-400">
          {firstResumeId ? '可基于你的简历推荐相关趋势' : '上传简历后可解锁个性化推荐'}
        </span>
        <button
          disabled={!firstResumeId}
          onClick={() => setUseRecommend((v) => !v)}
          className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
            useRecommend
              ? 'bg-emerald-600 text-white hover:bg-emerald-500'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <Sparkles size={12} className="inline mr-1" />
          {useRecommend ? '已按简历推荐' : '按简历推荐'}
        </button>
      </div>

      {useRecommend && recommended && (
        <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/20 p-3 mb-4 text-sm">
          <span className="text-emerald-400">推荐角色：</span>
          <span className="text-slate-200 mr-3">{recommended.role ?? '未识别'}</span>
          {recommended.gaps.length > 0 && (
            <>
              <span className="text-emerald-400">缺口：</span>
              <span className="text-slate-300">{recommended.gaps.join('、')}</span>
            </>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-3 py-1 rounded-md text-xs ${
            activeCategory === null
              ? 'bg-slate-800 text-slate-100'
              : 'bg-slate-900 text-slate-500 hover:text-slate-300'
          }`}
        >
          全部 ({trends.length})
        </button>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setActiveCategory(c === activeCategory ? null : c)}
            className={`px-3 py-1 rounded-md text-xs ${
              activeCategory === c
                ? 'bg-slate-800 text-slate-100'
                : 'bg-slate-900 text-slate-500 hover:text-slate-300'
            }`}
          >
            {c} ({groupedByCategory[c]!.length})
          </button>
        ))}
      </div>

      {loadingAll && trends.length === 0 ? (
        <p className="text-slate-500">加载中...</p>
      ) : (
        <div className="space-y-4">
          {filteredTrends.map((t) => (
            <Link
              key={t.id}
              to={`/explore/trends/${t.id}`}
              className="block rounded-lg border border-slate-800 bg-slate-900 hover:border-slate-700 transition-colors p-5"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950/30 border border-emerald-800/50 text-emerald-400">
                      {t.category}
                    </span>
                    {t.year && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar size={10} />
                        {t.year}
                      </span>
                    )}
                    {t.relatedRole && (
                      <span className="text-xs text-slate-500">面向：{t.relatedRole}</span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-slate-100">{t.title}</h3>
                  <p className="text-sm text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {t.description}
                  </p>
                </div>
                <div className="ml-3 text-right">
                  <div className="text-xl font-bold text-emerald-400">
                    {t.score ?? t.relevanceBase}
                  </div>
                  <div className="text-xs text-slate-600">
                    {useRecommend ? '推荐分' : '相关度'}/10+
                  </div>
                </div>
              </div>
              {t.relatedSkills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-800">
                  <CheckCircle2 size={12} className="text-emerald-400 mt-0.5" />
                  {t.relatedSkills.slice(0, 6).map((p, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-0.5 rounded bg-slate-800/70 text-slate-300"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              )}
              {t.interviewHotspots && (
                <div className="flex items-start gap-2 mt-3 text-xs text-slate-500">
                  <Lightbulb size={12} className="text-amber-400 mt-0.5 shrink-0" />
                  <span className="line-clamp-1">面试热点：{t.interviewHotspots}</span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
