import { Link, useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  Star,
  Eye,
  ExternalLink,
  Tag as TagIcon,
  Clock,
  TrendingUp,
  Rocket,
  BookOpen,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Ghost,
} from 'lucide-react'
import { useApi } from '../hooks/useApi.ts'
import { CrossRefBlock, type RelatedByTags } from '../components/CrossRefBlock.tsx'

interface Tag {
  id: string
  name: string
  color: string | null
  category: string
}

interface RelatedTrend {
  id: string
  title: string
  category: string
  description: string
  relevanceBase: number
}

interface RelatedProject {
  id: string
  name: string
  description: string
  githubUrl: string | null
  stars: number | null
  language: string | null
  impactScore: number
}

interface ExperienceDetail {
  id: string
  companyId: string | null
  companyName: string | null
  companyColor: string | null
  title: string
  position: string | null
  content: string | null
  sourceUrl: string | null
  difficulty: number | null
  result: 'passed' | 'failed' | 'pending' | 'ghosted' | null
  interviewDate: number | null
  viewCount: number
  interviewRound: string | null
  interviewType: string | null
  answerKeyPoints: string | null
  createdAt: number
  tags: Tag[]
  relatedTrends: RelatedTrend[]
  relatedProjects: RelatedProject[]
  relatedByTags: RelatedByTags
}

const RESULT_CONFIG: Record<NonNullable<ExperienceDetail['result']>, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  passed: { label: '通过', color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-800/40', icon: CheckCircle2 },
  failed: { label: '未通过', color: 'text-red-400', bg: 'bg-red-950/40 border-red-800/40', icon: XCircle },
  pending: { label: '等待中', color: 'text-amber-400', bg: 'bg-amber-950/40 border-amber-800/40', icon: HelpCircle },
  ghosted: { label: '无回应', color: 'text-slate-400', bg: 'bg-slate-800/60 border-slate-700', icon: Ghost },
}

