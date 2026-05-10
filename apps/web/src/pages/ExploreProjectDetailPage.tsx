import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Rocket,
  CheckCircle2,
  Star,
  Copy,
  Check,
  Clock,
  Target,
  TrendingUp,
  ExternalLink,
  Tag as TagIcon,
  BookOpen,
} from 'lucide-react'
import { useApi } from '../hooks/useApi.ts'
import { CrossRefBlock, type RelatedByTags } from '../components/CrossRefBlock.tsx'

type ProjectType = 'quick_win' | 'weekend_build' | 'deep_dive'
type Difficulty = 'beginner' | 'intermediate' | 'advanced'

interface RelatedTrend {
  id: string
  title: string
  category: string
  description: string
  relevanceBase: number
}

interface ProjectDetail {
  id: string
  name: string
  projectType: ProjectType | null
  difficulty: Difficulty | null
  timeEstimate: string | null
  techStack: string[]
  gapAddressed: string | null
  description: string
  coreFeatures: string[]
  techHighlights: string[]
  implementationSteps: string[]
  resumeTemplate: string | null
  impactScore: number
  sourceUrl: string | null
  relatedRole: string | null
  relatedSkills: string[]
  githubUrl: string | null
  stars: number | null
  forks: number | null
  language: string | null
  category: string | null
  learningPath: string | null
  isInterviewRelated: boolean
  tags: string[]
  relatedTrends: RelatedTrend[]
  relatedByTags: RelatedByTags
}

const TYPE_LABELS: Record<ProjectType, { label: string; color: string }> = {
  quick_win: { label: 'Quick Win', color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50' },
  weekend_build: { label: 'Weekend Build', color: 'text-cyan-400 bg-cyan-950/40 border-cyan-800/50' },
  deep_dive: { label: 'Deep Dive', color: 'text-purple-400 bg-purple-950/40 border-purple-800/50' },
}

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner: '入门',
  intermediate: '中级',
  advanced: '高级',
}

