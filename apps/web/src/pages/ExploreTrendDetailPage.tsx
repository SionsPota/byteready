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
import { CrossRefBlock, type RelatedByTags } from '../components/CrossRefBlock.tsx'

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
  relatedByTags: RelatedByTags
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

      {/* Header Card */}
      <div className="card-elevated p-5 mb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
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
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center ring-1 ring-emerald-500/20">
                <TrendingUp size={18} className="text-emerald-400" />
              </div>
              {trend.title}
            </h1>
            <p className="text-sm text-slate-400 mt-3 leading-relaxed">{trend.description}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="w-16 h-16 rounded-xl bg-emerald-500/10 flex flex-col items-center justify-center ring-1 ring-emerald-500/20">
              <div className="text-2xl font-bold text-emerald-400">{trend.relevanceBase}</div>
              <div className="text-[10px] text-slate-500">相关度/10</div>
            </div>
          </div>
        </div>

        {trend.relatedSkills.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-800/60">
            <div className="flex items-center gap-2 mb-2">
              <TagIcon size={12} className="text-slate-500" />
              <p className="text-xs text-slate-500 font-medium">关键技术</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {trend.relatedSkills.map((s) => (
                <span
                  key={s}
                  className="text-xs px-2.5 py-1 rounded-md bg-slate-950/50 border border-slate-800 text-slate-300"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {trend.tags.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-800/60 flex flex-wrap gap-1.5 items-center">
            {trend.tags.map((t) => (
              <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-purple-950/30 text-purple-300 border border-purple-900/20">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Content Blocks - 2 column layout for hotspots + impact */}
      {(trend.interviewHotspots || trend.marketImpact) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
          {trend.interviewHotspots && (
            <div className="card-elevated p-5 border-l-4 border-l-amber-500">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center ring-1 ring-amber-500/20">
                  <Target size={14} className="text-amber-400" />
                </div>
                <h2 className="text-sm font-semibold text-amber-400">面试热点</h2>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                {trend.interviewHotspots}
              </p>
            </div>
          )}
          {trend.marketImpact && (
            <div className="card-elevated p-5 border-l-4 border-l-cyan-500">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center ring-1 ring-cyan-500/20">
                  <CheckCircle2 size={14} className="text-cyan-400" />
                </div>
                <h2 className="text-sm font-semibold text-cyan-400">市场影响</h2>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                {trend.marketImpact}
              </p>
            </div>
          )}
        </div>
      )}

      {trend.keyPoints.length > 0 && (
        <div className="card p-5 mb-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center ring-1 ring-emerald-500/20">
              <CheckCircle2 size={14} className="text-emerald-400" />
            </div>
            <h2 className="text-sm font-semibold text-slate-100">关键要点</h2>
          </div>
          <div className="grid gap-2">
            {trend.keyPoints.map((p, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/30 border border-slate-800/60"
              >
                <span className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-400 text-xs flex items-center justify-center shrink-0 font-medium ring-1 ring-emerald-500/20">
                  {i + 1}
                </span>
                <span className="text-sm text-slate-300 leading-relaxed">{p}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {trend.learningAdvice && (
        <div className="card-elevated p-5 mb-5 border-l-4 border-l-purple-500">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center ring-1 ring-purple-500/20">
              <Lightbulb size={14} className="text-purple-400" />
            </div>
            <h2 className="text-sm font-semibold text-purple-400">学习建议</h2>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">{trend.learningAdvice}</p>
        </div>
      )}

      {sourceUrls.length > 0 && (
        <div className="card p-4 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center">
              <ExternalLink size={14} className="text-slate-400" />
            </div>
            <h2 className="text-sm font-semibold text-slate-100">参考链接</h2>
          </div>
          <div className="space-y-2">
            {sourceUrls.map((u) => (
              <a
                key={u}
                href={u}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors truncate p-2 rounded-lg bg-slate-950/30 border border-slate-800/60 hover:border-purple-800/40"
              >
                <ExternalLink size={14} className="shrink-0" />
                {u}
              </a>
            ))}
          </div>
        </div>
      )}

      {trend.relatedProjects.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center ring-1 ring-amber-500/20">
              <Rocket size={14} className="text-amber-400" />
            </div>
            <h2 className="text-sm font-semibold text-slate-100">相关学习项目</h2>
            <span className="text-xs text-slate-500">({trend.relatedProjects.length})</span>
          </div>
          <div className="grid gap-2">
            {trend.relatedProjects.map((p) => (
              <Link
                key={p.id}
                to={`/explore/projects/${p.id}`}
                className="card-interactive p-3"
              >
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {p.projectType && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-950/40 text-purple-300 border border-purple-900/30">
                      {TYPE_LABELS[p.projectType]}
                    </span>
                  )}
                  {p.difficulty && (
                    <span className="text-[10px] text-slate-500">
                      {DIFFICULTY_LABELS[p.difficulty]}
                    </span>
                  )}
                  {p.language && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {p.language}
                    </span>
                  )}
                  {p.stars != null && (
                    <span className="text-[10px] text-yellow-500 flex items-center gap-0.5">
                      ★ {p.stars.toLocaleString()}
                    </span>
                  )}
                  <span className="ml-auto text-[10px] font-bold text-amber-400">
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

      <div className="mt-4">
        <CrossRefBlock data={trend.relatedByTags} />
      </div>
    </div>
  )
}
