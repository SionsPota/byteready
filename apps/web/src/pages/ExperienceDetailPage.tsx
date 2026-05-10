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
} from 'lucide-react'
import { useApi } from '../hooks/useApi.ts'

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
}

const RESULT_LABELS: Record<NonNullable<ExperienceDetail['result']>, { label: string; color: string }> = {
  passed: { label: '通过', color: '#22C55E' },
  failed: { label: '未通过', color: '#EF4444' },
  pending: { label: '等待中', color: '#EAB308' },
  ghosted: { label: '无回应', color: '#6B7280' },
}

export function ExperienceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: exp, loading } = useApi<ExperienceDetail>(
    id ? `/api/explore/experiences/${id}` : null,
    { ttl: 0 },
  )

  if (loading) {
    return <p className="text-slate-500">加载中...</p>
  }

  if (!exp) {
    return (
      <div className="text-center py-12 border border-dashed border-slate-800 rounded-lg">
        <p className="text-slate-500">面经不存在或已被删除</p>
        <button
          onClick={() => navigate('/explore/experiences')}
          className="text-sm text-purple-400 hover:underline mt-2"
        >
          返回列表
        </button>
      </div>
    )
  }

  return (
    <div>
      <Link
        to="/explore/experiences"
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 mb-4"
      >
        <ArrowLeft size={14} />
        返回列表
      </Link>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-5 mb-4">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {exp.companyName && (
            <Link
              to={`/explore/experiences?companyId=${exp.companyId ?? ''}`}
              className="text-xs px-2 py-0.5 rounded-full font-medium hover:opacity-80"
              style={{
                backgroundColor: `${exp.companyColor ?? '#6366F1'}20`,
                color: exp.companyColor ?? '#6366F1',
              }}
            >
              {exp.companyName}
            </Link>
          )}
          {exp.interviewRound && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-950/40 text-purple-300">
              {exp.interviewRound}
            </span>
          )}
          {exp.interviewType && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950/40 text-cyan-300">
              {exp.interviewType}
            </span>
          )}
          {exp.result && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: `${RESULT_LABELS[exp.result].color}20`,
                color: RESULT_LABELS[exp.result].color,
              }}
            >
              {RESULT_LABELS[exp.result].label}
            </span>
          )}
        </div>
        <h1 className="text-xl font-bold mb-1">{exp.title}</h1>
        {exp.position && <p className="text-sm text-slate-400 mb-3">{exp.position}</p>}

        <div className="flex flex-wrap gap-4 text-xs text-slate-500 mb-3">
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
              className="flex items-center gap-1 text-purple-400 hover:underline"
            >
              <ExternalLink size={12} />
              来源链接
            </a>
          )}
        </div>

        {exp.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-800">
            <TagIcon size={12} className="text-slate-500 mt-1" />
            {exp.tags.map((t) => (
              <span
                key={t.id}
                className="text-xs px-2 py-0.5 rounded-full"
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
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={16} className="text-purple-400" />
          <h2 className="text-sm font-semibold">题目 / 面经内容</h2>
        </div>
        <pre className="whitespace-pre-wrap text-sm text-slate-300 leading-relaxed font-sans">
          {exp.content}
        </pre>
      </div>

      {exp.answerKeyPoints && (
        <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/10 p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={16} className="text-emerald-400" />
            <h2 className="text-sm font-semibold text-emerald-400">参考答案 / 要点</h2>
          </div>
          <pre className="whitespace-pre-wrap text-sm text-slate-300 leading-relaxed font-sans">
            {exp.answerKeyPoints}
          </pre>
        </div>
      )}

      {exp.relatedTrends.length > 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-5 mb-4">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-emerald-400" />
            相关行业趋势
          </h2>
          <div className="grid gap-3">
            {exp.relatedTrends.map((t) => (
              <Link
                key={t.id}
                to={`/explore/trends/${t.id}`}
                className="block p-3 rounded-md border border-slate-800 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-300">
                    {t.category}
                  </span>
                  <span className="ml-auto text-xs font-bold text-emerald-400">
                    {t.relevanceBase}/10
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-100">{t.title}</p>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t.description}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {exp.relatedProjects.length > 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <Rocket size={14} className="text-amber-400" />
            相关学习项目
          </h2>
          <div className="grid gap-3">
            {exp.relatedProjects.map((p) => (
              <Link
                key={p.id}
                to={`/explore/projects/${p.id}`}
                className="block p-3 rounded-md border border-slate-800 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {p.language && (
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {p.language}
                    </span>
                  )}
                  {p.stars != null && (
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Star size={10} className="text-yellow-500" />
                      {p.stars.toLocaleString()}
                    </span>
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