export function ExploreProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const { data: project, loading } = useApi<ProjectDetail>(
    id ? `/api/explore/projects/${id}` : null,
    { ttl: 60_000 },
  )

  const handleCopy = async () => {
    if (!project?.resumeTemplate) return
    try {
      await navigator.clipboard.writeText(project.resumeTemplate)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // 剪贴板权限被拒
    }
  }

  if (loading) return <p className="text-slate-500">加载中...</p>
  if (!project) {
    return (
      <div className="text-center py-12 border border-dashed border-slate-800 rounded-lg">
        <p className="text-slate-500">学习项目不存在</p>
        <button
          onClick={() => navigate('/explore/projects')}
          className="text-sm text-amber-400 hover:underline mt-2"
        >
          返回项目列表
        </button>
      </div>
    )
  }

  return (
    <div>
      <Link
        to="/explore/projects"
        className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 mb-4"
      >
        <ArrowLeft size={14} />
        返回学习项目
      </Link>

      {/* Header Card */}
      <div className="card-elevated p-5 mb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {project.projectType && (
                <span
                  className={`text-xs px-2 py-0.5 rounded border ${TYPE_LABELS[project.projectType].color}`}
                >
                  {TYPE_LABELS[project.projectType].label}
                </span>
              )}
              {project.difficulty && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-slate-950/50 border border-slate-800 text-slate-300">
                  {DIFFICULTY_LABELS[project.difficulty]}
                </span>
              )}
              {project.language && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-slate-950/50 border border-slate-800 text-slate-300">
                  {project.language}
                </span>
              )}
              {project.category && (
                <span className="text-xs text-slate-500">{project.category}</span>
              )}
              {project.timeEstimate && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock size={10} />
                  {project.timeEstimate}
                </span>
              )}
              {project.relatedRole && (
                <span className="text-xs text-slate-500">面向：{project.relatedRole}</span>
              )}
            </div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center ring-1 ring-amber-500/20">
                <Rocket size={18} className="text-amber-400" />
              </div>
              {project.name}
            </h1>
            <p className="text-sm text-slate-400 mt-3 leading-relaxed">{project.description}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="w-16 h-16 rounded-xl bg-amber-500/10 flex flex-col items-center justify-center ring-1 ring-amber-500/20">
              <div className="text-2xl font-bold text-amber-400">{project.impactScore}</div>
              <div className="text-[10px] text-slate-500">影响分/10</div>
            </div>
          </div>
        </div>

        {(project.stars != null || project.forks != null || project.githubUrl) && (
          <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-slate-800/60 text-sm">
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors"
              >
                <ExternalLink size={14} />
                GitHub
              </a>
            )}
            {project.stars != null && (
              <span className="flex items-center gap-1 text-slate-400">
                <Star size={12} className="text-yellow-500" />
                {project.stars.toLocaleString()} stars
              </span>
            )}
            {project.forks != null && (
              <span className="flex items-center gap-1 text-slate-400">
                <span className="text-slate-500">⑂</span>
                {project.forks.toLocaleString()} forks
              </span>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-800/60">
          {project.techStack.map((t) => (
            <span key={t} className="text-xs px-2.5 py-1 rounded-md bg-slate-950/50 border border-slate-800 text-slate-300">
              {t}
            </span>
          ))}
          {project.gapAddressed && (
            <span className="text-xs px-2.5 py-1 rounded-md bg-purple-950/30 border border-purple-800/30 text-purple-300 flex items-center gap-1">
              <Target size={10} />
              {project.gapAddressed}
            </span>
          )}
        </div>

        {project.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-800/60 items-center">
            <TagIcon size={12} className="text-slate-500 mr-1" />
            {project.tags.map((t) => (
              <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-cyan-950/30 text-cyan-300 border border-cyan-900/20">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Content Grid - 2 columns on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        {project.learningPath && (
          <div className="card-elevated p-5 border-l-4 border-l-emerald-500">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center ring-1 ring-emerald-500/20">
                <BookOpen size={14} className="text-emerald-400" />
              </div>
              <h2 className="text-sm font-semibold text-emerald-400">学习路径建议</h2>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
              {project.learningPath}
            </p>
          </div>
        )}

        {project.resumeTemplate && (
          <div className="card-elevated p-5 border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center ring-1 ring-amber-500/20">
                  <Star size={14} className="text-amber-400" />
                </div>
                <h2 className="text-sm font-semibold text-amber-400">简历描述模板</h2>
              </div>
              <button
                onClick={handleCopy}
                className="text-xs px-2.5 py-1.5 rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center gap-1 transition-colors"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? '已复制' : '复制'}
              </button>
            </div>
            <p className="text-sm text-slate-300 italic leading-relaxed">{project.resumeTemplate}</p>
          </div>
        )}
      </div>

      {project.coreFeatures.length > 0 && (
        <div className="card p-5 mb-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center ring-1 ring-cyan-500/20">
              <CheckCircle2 size={14} className="text-cyan-400" />
            </div>
            <h2 className="text-sm font-semibold text-slate-100">核心功能</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {project.coreFeatures.map((f, i) => (
              <div
                key={i}
                className="flex items-start gap-2 p-3 rounded-lg bg-slate-950/30 border border-slate-800/60"
              >
                <CheckCircle2 size={14} className="text-cyan-400 mt-0.5 shrink-0" />
                <span className="text-sm text-slate-300">{f}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {project.techHighlights.length > 0 && (
        <div className="card-elevated p-5 mb-5 border-l-4 border-l-cyan-500">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center ring-1 ring-cyan-500/20">
              <Star size={14} className="text-cyan-400" />
            </div>
            <h2 className="text-sm font-semibold text-cyan-400">技术亮点</h2>
          </div>
          <div className="grid gap-2">
            {project.techHighlights.map((h, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/30 border border-slate-800/60">
                <span className="w-5 h-5 rounded-md bg-cyan-500/10 text-cyan-400 text-xs flex items-center justify-center shrink-0 font-medium">
                  {i + 1}
                </span>
                <span className="text-sm text-slate-300 leading-relaxed">{h}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {project.implementationSteps.length > 0 && (
        <div className="card p-5 mb-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center ring-1 ring-amber-500/20">
              <Rocket size={14} className="text-amber-400" />
            </div>
            <h2 className="text-sm font-semibold text-slate-100">实现步骤</h2>
          </div>
          <div className="space-y-2">
            {project.implementationSteps.map((s, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-950/30 border border-slate-800/60">
                <span className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-400 text-xs flex items-center justify-center shrink-0 font-medium ring-1 ring-amber-500/20">
                  {i + 1}
                </span>
                <span className="text-sm text-slate-300">{s}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {project.sourceUrl && project.sourceUrl !== project.githubUrl && (
        <div className="card p-4 mb-5">
          <a
            href={project.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            <ExternalLink size={14} />
            参考链接
          </a>
        </div>
      )}

      {project.relatedTrends.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center ring-1 ring-emerald-500/20">
              <TrendingUp size={14} className="text-emerald-400" />
            </div>
            <h2 className="text-sm font-semibold text-slate-100">相关行业趋势</h2>
            <span className="text-xs text-slate-500">({project.relatedTrends.length})</span>
          </div>
          <div className="grid gap-2">
            {project.relatedTrends.map((t) => (
              <Link
                key={t.id}
                to={`/explore/trends/${t.id}`}
                className="card-interactive p-3"
              >
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-950/40 text-emerald-300 border border-emerald-900/30">
                    {t.category}
                  </span>
                  <span className="ml-auto text-[10px] font-bold text-emerald-400">
                    {t.relevanceBase}/10+
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-100">{t.title}</p>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t.description}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4">
        <CrossRefBlock data={project.relatedByTags} />
      </div>
    </div>
  )
}
