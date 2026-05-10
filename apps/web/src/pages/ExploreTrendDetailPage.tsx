import { Link, useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  TrendingUp,
  CheckCircle2,
  Lightbulb,
  ExternalLink,
  Rocket,
  Calendar,
  Target,
  Tag as TagIcon,
} from 'lucide-react'
import { useApi } from '../hooks/useApi.ts'

interface RelatedProject {
  id: string
  name: string
  projectType: 'quick_win' | 'weekend_build' | 'deep_dive' | null
  difficulty: 'beginner' | 'intermediate' | 'advanced' | null
  description: string
  impactScore: number
  stars: number | null
  language: string | null
  githubUrl: string | null
}

interface TrendDetail {
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
  relatedProjects: RelatedProject[]
}

const TYPE_LABELS: Record<NonNullable<RelatedProject['projectType']>, string> = {
  quick_win: 'Quick Win',
  weekend_build: 'Weekend Build',
  deep_dive: 'Deep Dive',
}

const DIFFICULTY_LABELS: Record<NonNullable<RelatedProject['difficulty']>, string> = {
  beginner: '入门',
  intermediate: '中级',
  advanced: '高级',
}

export function ExploreTrendDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: trend, loading } = useApi<TrendDetail>(
    id ? `/api/explore/trends/${id}` : null,
    { ttl: 60_000 },
  )

  if (loading) return <p className="text-slate-500">加载中...</p>
  if (!trend) {
    return (
      <div className="text-center py-12 border border-dashed border-slate-800 rounded-lg">
        <p className="text-slate-500">趋势不存在</p>
        <button
          onClick={() => navigate('/explore/trends')}
          className="text-sm text-emerald-400 hover:underline mt-2"
        >
          返回趋势列表
        </button>
      </div>
    )
  }

  const sourceUrls = trend.sourceUrl ? trend.sourceUrl.split(',').map((s) => s.trim()).filter(Boolean) : []

  return (
    <div>
      <Link
        to="/explore/trends"
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 mb-4"
      >
        <ArrowLeft size={14} />
        返回趋势
      </Link>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-5 mb-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950/30 border border-emerald-800/50 text-emerald-400">
                {trend.category}
              </span>
              {trend.year && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Calendar size={10} />
                  {trend.year}
                </span>
              )}
              {trend.relatedRole && (
                <span className="text-xs text-slate-500">面向：{trend.relatedRole}</span>
              )}
            </div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp size={20} className="text-emerald-400" />
              {trend.title}
            </h1>
            <p className="text-sm text-slate-400 mt-3 leading-relaxed">{trend.description}</p>
          </div>
          <div className="ml-3 text-right">
            <div className="text-3xl font-bold text-emerald-400">{trend.relevanceBase}</div>
            <div className="text-xs text-slate-600">相关度/10+</div>
          </div>
        </div>

        {trend.relatedSkills.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-800">
            <p className="text-xs text-slate-500 mb-1.5">关键技术</p>
            <div className="flex flex-wrap gap-1.5">
              {trend.relatedSkills.map((s) => (
                <span
                  key={s}
                  className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {trend.tags.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap gap-1.5 items-center">
            <TagIcon size={12} className="text-slate-500" />
            {trend.tags.map((t) => (
              <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-purple-950/30 text-purple-300">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {trend.interviewHotspots && (
        <div className="rounded-lg border border-amber-900/40 bg-amber-950/10 p-5 mb-4">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-2 text-amber-400">
            <Target size={14} />
            面试热点
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
            {trend.interviewHotspots}
          </p>
        </div>
      )}

      {trend.marketImpact && (
        <div className="rounded-lg border border-cyan-900/40 bg-cyan-950/10 p-5 mb-4">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-2 text-cyan-400">
            <CheckCircle2 size={14} />
            市场影响
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
            {trend.marketImpact}
          </p>
        </div>
      )}

      {trend.keyPoints.length > 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-5 mb-4">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <CheckCircle2 size={14} className="text-emerald-400" />
            关键要点
          </h2>
          <ul className="space-y-2">
            {trend.keyPoints.map((p, i) => (
              <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">·</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {trend.learningAdvice && (
        <div className="rounded-lg border border-amber-900/40 bg-amber-950/10 p-5 mb-4">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-2 text-amber-400">
            <Lightbulb size={14} />
            学习建议
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">{trend.learningAdvice}</p>
        </div>
      )}

      {sourceUrls.length > 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 mb-4">
          <p className="text-xs text-slate-500 mb-2">参考链接</p>
          <div className="space-y-1">
            {sourceUrls.map((u) => (
              <a
                key={u}
                href={u}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-purple-400 hover:underline truncate"
              >
                <ExternalLink size={14} className="shrink-0" />
                {u}
              </a>
            ))}
          </div>
        </div>
      )}

      {trend.relatedProjects.length > 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <Rocket size={14} className="text-amber-400" />
            相关学习项目
          </h2>
          <div className="grid gap-3">
            {trend.relatedProjects.map((p) => (
              <Link
                key={p.id}
                to={`/explore/projects/${p.id}`}
                className="block p-3 rounded-md border border-slate-800 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {p.projectType && (
                    <span className="text-xs px-2 py-0.5 rounded bg-purple-950/40 text-purple-300">
                      {TYPE_LABELS[p.projectType]}
                    </span>
                  )}
                  {p.difficulty && (
                    <span className="text-xs text-slate-500">
                      {DIFFICULTY_LABELS[p.difficulty]}
                    </span>
                  )}
                  {p.language && (
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {p.language}
                    </span>
                  )}
                  {p.stars != null && (
                    <span className="text-xs text-slate-500">★ {p.stars.toLocaleString()}</span>
                  )}
                  <span className="ml-auto text-xs font-bold text-amber-400">
                    {p.impactScore}/10
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-100">{p.name}</p>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{p.description}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
