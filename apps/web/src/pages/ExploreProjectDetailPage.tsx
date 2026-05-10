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

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-5 mb-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              {project.projectType && (
                <span
                  className={`text-xs px-2 py-0.5 rounded border ${TYPE_LABELS[project.projectType].color}`}
                >
                  {TYPE_LABELS[project.projectType].label}
                </span>
              )}
              {project.difficulty && (
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {DIFFICULTY_LABELS[project.difficulty]}
                </span>
              )}
              {project.language && (
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
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
              <Rocket size={20} className="text-amber-400" />
              {project.name}
            </h1>
            <p className="text-sm text-slate-400 mt-3 leading-relaxed">{project.description}</p>
          </div>
          <div className="ml-3 text-right shrink-0">
            <div className="text-3xl font-bold text-amber-400">{project.impactScore}</div>
            <div className="text-xs text-slate-600">影响分/10+</div>
          </div>
        </div>

        {(project.stars != null || project.forks != null || project.githubUrl) && (
          <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-slate-800 text-sm">
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-purple-400 hover:underline"
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

        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-800">
          {project.techStack.map((t) => (
            <span key={t} className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              {t}
            </span>
          ))}
          {project.gapAddressed && (
            <span className="text-xs px-2 py-0.5 rounded bg-purple-950/30 border border-purple-800/30 text-purple-300 flex items-center gap-1">
              <Target size={10} />
              {project.gapAddressed}
            </span>
          )}
        </div>

        {project.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-800 items-center">
            <TagIcon size={12} className="text-slate-500" />
            {project.tags.map((t) => (
              <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-cyan-950/30 text-cyan-300">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {project.learningPath && (
        <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/10 p-5 mb-4">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-2 text-emerald-400">
            <BookOpen size={14} />
            学习路径建议
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
            {project.learningPath}
          </p>
        </div>
      )}

      {project.coreFeatures.length > 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-5 mb-4">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <CheckCircle2 size={14} className="text-cyan-400" />
            核心功能
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {project.coreFeatures.map((f, i) => (
              <span
                key={i}
                className="text-sm px-3 py-2 rounded bg-slate-800/60 text-slate-300"
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {project.techHighlights.length > 0 && (
        <div className="rounded-lg border border-cyan-900/40 bg-cyan-950/10 p-5 mb-4">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-3 text-cyan-400">
            <Star size={14} />
            技术亮点
          </h2>
          <ul className="space-y-2">
            {project.techHighlights.map((h, i) => (
              <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">·</span>
                {h}
              </li>
            ))}
          </ul>
        </div>
      )}

      {project.implementationSteps.length > 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-5 mb-4">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <Rocket size={14} className="text-amber-400" />
            实现步骤
          </h2>
          <div className="space-y-2">
            {project.implementationSteps.map((s, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-slate-300">
                <span className="w-6 h-6 rounded-full bg-slate-800 text-xs flex items-center justify-center text-slate-400 shrink-0">
                  {i + 1}
                </span>
                {s}
              </div>
            ))}
          </div>
        </div>
      )}

      {project.resumeTemplate && (
        <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/10 p-5 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold flex items-center gap-2 text-emerald-400">
              <Star size={14} />
              简历描述模板
            </h2>
            <button
              onClick={handleCopy}
              className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center gap-1"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? '已复制' : '复制'}
            </button>
          </div>
          <p className="text-sm text-slate-300 italic leading-relaxed">{project.resumeTemplate}</p>
        </div>
      )}

      {project.sourceUrl && project.sourceUrl !== project.githubUrl && (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 mb-4">
          <a
            href={project.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-purple-400 hover:underline"
          >
            <ExternalLink size={14} />
            参考链接
          </a>
        </div>
      )}

      {project.relatedTrends.length > 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-emerald-400" />
            相关行业趋势
          </h2>
          <div className="grid gap-3">
            {project.relatedTrends.map((t) => (
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
