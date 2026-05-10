import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  FolderGit2,
  Dumbbell,
  Compass,
  Star,
  ChevronRight,
  Loader2,
  TrendingUp,
  Award,
  Briefcase,
  Rocket,
  Tag,
  Calendar,
  Zap,
} from 'lucide-react'

interface Project {
  id: string
  name: string
  period: string | null
  role: string | null
  summary: string | null
  keywords: string[]
  source: string | null
  sourceResumeId: string | null
  createdAt: number
  updatedAt: number
}

interface RelatedTraining {
  id: string
  type: string
  position: string
  targetCompany: string | null
  status: string
  createdAt: number
}

interface CrossRefExperience {
  id: string
  title: string
  companyName: string | null
  companyColor: string | null
  interviewRound: string | null
}

interface CrossRefTrend {
  id: string
  title: string
  category: string
  relevanceBase: number
}

interface CrossRefProject {
  id: string
  name: string
  description: string
  language: string | null
  stars: number | null
  impactScore: number
}

interface CrossRefQuestion {
  id: number
  question: string
  answerPreview: string
}

interface CrossRefData {
  experiences: CrossRefExperience[]
  trends: CrossRefTrend[]
  projects: CrossRefProject[]
  questions: CrossRefQuestion[]
}

const EMPTY_CROSS_REF: CrossRefData = {
  experiences: [],
  trends: [],
  projects: [],
  questions: [],
}

const TYPE_LABELS: Record<string, string> = {
  full: '整面模拟',
  self_intro: '自我介绍',
  project_qa: '项目问答',
  random_qa: '随机问答',
}

const TYPE_COLORS: Record<string, string> = {
  full: 'text-emerald-400',
  self_intro: 'text-blue-400',
  project_qa: 'text-amber-400',
  random_qa: 'text-purple-400',
}

