import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Rocket, Sparkles, Star, ExternalLink } from 'lucide-react'
import { useApi } from '../hooks/useApi.ts'

type ProjectType = 'quick_win' | 'weekend_build' | 'deep_dive'
type Difficulty = 'beginner' | 'intermediate' | 'advanced'

interface LearningProject {
  id: string
  name: string
  projectType: ProjectType | null
  difficulty: Difficulty | null
  techStack: string[]
  gapAddressed: string | null
  description: string
  impactScore: number
  relatedRole: string | null
  githubUrl: string | null
  stars: number | null
  forks: number | null
  language: string | null
  category: string | null
  tags: string[]
  isInterviewRelated: boolean
  score?: number
}

interface RecommendData {
  items: LearningProject[]
  role: string | null
  gaps: string[]
}

interface ResumeSummary {
  id: string
  title: string
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

export function ExploreProjectsPage() {
  const [activeType, setActiveType] = useState<ProjectType | null>(null)
  const [activeLanguage, setActiveLanguage] = useState<string | null>(null)
  const [useRecommend, setUseRecommend] = useState(false)

  const { data: resumes } = useApi<ResumeSummary[]>('/api/resumes', { ttl: 60_000 })
  const firstResumeId = resumes?.[0]?.id

  const { data: allProjects, loading } = useApi<LearningProject[]>(
    '/api/explore/projects',
    { ttl: 60_000 },
  )
  const { data: recommended } = useApi<RecommendData>(
    useRecommend && firstResumeId
      ? `/api/explore/projects/recommend?resumeId=${firstResumeId}`
      : null,
    { ttl: 30_000 },
  )

  const projects = useRecommend && recommended ? recommended.items : allProjects ?? []

  const languages = Array.from(
    new Set(projects.map((p) => p.language).filter((l): l is string => Boolean(l))),
  ).sort()

  let filtered = activeType ? projects.filter((p) => p.projectType === activeType) : projects
  if (activeLanguage) filtered = filtered.filter((p) => p.language === activeLanguage)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Rocket className="text-amber-400" size={22} />
            学习项目
          </h1>
          <p className="text-sm text-slate-500 mt-1">可复刻的 GitHub 项目库 + 原创项目模板</p>
        </div>
        <Link to="/explore" className="text-sm text-slate-400 hover:text-slate-200">
          返回探索
        </Link>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-3 mb-4 flex items-center justify-between">
        <span className="text-sm text-slate-400">
          {firstResumeId ? '可基于你的简历推荐相关项目' : '上传简历后可解锁个性化推荐'}
        </span>
        <button
          disabled={!firstResumeId}
          onClick={() => setUseRecommend((v) => !v)}
          className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
            useRecommend
              ? 'bg-amber-600 text-white hover:bg-amber-500'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <Sparkles size={12} className="inline mr-1" />
          {useRecommend ? '已按简历推荐' : '按简历推荐'}
        </button>
      </div>

      {useRecommend && recommended && (
        <div className="rounded-lg border border-amber-900/40 bg-amber-950/10 p-3 mb-4 text-sm">
          <span className="text-amber-400">推荐角色：</span>
          <span className="text-slate-200 mr-3">{recommended.role ?? '未识别'}</span>
          {recommended.gaps.length > 0 && (
            <>
              <span className="text-amber-400">缺口：</span>
              <span className="text-slate-300">{recommended.gaps.join('、')}</span>
            </>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-3">
        <span className="text-xs text-slate-600 self-center mr-1">类型：</span>
        <button
          onClick={() => setActiveType(null)}
          className={`px-3 py-1 rounded-md text-xs ${
            activeType === null
              ? 'bg-slate-800 text-slate-100'
              : 'bg-slate-900 text-slate-500 hover:text-slate-300'
          }`}
        >
          全部 ({projects.length})
        </button>
        {(Object.keys(TYPE_LABELS) as ProjectType[]).map((k) => {
          const count = projects.filter((p) => p.projectType === k).length
          return (
            <button
              key={k}
              onClick={() => setActiveType(k === activeType ? null : k)}
              className={`px-3 py-1 rounded-md text-xs ${
                activeType === k
                  ? 'bg-slate-800 text-slate-100'
                  : 'bg-slate-900 text-slate-500 hover:text-slate-300'
              }`}
            >
              {TYPE_LABELS[k].label} ({count})
            </button>
          )
        })}
      </div>

      {languages.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-xs text-slate-600 self-center mr-1">语言：</span>
          <button
            onClick={() => setActiveLanguage(null)}
            className={`px-3 py-1 rounded-md text-xs ${
              activeLanguage === null
                ? 'bg-slate-800 text-slate-100'
                : 'bg-slate-900 text-slate-500 hover:text-slate-300'
            }`}
          >
            全部
          </button>
          {languages.map((l) => (
            <button
              key={l}
              onClick={() => setActiveLanguage(l === activeLanguage ? null : l)}
              className={`px-3 py-1 rounded-md text-xs ${
                activeLanguage === l
                  ? 'bg-slate-800 text-slate-100'
                  : 'bg-slate-900 text-slate-500 hover:text-slate-300'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      )}

      {loading && projects.length === 0 ? (
        <p className="text-slate-500">加载中...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-800 rounded-lg">
          <p className="text-slate-500">没有匹配的项目</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <Link
              key={p.id}
              to={`/explore/projects/${p.id}`}
              className="block p-5 rounded-lg border border-slate-800 bg-slate-900 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    {p.projectType && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded border ${TYPE_LABELS[p.projectType].color}`}
                      >
                        {TYPE_LABELS[p.projectType].label}
                      </span>
                    )}
                    {p.difficulty && (
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {DIFFICULTY_LABELS[p.difficulty]}
                      </span>
                    )}
                    {p.language && (
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {p.language}
                      </span>
                    )}
                    {p.category && (
                      <span className="text-xs text-slate-500">{p.category}</span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                    {p.name}
                    {p.githubUrl && (
                      <ExternalLink size={14} className="text-slate-500" />
                    )}
                  </h3>
                  <p className="text-sm text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {p.description}
                  </p>
                </div>
                <div className="ml-3 text-right shrink-0">
                  <div className="text-xl font-bold text-amber-400">
                    {p.score ?? p.impactScore}
                  </div>
                  <div className="text-xs text-slate-600">
                    {useRecommend ? '推荐分' : '影响分'}/10+
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800">
                <div className="flex flex-wrap gap-1.5">
                  {p.techStack.slice(0, 5).map((tech) => (
                    <span
                      key={tech}
                      className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300"
                    >
                      {tech}
                    </span>
                  ))}
                  {p.techStack.length > 5 && (
                    <span className="text-xs text-slate-500">+{p.techStack.length - 5}</span>
                  )}
                </div>
                {(p.stars != null || p.forks != null) && (
                  <div className="flex items-center gap-3 text-xs text-slate-500 shrink-0">
                    {p.stars != null && (
                      <span className="flex items-center gap-1">
                        <Star size={12} className="text-yellow-500" />
                        {p.stars.toLocaleString()}
                      </span>
                    )}
                    {p.forks != null && (
                      <span>Fork {p.forks.toLocaleString()}</span>
                    )}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
