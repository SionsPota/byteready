import { Link } from 'react-router-dom'
import { Tag as TagIcon, Star, Award, TrendingUp, BookOpen, Rocket, ChevronRight } from 'lucide-react'

export interface CrossRefExperience {
  id: string
  title: string
  companyName: string | null
  companyColor: string | null
  interviewRound: string | null
}

export interface CrossRefTrend {
  id: string
  title: string
  category: string
  relevanceBase: number
}

export interface CrossRefProject {
  id: string
  name: string
  description: string
  language: string | null
  stars: number | null
  impactScore: number
}

export interface CrossRefQuestion {
  id: number
  question: string
  answerPreview: string
}

export interface RelatedByTags {
  experiences: CrossRefExperience[]
  trends: CrossRefTrend[]
  projects: CrossRefProject[]
  questions: CrossRefQuestion[]
}

const TYPE_CONFIG = {
  experiences: { label: '面经', icon: BookOpen, color: 'text-purple-400', bg: 'bg-purple-950/40', border: 'border-purple-800/30', hover: 'hover:border-purple-700/50' },
  trends: { label: '趋势', icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-950/40', border: 'border-emerald-800/30', hover: 'hover:border-emerald-700/50' },
  projects: { label: '项目', icon: Rocket, color: 'text-amber-400', bg: 'bg-amber-950/40', border: 'border-amber-800/30', hover: 'hover:border-amber-700/50' },
  questions: { label: '题库', icon: Award, color: 'text-rose-400', bg: 'bg-rose-950/40', border: 'border-rose-800/30', hover: 'hover:border-rose-700/50' },
}

export function CrossRefBlock({ data }: { data: RelatedByTags }) {
  const total =
    data.experiences.length +
    data.trends.length +
    data.projects.length +
    data.questions.length
  if (total === 0) return null

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center ring-1 ring-purple-500/10">
          <TagIcon size={16} className="text-purple-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-100">标签关联</h2>
          <p className="text-[11px] text-slate-500">通过相同标签找到 {total} 条相关内容</p>
        </div>
      </div>

      <div className="grid gap-2">
        {data.experiences.map((e) => (
          <Link
            key={`exp-${e.id}`}
            to={`/explore/experiences/${e.id}`}
            className={`flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-800 ${TYPE_CONFIG.experiences.hover} hover:bg-slate-800/30 transition-all group`}
          >
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${TYPE_CONFIG.experiences.bg} ${TYPE_CONFIG.experiences.color} border ${TYPE_CONFIG.experiences.border} shrink-0`}>
              面经
            </span>
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
            <span className="text-sm text-slate-200 truncate flex-1 group-hover:text-purple-200 transition-colors">{e.title}</span>
            <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all shrink-0" />
          </Link>
        ))}

        {data.trends.map((t) => (
          <Link
            key={`tr-${t.id}`}
            to={`/explore/trends/${t.id}`}
            className={`flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-800 ${TYPE_CONFIG.trends.hover} hover:bg-slate-800/30 transition-all group`}
          >
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${TYPE_CONFIG.trends.bg} ${TYPE_CONFIG.trends.color} border ${TYPE_CONFIG.trends.border} shrink-0`}>
              趋势
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 shrink-0">{t.category}</span>
            <span className="text-sm text-slate-200 truncate flex-1 group-hover:text-emerald-200 transition-colors">{t.title}</span>
            <span className="text-[10px] text-emerald-400 font-bold shrink-0">{t.relevanceBase}/10</span>
            <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all shrink-0" />
          </Link>
        ))}

        {data.projects.map((p) => (
          <Link
            key={`pj-${p.id}`}
            to={`/explore/projects/${p.id}`}
            className={`flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-800 ${TYPE_CONFIG.projects.hover} hover:bg-slate-800/30 transition-all group`}
          >
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${TYPE_CONFIG.projects.bg} ${TYPE_CONFIG.projects.color} border ${TYPE_CONFIG.projects.border} shrink-0`}>
              项目
            </span>
            {p.language && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 shrink-0">
                {p.language}
              </span>
            )}
            {p.stars != null && (
              <span className="text-[10px] text-yellow-500 flex items-center gap-0.5 shrink-0">
                <Star size={9} />
                {p.stars >= 1000 ? `${Math.round(p.stars / 100) / 10}k` : p.stars}
              </span>
            )}
            <span className="text-sm text-slate-200 truncate flex-1 group-hover:text-amber-200 transition-colors">{p.name}</span>
            <span className="text-[10px] text-amber-400 font-bold shrink-0">{p.impactScore}/10</span>
            <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all shrink-0" />
          </Link>
        ))}

        {data.questions.map((q) => (
          <Link
            key={`qa-${q.id}`}
            to={`/explore/questions?q=${encodeURIComponent(q.question.slice(0, 30))}#${q.id}`}
            className={`flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-800 ${TYPE_CONFIG.questions.hover} hover:bg-slate-800/30 transition-all group`}
          >
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${TYPE_CONFIG.questions.bg} ${TYPE_CONFIG.questions.color} border ${TYPE_CONFIG.questions.border} shrink-0 flex items-center gap-0.5 mt-0.5`}>
              <Award size={9} />
              题库
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-200 truncate group-hover:text-rose-200 transition-colors">{q.question}</p>
              <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{q.answerPreview}</p>
            </div>
            <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
          </Link>
        ))}
      </div>
    </div>
  )
}