const STATUS_CONFIG: Record<string, { text: string; cls: string; dot?: string }> = {
  pending: { text: '待开始', cls: 'bg-slate-800/60 text-slate-400 border-slate-700' },
  running: { text: '进行中', cls: 'bg-amber-950/40 text-amber-400 border-amber-800/40', dot: 'bg-amber-500' },
  ended: { text: '已结束', cls: 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40' },
}

export function ProjectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [relatedTraining, setRelatedTraining] = useState<RelatedTraining[]>([])
  const [crossRef, setCrossRef] = useState<CrossRefData>(EMPTY_CROSS_REF)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return

    Promise.all([
      fetch(`/api/projects/${id}`, { credentials: 'include' }).then((r) => r.json()),
      fetch(`/api/projects/${id}/related-training`, { credentials: 'include' }).then((r) => r.json()),
      fetch(`/api/projects/${id}/cross-ref`, { credentials: 'include' }).then((r) => r.json()),
    ])
      .then(([projRes, trainingRes, crossRes]) => {
        if (projRes.success) setProject(projRes.data)
        if (trainingRes.success) setRelatedTraining(trainingRes.data)
        if (crossRes.success) setCrossRef(crossRes.data as CrossRefData)
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={20} className="text-slate-500 animate-spin" />
      </div>
    )
  }

  if (!project) return <p className="text-slate-500">项目不存在</p>

  const totalCrossRef =
    crossRef.experiences.length +
    crossRef.trends.length +
    crossRef.projects.length +
    crossRef.questions.length

  return (
    <div className="animate-fade-in space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate('/resumes')}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
      >
        <ArrowLeft size={14} />
        返回简历页
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center ring-1 ring-white/5">
              <FolderGit2 size={20} className="text-slate-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
              {project.period && <p className="text-sm text-slate-500 mt-0.5">{project.period}</p>}
            </div>
          </div>
        </div>
        <Link
          to="/training"
          className="btn-primary self-start shrink-0"
        >
          <Dumbbell size={16} />
          开始项目模拟
        </Link>
      </div>

      {/* 项目概述 + 元信息 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card p-5 space-y-5">
          {project.role && (
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Zap size={14} className="text-slate-500" />
                <p className="text-xs text-slate-500 font-medium">担任角色</p>
              </div>
              <p className="text-slate-200">{project.role}</p>
            </div>
          )}
          {project.summary && (
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <FolderGit2 size={14} className="text-slate-500" />
                <p className="text-xs text-slate-500 font-medium">项目概述</p>
              </div>
              <p className="text-slate-300 leading-relaxed">{project.summary}</p>
            </div>
          )}
          {project.keywords.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Tag size={14} className="text-slate-500" />
                <p className="text-xs text-slate-500 font-medium">技术关键词</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {project.keywords.map((k) => (
                  <span key={k} className="text-xs px-2.5 py-1 rounded-md bg-slate-950/50 border border-slate-800 text-slate-300">
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="card p-5 space-y-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">来源</p>
            <p className="text-sm text-slate-300">
              {project.source === 'resume' ? '简历解析' : project.source === 'manual' ? '手动创建' : project.source}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">创建时间</p>
            <p className="text-sm text-slate-300 flex items-center gap-1">
              <Calendar size={12} className="text-slate-500" />
              {new Date(project.createdAt).toLocaleDateString('zh-CN')}
            </p>
          </div>
          {project.sourceResumeId && (
            <Link
              to={`/resumes/${project.sourceResumeId}`}
              className="flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              查看来源简历
              <ChevronRight size={14} />
            </Link>
          )}
        </div>
      </div>

      {/* 相关训练经历 */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center">
            <Dumbbell size={14} className="text-slate-400" />
          </div>
          <h3 className="font-semibold text-slate-100">相关模拟经历</h3>
          <span className="text-xs text-slate-500">({relatedTraining.length})</span>
        </div>

        {relatedTraining.length === 0 ? (
          <div className="text-center py-8 card border-dashed">
            <Dumbbell size={20} className="mx-auto text-slate-600 mb-2" />
            <p className="text-sm text-slate-500">暂无相关模拟记录</p>
            <Link
              to="/training"
              className="text-sm text-emerald-400 hover:text-emerald-300 mt-2 inline-flex items-center gap-1 transition-colors"
            >
              开始新的模拟
              <ChevronRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {relatedTraining.map((t) => {
              const status = STATUS_CONFIG[t.status] ?? { text: t.status, cls: 'bg-slate-800/60 text-slate-400 border-slate-700' }
              const typeColor = TYPE_COLORS[t.type] || 'text-slate-300'
              return (
                <Link
                  key={t.id}
                  to={t.status === 'ended' ? `/reviews/${t.id}` : `/training/${t.id}`}
                  className="card-interactive group block p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded-md border ${status.cls} flex items-center gap-1.5`}>
                        {status.dot && (
                          <span className="relative flex h-1.5 w-1.5">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${status.dot} opacity-75`}></span>
                            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${status.dot}`}></span>
                          </span>
                        )}
                        {status.text}
                      </span>
                      <div>
                        <p className="text-sm text-slate-200">
                          <span className={typeColor}>{TYPE_LABELS[t.type] || t.type}</span>
                          {t.targetCompany && <span className="text-slate-500"> · {t.targetCompany}</span>}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(t.createdAt).toLocaleDateString('zh-CN')}
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Explore 信息源 */}
      {project.keywords.length === 0 ? (
        <div className="card border-dashed p-5 text-center">
          <Tag size={20} className="mx-auto text-slate-600 mb-2" />
          <p className="text-sm text-slate-500">还没有技术关键词，无法关联 Explore 信息源</p>
        </div>
      ) : totalCrossRef === 0 ? (
        <div className="card border-dashed p-5 text-center">
          <Compass size={20} className="mx-auto text-slate-600 mb-2" />
          <p className="text-sm text-slate-500">
            未在 Explore 中找到与
            <span className="text-slate-300 mx-1">
              {project.keywords.slice(0, 3).join(' / ')}
              {project.keywords.length > 3 && '...'}
            </span>
            匹配的内容
          </p>
        </div>
      ) : (
        <>
          {crossRef.experiences.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Briefcase size={14} className="text-purple-400" />
                </div>
                <h3 className="font-semibold text-slate-100">相关面经</h3>
                <span className="text-xs text-slate-500">({crossRef.experiences.length})</span>
              </div>
              <div className="space-y-2">
                {crossRef.experiences.map((e) => (
                  <Link
                    key={e.id}
                    to={`/explore/experiences/${e.id}`}
                    className="card-interactive group block p-2.5"
                  >
                    <div className="flex items-center gap-2">
                      {e.companyName && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-md font-medium shrink-0"
                          style={{
                            backgroundColor: `${e.companyColor ?? '#6366F1'}20`,
                            color: e.companyColor ?? '#818cf8',
                          }}
                        >
                          {e.companyName}
                        </span>
                      )}
                      {e.interviewRound && (
                        <span className="text-[10px] text-slate-500 shrink-0">{e.interviewRound}</span>
                      )}
                      <span className="text-sm text-slate-200 truncate flex-1">{e.title}</span>
                      <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {crossRef.trends.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <TrendingUp size={14} className="text-emerald-400" />
                </div>
                <h3 className="font-semibold text-slate-100">相关行业趋势</h3>
                <span className="text-xs text-slate-500">({crossRef.trends.length})</span>
              </div>
              <div className="grid gap-2">
                {crossRef.trends.map((t) => (
                  <Link
                    key={t.id}
                    to={`/explore/trends/${t.id}`}
                    className="card-interactive group block p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-950/50 text-emerald-300 border border-emerald-900/30 shrink-0">
                        {t.category}
                      </span>
                      <span className="text-sm text-slate-200 truncate flex-1">{t.title}</span>
                      <span className="text-[10px] text-emerald-400 font-bold shrink-0">{t.relevanceBase}/10</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {crossRef.projects.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Rocket size={14} className="text-amber-400" />
                </div>
                <h3 className="font-semibold text-slate-100">相关学习项目</h3>
                <span className="text-xs text-slate-500">({crossRef.projects.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {crossRef.projects.map((p) => (
                  <Link
                    key={p.id}
                    to={`/explore/projects/${p.id}`}
                    className="card-interactive group block p-3"
                  >
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      {p.language && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                          {p.language}
                        </span>
                      )}
                      {p.stars != null && (
                        <span className="text-[10px] text-yellow-500 flex items-center gap-0.5">
                          <Star size={9} />
                          {p.stars >= 1000 ? `${Math.round(p.stars / 100) / 10}k` : p.stars}
                        </span>
                      )}
                      <span className="text-[10px] text-amber-400 ml-auto font-bold">{p.impactScore}/10</span>
                    </div>
                    <p className="text-sm font-medium text-slate-200 line-clamp-1">{p.name}</p>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{p.description}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {crossRef.questions.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center">
                  <Award size={14} className="text-rose-400" />
                </div>
                <h3 className="font-semibold text-slate-100">相关题库问答</h3>
                <span className="text-xs text-slate-500">({crossRef.questions.length})</span>
              </div>
              <div className="space-y-2">
                {crossRef.questions.map((q) => (
                  <Link
                    key={q.id}
                    to={`/explore/questions?q=${encodeURIComponent(q.question.slice(0, 30))}#${q.id}`}
                    className="card-interactive group block p-3"
                  >
                    <p className="text-sm text-slate-200 line-clamp-1">{q.question}</p>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1">{q.answerPreview}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