export function ExperienceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: exp, loading } = useApi<ExperienceDetail>(
    id ? `/api/explore/experiences/${id}` : null,
    { ttl: 0 },
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-slate-700 border-t-purple-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!exp) {
    return (
      <div className="text-center py-12 card border-dashed">
        <BookOpen size={24} className="mx-auto text-slate-600 mb-3" />
        <p className="text-slate-500">面经不存在或已被删除</p>
        <button
          onClick={() => navigate('/explore/experiences')}
          className="text-sm text-purple-400 hover:text-purple-300 mt-2 transition-colors"
        >
          返回列表
        </button>
      </div>
    )
  }

  const resultCfg = exp.result ? RESULT_CONFIG[exp.result] : null

  return (
    <div className="animate-fade-in space-y-5">
      <Link
        to="/explore/experiences"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
      >
        <ArrowLeft size={14} />
        返回列表
      </Link>

      {/* Header Card */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {exp.companyName && (
                <Link
                  to={`/explore/experiences?companyId=${exp.companyId ?? ''}`}
                  className="text-[11px] px-2 py-0.5 rounded-md font-medium hover:opacity-80 transition-opacity"
                  style={{
                    backgroundColor: `${exp.companyColor ?? '#6366F1'}20`,
                    color: exp.companyColor ?? '#818cf8',
                  }}
                >
                  {exp.companyName}
                </Link>
              )}
              {exp.interviewRound && (
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-purple-950/50 text-purple-300 border border-purple-900/30">
                  {exp.interviewRound}
                </span>
              )}
              {exp.interviewType && (
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-cyan-950/50 text-cyan-300 border border-cyan-900/30">
                  {exp.interviewType}
                </span>
              )}
              {resultCfg && (
                <span className={`text-[11px] px-2 py-0.5 rounded-md border ${resultCfg.bg} ${resultCfg.color} flex items-center gap-1`}>
                  <resultCfg.icon size={10} />
                  {resultCfg.label}
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-100">{exp.title}</h1>
            {exp.position && <p className="text-sm text-slate-400 mt-1">{exp.position}</p>}
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500 mt-4 pt-4 border-t border-slate-800/60">
          {exp.interviewDate && (
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {new Date(exp.interviewDate).toLocaleDateString('zh-CN')}
            </span>
          )}
          {exp.difficulty != null && (
            <span className="flex items-center gap-1">
              <Star size={12} className="text-yellow-500" />
              难度 {'★'.repeat(exp.difficulty)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Eye size={12} />
            {exp.viewCount} 次浏览
          </span>
          {exp.sourceUrl && (
            <a
              href={exp.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors"
            >
              <ExternalLink size={12} />
              来源链接
            </a>
          )}
        </div>

        {exp.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-slate-800/60 items-center">
            <TagIcon size={12} className="text-slate-500 mr-1" />
            {exp.tags.map((t) => (
              <span
                key={t.id}
                className="text-[11px] px-2 py-0.5 rounded-full border"
                style={{
                  backgroundColor: `${t.color ?? '#A855F7'}15`,
                  borderColor: `${t.color ?? '#A855F7'}25`,
                  color: t.color ?? '#C084FC',
                }}
              >
                {t.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Clock size={14} className="text-purple-400" />
          </div>
          <h2 className="text-sm font-semibold text-slate-100">题目 / 面经内容</h2>
        </div>
        <pre className="whitespace-pre-wrap text-sm text-slate-300 leading-relaxed font-sans">
          {exp.content}
        </pre>
      </div>

      {exp.answerKeyPoints && (
        <div className="card-elevated p-5 border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <BookOpen size={14} className="text-emerald-400" />
            </div>
            <h2 className="text-sm font-semibold text-emerald-400">参考答案 / 要点</h2>
          </div>
          <pre className="whitespace-pre-wrap text-sm text-slate-300 leading-relaxed font-sans">
            {exp.answerKeyPoints}
          </pre>
        </div>
      )}

      {exp.relatedTrends.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp size={14} className="text-emerald-400" />
            </div>
            <h2 className="text-sm font-semibold text-slate-100">相关行业趋势</h2>
          </div>
          <div className="grid gap-3">
            {exp.relatedTrends.map((t) => (
              <Link
                key={t.id}
                to={`/explore/trends/${t.id}`}
                className="block p-3 rounded-lg border border-slate-800 hover:border-emerald-700/40 hover:bg-slate-800/30 transition-all group"
              >
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-950/50 text-emerald-300 border border-emerald-900/30">
                    {t.category}
                  </span>
                  <span className="ml-auto text-[10px] font-bold text-emerald-400">{t.relevanceBase}/10</span>
                </div>
                <p className="text-sm font-medium text-slate-200 group-hover:text-emerald-200 transition-colors">{t.title}</p>
                <p className="text-xs text-slate-500 line-clamp-2 mt-1">{t.description}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {exp.relatedProjects.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Rocket size={14} className="text-amber-400" />
            </div>
            <h2 className="text-sm font-semibold text-slate-100">相关学习项目</h2>
          </div>
          <div className="grid gap-3">
            {exp.relatedProjects.map((p) => (
              <Link
                key={p.id}
                to={`/explore/projects/${p.id}`}
                className="block p-3 rounded-lg border border-slate-800 hover:border-amber-700/40 hover:bg-slate-800/30 transition-all group"
              >
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {p.language && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                      {p.language}
                    </span>
                  )}
                  {p.stars != null && (
                    <span className="text-[10px] text-yellow-500 flex items-center gap-0.5">
                      <Star size={9} />
                      {p.stars.toLocaleString()}
                    </span>
                  )}
                  <span className="ml-auto text-[10px] font-bold text-amber-400">{p.impactScore}/10</span>
                </div>
                <p className="text-sm font-medium text-slate-200 group-hover:text-amber-200 transition-colors">{p.name}</p>
                <p className="text-xs text-slate-500 line-clamp-2 mt-1">{p.description}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      <CrossRefBlock data={exp.relatedByTags} />
    </div>
  )
}
