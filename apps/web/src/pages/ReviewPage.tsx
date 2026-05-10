import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react'

interface PhaseReview {
  id: string
  phaseType: string
  phaseIndex: number
  totalScore: number | null
  evaluation: string
  interviewerReflection: string
  generatedAt: number
}

interface FullReview {
  id: string
  phaseScoresSummary: Array<{ phaseType: string; score: number; duration: number }>
  coherenceScore: number | null
  jdMatchScore: number | null
  overallPersona: string | null
  consolidatedImprovements: Array<{ priority: string; sourcePhases: string[]; suggestion: string }>
  overallEvaluation: string
  overallScore: number | null
  generatedAt: number
}

interface TrainingInfo {
  id: string
  type: string
  position: string
  targetCompany: string | null
  status: string
  createdAt: number
}

const PHASE_LABELS: Record<string, string> = {
  self_intro: '自我介绍',
  project_qa: '项目问答',
  random_qa: '随机问答',
}

const PHASE_COLORS: Record<string, string> = {
  self_intro: 'text-blue-400',
  project_qa: 'text-amber-400',
  random_qa: 'text-purple-400',
}

export function ReviewPage() {
  const { id } = useParams()
  const [training, setTraining] = useState<TrainingInfo | null>(null)
  const [phaseReviews, setPhaseReviews] = useState<PhaseReview[]>([])
  const [fullReview, setFullReview] = useState<FullReview | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'phases' | 'full'>('phases')
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!id) return

    Promise.all([
      fetch(`/api/training/${id}`, { credentials: 'include' }).then((r) => r.json()),
      fetch(`/api/training/${id}/phase-reviews`, { credentials: 'include' }).then((r) => r.json()),
      fetch(`/api/training/${id}/full-review`, { credentials: 'include' }).then((r) => r.json()),
    ])
      .then(([trainingRes, phaseRes, fullRes]) => {
        if (trainingRes.success) setTraining(trainingRes.data)
        if (phaseRes.success) setPhaseReviews(phaseRes.data)
        if (fullRes.success) setFullReview(fullRes.data)
      })
      .finally(() => setLoading(false))
  }, [id])

  const togglePhase = (phaseId: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev)
      if (next.has(phaseId)) next.delete(phaseId)
      else next.add(phaseId)
      return next
    })
  }

  if (loading) return <p className="text-slate-500">加载中...</p>
  if (!training) return <p className="text-slate-500">训练记录不存在</p>

  const isFullInterview = training.type === 'full'

  return (
    <div>
      <Link to="/reviews" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-300 mb-4">
        <ArrowLeft size={14} />
        返回复盘列表
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          {isFullInterview ? '整面复盘' : `${PHASE_LABELS[training.type] || '训练'}复盘`}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {training.position} {training.targetCompany ? `· ${training.targetCompany}` : ''}
          {' · '}
          {new Date(training.createdAt).toLocaleDateString('zh-CN')}
        </p>
      </div>

      {/* 标签切换（仅整面） */}
      {isFullInterview && (
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('phases')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'phases'
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-500'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-600'
            }`}
          >
            阶段复盘 ({phaseReviews.length})
          </button>
          {fullReview && (
            <button
              onClick={() => setActiveTab('full')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'full'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-500'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-600'
              }`}
            >
              整面复盘
            </button>
          )}
        </div>
      )}

      {/* 阶段复盘 */}
      {(activeTab === 'phases' || !isFullInterview) && (
        <div className="space-y-4">
          {phaseReviews.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-lg">
              <p className="text-slate-500">阶段复盘生成中...</p>
              <p className="text-sm text-slate-600 mt-1">请稍后刷新查看</p>
            </div>
          ) : (
            phaseReviews.map((pr) => (
              <div key={pr.id} className="rounded-lg border border-slate-800 bg-slate-900">
                <button
                  onClick={() => togglePhase(pr.id)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className={`font-medium ${PHASE_COLORS[pr.phaseType] || 'text-slate-300'}`}>
                      {PHASE_LABELS[pr.phaseType] || pr.phaseType}
                    </span>
                    {pr.totalScore !== null && pr.totalScore > 0 && (
                      <span className="text-sm text-emerald-400 font-bold">
                        {pr.totalScore.toFixed(1)} / 5.0
                      </span>
                    )}
                  </div>
                  {expandedPhases.has(pr.id) ? (
                    <ChevronUp size={16} className="text-slate-500" />
                  ) : (
                    <ChevronDown size={16} className="text-slate-500" />
                  )}
                </button>

                {expandedPhases.has(pr.id) && (
                  <div className="px-4 pb-4 space-y-4">
                    {/* 评价 */}
                    <div>
                      <h4 className="text-sm font-medium text-slate-400 mb-1">评价</h4>
                      <p className="text-sm text-slate-300">{pr.evaluation}</p>
                    </div>

                    {/* 面试官复盘 */}
                    <div>
                      <h4 className="text-sm font-medium text-slate-400 mb-1">面试官复盘</h4>
                      <p className="text-sm text-slate-300">{pr.interviewerReflection}</p>
                    </div>

                    {/* 生成时间 */}
                    <p className="text-xs text-slate-600">
                      生成于 {new Date(pr.generatedAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* 整面复盘 */}
      {activeTab === 'full' && fullReview && (
        <div className="space-y-6">
          {/* 各阶段得分汇总 */}
          {fullReview.phaseScoresSummary.length > 0 && (
            <div className="p-4 rounded-lg border border-slate-800 bg-slate-900">
              <h3 className="font-medium mb-3">各阶段表现</h3>
              <div className="space-y-2">
                {fullReview.phaseScoresSummary.map((ps) => (
                  <div key={ps.phaseType} className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">{PHASE_LABELS[ps.phaseType] || ps.phaseType}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${(ps.score / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-emerald-400 font-bold w-12 text-right">
                        {ps.score.toFixed(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 整面额外评价 */}
          <div className="grid grid-cols-2 gap-4">
            {fullReview.coherenceScore !== null && (
              <div className="p-4 rounded-lg border border-slate-800 bg-slate-900 text-center">
                <p className="text-xs text-slate-500 mb-1">阶段间连贯性</p>
                <p className="text-2xl font-bold text-blue-400">{fullReview.coherenceScore.toFixed(1)}</p>
              </div>
            )}
            {fullReview.jdMatchScore !== null && (
              <div className="p-4 rounded-lg border border-slate-800 bg-slate-900 text-center">
                <p className="text-xs text-slate-500 mb-1">JD 匹配度</p>
                <p className="text-2xl font-bold text-amber-400">{fullReview.jdMatchScore.toFixed(1)}%</p>
              </div>
            )}
          </div>

          {/* 整体技术画像 */}
          {fullReview.overallPersona && (
            <div className="p-4 rounded-lg border border-slate-800 bg-slate-900">
              <h3 className="font-medium mb-2">整体技术画像</h3>
              <p className="text-sm text-slate-300">{fullReview.overallPersona}</p>
            </div>
          )}

          {/* 优先级提升建议 */}
          {fullReview.consolidatedImprovements.length > 0 && (
            <div className="p-4 rounded-lg border border-slate-800 bg-slate-900">
              <h3 className="font-medium mb-3">优先级提升建议</h3>
              <div className="space-y-2">
                {fullReview.consolidatedImprovements.map((imp, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      imp.priority === 'high' ? 'bg-red-950 text-red-400' :
                      imp.priority === 'medium' ? 'bg-amber-950 text-amber-400' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {imp.priority === 'high' ? '高' : imp.priority === 'medium' ? '中' : '低'}
                    </span>
                    <p className="text-sm text-slate-300">{imp.suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 总评 */}
          <div className="p-4 rounded-lg border border-slate-800 bg-slate-900">
            <h3 className="font-medium mb-2">总评</h3>
            <p className="text-sm text-slate-300 leading-relaxed">{fullReview.overallEvaluation}</p>
            {fullReview.overallScore !== null && (
              <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-sm text-slate-500">整面总分</span>
                <span className="text-xl font-bold text-emerald-400">{fullReview.overallScore.toFixed(1)} / 5.0</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
