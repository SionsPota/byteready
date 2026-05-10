import { useCallback, useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  RotateCcw,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Target,
  Lightbulb,
  FileText,
  BarChart3,
  TrendingUp,
  Sparkles,
  Zap,
  User,
  Bot,
  HelpCircle,
  Settings,
} from 'lucide-react'

interface ScoreEntry {
  dimension: string
  score: number
  weight: number
  weighted: number
  evidence: string
}

interface ImprovementEntry {
  priority: string
  suggestion: string
  relatedTurnIndex?: number
}

interface PhaseReview {
  id: string
  phaseType: string
  phaseIndex: number
  scores: ScoreEntry[]
  totalScore: number | null
  evaluation: string
  interviewerReflection: string
  improvementSuggestions: ImprovementEntry[]
  rubricVersion: string | null
  coachVersion: string | null
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

interface TrainingTurn {
  id: string
  index: number
  kind: string
  text: string
  phase: string | null
  state: string | null
  projectId: string | null
  topic: string | null
  questionId: string | null
  createdAt: number
}

interface TrainingInfo {
  id: string
  type: string
  position: string
  targetCompany: string | null
  status: string
  reviewStatus: string
  reviewProgress: string | null
  reviewError: string | null
  reviewStartedAt: number | null
  reviewFinishedAt: number | null
  createdAt: number
  turns: TrainingTurn[]
}

const PHASE_LABELS: Record<string, string> = {
  self_intro: '自我介绍',
  project_qa: '项目问答',
  random_qa: '随机问答',
}

const PHASE_CONFIG: Record<string, { color: string; bg: string; border: string; iconBg: string }> = {
  self_intro: {
    color: 'text-sky-400',
    bg: 'bg-sky-950/30',
    border: 'border-sky-800/40',
    iconBg: 'from-sky-500/15 to-sky-600/5',
  },
  project_qa: {
    color: 'text-amber-400',
    bg: 'bg-amber-950/30',
    border: 'border-amber-800/40',
    iconBg: 'from-amber-500/15 to-amber-600/5',
  },
  random_qa: {
    color: 'text-purple-400',
    bg: 'bg-purple-950/30',
    border: 'border-purple-800/40',
    iconBg: 'from-purple-500/15 to-purple-600/5',
  },
}

const PRIORITY_CONFIG: Record<string, { label: string; cls: string; dot: string }> = {
  high: {
    label: '高',
    cls: 'bg-red-950/50 text-red-400 border-red-800/40',
    dot: 'bg-red-500',
  },
  medium: {
    label: '中',
    cls: 'bg-amber-950/50 text-amber-400 border-amber-800/40',
    dot: 'bg-amber-500',
  },
  low: {
    label: '低',
    cls: 'bg-slate-800/60 text-slate-400 border-slate-700',
    dot: 'bg-slate-500',
  },
}

const TURN_KIND_CONFIG: Record<string, { label: string; cls: string; icon: typeof User }> = {
  candidate: { label: '候选人', cls: 'bg-blue-950/60 text-blue-400 border-blue-800/40', icon: User },
  interviewer_main: { label: '面试官', cls: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40', icon: Bot },
  interviewer_followup: { label: '追问', cls: 'bg-amber-950/60 text-amber-400 border-amber-800/40', icon: HelpCircle },
  system: { label: '系统', cls: 'bg-slate-800 text-slate-400 border-slate-700', icon: Settings },
}

function ScoreBar({ score, max = 5 }: { score: number; max?: number }) {
  const pct = Math.min(100, Math.max(0, (score / max) * 100))
  let color = 'bg-emerald-500'
  if (score < max * 0.6) color = 'bg-red-500'
  else if (score < max * 0.8) color = 'bg-amber-500'
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-bold text-slate-200 w-12 text-right">{score.toFixed(1)}</span>
    </div>
  )
}

export function ReviewPage() {
  const { id } = useParams()
  const [training, setTraining] = useState<TrainingInfo | null>(null)
  const [phaseReviews, setPhaseReviews] = useState<PhaseReview[]>([])
  const [fullReview, setFullReview] = useState<FullReview | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'phases' | 'full'>('phases')
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set())
  const [showTranscript, setShowTranscript] = useState(false)

  const loadAll = useCallback(async () => {
    if (!id) return
    try {
      const [trainingRes, phaseRes, fullRes] = await Promise.all([
        fetch(`/api/training/${id}`, { credentials: 'include' }).then((r) => r.json()),
        fetch(`/api/training/${id}/phase-reviews`, { credentials: 'include' }).then((r) => r.json()),
        fetch(`/api/training/${id}/full-review`, { credentials: 'include' }).then((r) => r.json()),
      ])
      if (trainingRes.success) setTraining(trainingRes.data)
      if (phaseRes.success) setPhaseReviews(phaseRes.data)
      if (fullRes.success) setFullReview(fullRes.data)
    } catch {
      // 静默：继续展示上次数据
    }
  }, [id])

  useEffect(() => {
    void loadAll().then(() => setLoading(false))
  }, [loadAll])

  useEffect(() => {
    if (training?.reviewStatus === 'generating') {
      const timer = setInterval(() => void loadAll(), 2000)
      return () => clearInterval(timer)
    }
  }, [training?.reviewStatus, loadAll])

  const handleRegenerate = async () => {
    if (!id) return
    if (!confirm('确定重新生成复盘报告？这将清空已有的复盘数据并重新触发 LLM 调用。')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/training/${id}/regenerate-review`, {
        method: 'POST',
        credentials: 'include',
      })
      const json = await res.json()
      if (json.success) {
        setPhaseReviews([])
        setFullReview(null)
        await loadAll()
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const togglePhase = (phaseId: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev)
      if (next.has(phaseId)) next.delete(phaseId)
      else next.add(phaseId)
      return next
    })
  }

  const getTurnsForPhase = (phaseType: string): TrainingTurn[] => {
    if (!training) return []
    const phaseMap: Record<string, string> = {
      self_intro: 'self_intro',
      project_qa: 'project_single',
      random_qa: 'q_and_a',
    }
    const targetPhase = phaseMap[phaseType]
    return training.turns.filter((t) => t.phase === targetPhase)
  }

  const renderTurnKind = (kind: string) => {
    const config = (TURN_KIND_CONFIG[kind] || TURN_KIND_CONFIG.system)!
    const Icon = config.icon
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border ${config.cls}`}>
        <Icon size={10} />
        {config.label}
      </span>
    )
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-slate-700 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  )
  if (!training) return <p className="text-slate-500">模拟记录不存在</p>

  const isFullInterview = training.type === 'full'
  const phaseCfg = (PHASE_CONFIG[training.type] || PHASE_CONFIG.random_qa)!

  return (
    <div className="animate-fade-in space-y-6">
      {/* Back + Header */}
      <Link to="/reviews" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors">
        <ArrowLeft size={14} />
        返回复盘列表
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${phaseCfg.iconBg} flex items-center justify-center`}>
              <BarChart3 size={16} className={phaseCfg.color} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isFullInterview ? '整面复盘' : `${PHASE_LABELS[training.type] || '模拟'}复盘`}
            </h1>
          </div>
          <p className="text-sm text-slate-500">
            {training.targetCompany ? training.targetCompany + ' · ' : ''}
            {new Date(training.createdAt).toLocaleDateString('zh-CN')}
          </p>
        </div>
        <button
          onClick={handleRegenerate}
          className="btn-secondary text-xs self-start"
        >
          <RotateCcw size={12} />
          重新生成
        </button>
      </div>

      {/* 复盘生成状态横幅 */}
      {training.reviewStatus === 'generating' && (
        <div className="card-elevated p-4 border-l-4 border-l-emerald-500 flex items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-emerald-300 font-medium">
              正在生成复盘报告
              {training.reviewProgress ? `：${training.reviewProgress}` : ''}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">AI 正在分析对话内容，请稍候...</p>
          </div>
        </div>
      )}
      {training.reviewStatus === 'failed' && (
        <div className="card-elevated p-4 border-l-4 border-l-red-500 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-400" />
            <p className="text-sm text-red-300 font-medium">
              复盘生成失败{training.reviewError ? `：${training.reviewError}` : ''}
            </p>
          </div>
          <button
            onClick={handleRegenerate}
            className="btn-secondary text-xs border-red-900/40 hover:border-red-800/60 hover:text-red-400 hover:bg-red-950/20"
          >
            <RotateCcw size={12} />
            重新生成
          </button>
        </div>
      )}
      {training.reviewStatus === 'partial' && (
        <div className="card-elevated p-4 border-l-4 border-l-amber-500 space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-400" />
            <p className="text-sm text-amber-300 font-medium">
              部分复盘生成失败{training.reviewError ? `：${training.reviewError}` : ''}
            </p>
          </div>
          <button
            onClick={handleRegenerate}
            className="btn-secondary text-xs border-amber-900/40 hover:border-amber-800/60 hover:text-amber-400 hover:bg-amber-950/20"
          >
            <RotateCcw size={12} />
            重新生成
          </button>
        </div>
      )}

      {/* 原始对话记录开关 */}
      {training.turns.length > 0 && (
        <div className="card p-4">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors w-full"
          >
            <div className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${showTranscript ? 'bg-slate-700' : 'bg-slate-800/60'}`}>
              <MessageSquare size={14} />
            </div>
            <span className="flex-1 text-left">{showTranscript ? '隐藏原始对话' : '查看原始对话'}</span>
            {showTranscript ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          <div className={`overflow-hidden transition-all duration-300 ${showTranscript ? 'max-h-[2000px] mt-4 pt-4 border-t border-slate-800/60' : 'max-h-0'}`}>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {training.turns.map((turn) => (
                <div key={turn.id} className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">{renderTurnKind(turn.kind)}</div>
                  <p className="text-sm text-slate-300 leading-relaxed">{turn.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 标签切换（仅整面） */}
      {isFullInterview && (
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('phases')}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
              activeTab === 'phases'
                ? 'border-emerald-500/50 text-emerald-400 bg-emerald-950/40 ring-1 ring-emerald-500/20'
                : 'border-slate-800 text-slate-400 hover:border-slate-600'
            }`}
          >
            阶段复盘 ({phaseReviews.length})
          </button>
          {fullReview && (
            <button
              onClick={() => setActiveTab('full')}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                activeTab === 'full'
                  ? 'border-emerald-500/50 text-emerald-400 bg-emerald-950/40 ring-1 ring-emerald-500/20'
                  : 'border-slate-800 text-slate-400 hover:border-slate-600'
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
            <div className="text-center py-12 card border-dashed">
              <Sparkles size={24} className="mx-auto text-slate-600 mb-3" />
              {training.reviewStatus === 'generating' || training.reviewStatus === 'idle' ? (
                <>
                  <p className="text-slate-500">复盘报告生成中...</p>
                  <p className="text-sm text-slate-600 mt-1">AI 正在分析你的表现</p>
                </>
              ) : training.reviewStatus === 'failed' ? (
                <>
                  <p className="text-slate-500">复盘生成失败</p>
                  <p className="text-sm text-slate-600 mt-1">请检查上方错误提示并重试</p>
                </>
              ) : (
                <>
                  <p className="text-slate-500">暂无复盘数据</p>
                  <p className="text-sm text-slate-600 mt-1">本阶段未产生有效对话</p>
                  {training.status === 'ended' && (
                    <button
                      onClick={handleRegenerate}
                      className="btn-secondary text-xs mt-3"
                    >
                      <RotateCcw size={12} />
                      重新生成复盘
                    </button>
                  )}
                </>
              )}
            </div>
          ) : (
            phaseReviews.map((pr) => {
              const phaseTurns = getTurnsForPhase(pr.phaseType)
              const cfg = (PHASE_CONFIG[pr.phaseType] || PHASE_CONFIG.random_qa)!
              const isExpanded = expandedPhases.has(pr.id)
              return (
                <div key={pr.id} className={`card overflow-hidden ${isExpanded ? 'ring-1 ring-slate-700/50' : ''}`}>
                  <button
                    onClick={() => togglePhase(pr.id)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-800/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cfg.iconBg} flex items-center justify-center shrink-0`}>
                        <BarChart3 size={16} className={cfg.color} />
                      </div>
                      <div>
                        <span className={`font-semibold ${cfg.color}`}>
                          {PHASE_LABELS[pr.phaseType] || pr.phaseType}
                        </span>
                        {pr.totalScore !== null && pr.totalScore > 0 && (
                          <span className="text-sm text-emerald-400 font-bold ml-2">
                            {pr.totalScore.toFixed(1)} / 5.0
                          </span>
                        )}
                      </div>
                      {pr.coachVersion && (
                        <span className="text-[10px] text-slate-600 ml-2">{pr.coachVersion}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {pr.totalScore !== null && (
                        <div className="hidden sm:flex items-center gap-2 mr-2">
                          <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${(pr.totalScore / 5) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {isExpanded ? (
                        <ChevronUp size={16} className="text-slate-500" />
                      ) : (
                        <ChevronDown size={16} className="text-slate-500" />
                      )}
                    </div>
                  </button>

                  <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[3000px]' : 'max-h-0'}`}>
                    <div className="px-4 pb-5 space-y-5 border-t border-slate-800/60">
                      <div className="pt-4 space-y-5">
                        {/* 各维度评分 - 卡片网格 */}
                        {pr.scores.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-sky-500/10 flex items-center justify-center ring-1 ring-sky-500/20">
                                <Target size={14} className="text-sky-400" />
                              </div>
                              <h4 className="text-sm font-semibold text-slate-100">各维度评分</h4>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {pr.scores.map((s, i) => (
                                <div key={i} className="card p-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-slate-200 font-medium">{s.dimension}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">权重 {s.weight}</span>
                                  </div>
                                  <ScoreBar score={s.score} />
                                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">{s.evidence}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 评价 - QuoteBlock */}
                        <div className="card-elevated p-4 border-l-4 border-l-sky-500">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-7 h-7 rounded-lg bg-sky-500/10 flex items-center justify-center ring-1 ring-sky-500/20">
                              <FileText size={14} className="text-sky-400" />
                            </div>
                            <h4 className="text-sm font-semibold text-sky-400">阶段评价</h4>
                          </div>
                          <p className="text-sm text-slate-300 leading-relaxed">{pr.evaluation}</p>
                        </div>

                        {/* 面试官反思 - QuoteBlock */}
                        <div className="card-elevated p-4 border-l-4 border-l-amber-500">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center ring-1 ring-amber-500/20">
                              <Lightbulb size={14} className="text-amber-400" />
                            </div>
                            <h4 className="text-sm font-semibold text-amber-400">面试官反思</h4>
                          </div>
                          <p className="text-sm text-slate-300 leading-relaxed">{pr.interviewerReflection}</p>
                        </div>

                        {/* 改进建议 - 按优先级分组卡片 */}
                        {pr.improvementSuggestions.length > 0 && (
                          <div className="card-elevated p-4 border-l-4 border-l-emerald-500">
                            <div className="flex items-center gap-2 mb-4">
                              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center ring-1 ring-emerald-500/20">
                                <Zap size={14} className="text-emerald-400" />
                              </div>
                              <h4 className="text-sm font-semibold text-emerald-400">改进建议</h4>
                            </div>
                            <div className="space-y-2">
                              {pr.improvementSuggestions.map((imp, i) => {
                                const pcfg = (PRIORITY_CONFIG[imp.priority] || PRIORITY_CONFIG.low)!
                                return (
                                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/30 border border-slate-800/60">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-md border shrink-0 mt-0.5 flex items-center gap-1 ${pcfg.cls}`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${pcfg.dot}`} />
                                      {pcfg.label}
                                    </span>
                                    <p className="text-sm text-slate-300 leading-relaxed">{imp.suggestion}</p>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* 本阶段原始对话 - Card */}
                        {phaseTurns.length > 0 && (
                          <div className="card p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center">
                                <MessageSquare size={14} className="text-slate-400" />
                              </div>
                              <h4 className="text-sm font-semibold text-slate-100">本阶段对话</h4>
                            </div>
                            <div className="space-y-2 p-3 rounded-lg bg-slate-950/30 border border-slate-800/60">
                              {phaseTurns.map((turn) => (
                                <div key={turn.id} className="flex items-start gap-2">
                                  <div className="mt-0.5 shrink-0">{renderTurnKind(turn.kind)}</div>
                                  <p className="text-xs text-slate-400 leading-relaxed">{turn.text}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 生成时间 */}
                        <p className="text-[11px] text-slate-600 pt-1">
                          生成于 {new Date(pr.generatedAt).toLocaleString('zh-CN')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* 整面复盘 */}
      {activeTab === 'full' && fullReview && (
        <div className="space-y-5">
          {/* 整体分数展示 - 大号卡片 */}
          {fullReview.overallScore !== null && (
            <div className="card-elevated p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 flex items-center justify-center mx-auto mb-3 ring-1 ring-emerald-500/20">
                <BarChart3 size={28} className="text-emerald-400" />
              </div>
              <p className="text-5xl font-bold text-emerald-400 mb-1">{fullReview.overallScore.toFixed(1)}</p>
              <p className="text-sm text-slate-500">整面总分 / 5.0</p>
              <div className="mt-4 max-w-xs mx-auto">
                <ScoreBar score={fullReview.overallScore} />
              </div>
            </div>
          )}

          {/* 各阶段得分汇总 - 条形图卡片 */}
          {fullReview.phaseScoresSummary.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-sky-500/10 flex items-center justify-center ring-1 ring-sky-500/20">
                  <BarChart3 size={14} className="text-sky-400" />
                </div>
                <h3 className="font-semibold text-slate-100">各阶段表现</h3>
              </div>
              <div className="space-y-4">
                {fullReview.phaseScoresSummary.map((ps) => (
                  <div key={ps.phaseType} className="p-3 rounded-lg bg-slate-950/30 border border-slate-800/60">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-200 font-medium">{PHASE_LABELS[ps.phaseType] || ps.phaseType}</span>
                      <span className="text-sm font-bold text-sky-400">{ps.score.toFixed(1)}</span>
                    </div>
                    <ScoreBar score={ps.score} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 整面额外评价 - 2列大数字卡片 */}
          <div className="grid grid-cols-2 gap-4">
            {fullReview.coherenceScore !== null && (
              <div className="card p-5 text-center">
                <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center mx-auto mb-2 ring-1 ring-sky-500/20">
                  <TrendingUp size={20} className="text-sky-400" />
                </div>
                <p className="text-3xl font-bold text-sky-400 mb-1">{fullReview.coherenceScore.toFixed(1)}</p>
                <p className="text-xs text-slate-500">阶段间连贯性</p>
              </div>
            )}
            {fullReview.jdMatchScore !== null && (
              <div className="card p-5 text-center">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mx-auto mb-2 ring-1 ring-amber-500/20">
                  <Target size={20} className="text-amber-400" />
                </div>
                <p className="text-3xl font-bold text-amber-400 mb-1">{fullReview.jdMatchScore.toFixed(1)}</p>
                <p className="text-xs text-slate-500">JD 匹配度</p>
              </div>
            )}
          </div>

          {/* 整体技术画像 - QuoteBlock */}
          {fullReview.overallPersona && (
            <div className="card-elevated p-5 border-l-4 border-l-purple-500">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center ring-1 ring-purple-500/20">
                  <User size={14} className="text-purple-400" />
                </div>
                <h3 className="font-semibold text-purple-400">整体技术画像</h3>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{fullReview.overallPersona}</p>
            </div>
          )}

          {/* 优先级提升建议 - 分组卡片 */}
          {fullReview.consolidatedImprovements.length > 0 && (
            <div className="card-elevated p-5 border-l-4 border-l-emerald-500">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center ring-1 ring-emerald-500/20">
                  <Zap size={14} className="text-emerald-400" />
                </div>
                <h3 className="font-semibold text-emerald-400">优先级提升建议</h3>
              </div>
              <div className="space-y-3">
                {fullReview.consolidatedImprovements.map((imp, i) => {
                  const pcfg = (PRIORITY_CONFIG[imp.priority] || PRIORITY_CONFIG.low)!
                  return (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/30 border border-slate-800/60">
                      <span className={`text-[10px] px-2 py-0.5 rounded-md border shrink-0 mt-0.5 flex items-center gap-1 ${pcfg.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${pcfg.dot}`} />
                        {pcfg.label}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm text-slate-300 leading-relaxed">{imp.suggestion}</p>
                        <p className="text-[11px] text-slate-600 mt-1">
                          来源：{imp.sourcePhases.map((p) => PHASE_LABELS[p] || p).join('、')}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 总评 - QuoteBlock */}
          <div className="card-elevated p-5 border-l-4 border-l-emerald-500">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center ring-1 ring-emerald-500/20">
                <CheckCircle2 size={14} className="text-emerald-400" />
              </div>
              <h3 className="font-semibold text-emerald-400">总评</h3>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">{fullReview.overallEvaluation}</p>
          </div>
        </div>
      )}
    </div>
  )
}
