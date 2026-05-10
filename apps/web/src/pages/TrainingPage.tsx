import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Mic,
  Play,
  ArrowRight,
  History,
  FileText,
  AlertCircle,
  ChevronDown,
  Check,
  Sparkles,
  Building2,
  Briefcase,
  Layers,
} from 'lucide-react'
import { useApi } from '../hooks/useApi.ts'
import { invalidateKey } from '../lib/api.ts'

interface TrainingSummary {
  id: string
  position: string
  status: string
  currentState?: string
  type: string
  targetCompany?: string | null
  createdAt: number
}

interface ResumeOption {
  id: string
  title: string
}

interface ResumeProject {
  id: string
  name: string
  role: string | null
  period: string | null
}

interface ResumeDetail {
  id: string
  projects: ResumeProject[]
}

const TRAINING_TYPES = [
  { value: 'full', label: '整面面试', desc: '完整流程：自我介绍 → 项目问答 → 随机问答', icon: Sparkles },
  { value: 'self_intro', label: '自我介绍', desc: '仅练习自我介绍环节', icon: Mic },
  { value: 'project_qa', label: '项目问答', desc: '仅练习项目深挖与交叉追问', icon: Layers },
  { value: 'random_qa', label: '随机问答', desc: '仅练习技术问答（八股 / 算法 / 场景）', icon: Briefcase },
] as const

export function TrainingPage() {
  const navigate = useNavigate()

  const { data: sessions } = useApi<TrainingSummary[]>('/api/training', { ttl: 30_000 })
  const { data: resumes } = useApi<ResumeOption[]>('/api/resumes', { ttl: 30_000 })

  const runningSession = useMemo(
    () => (sessions ?? []).find((s) => s.status === 'running'),
    [sessions],
  )

  // 表单状态
  const [trainingType, setTrainingType] = useState<(typeof TRAINING_TYPES)[number]['value']>('full')
  const [targetCompany, setTargetCompany] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [resumeId, setResumeId] = useState('')
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // 简历加载完成后默认选中第一份
  useEffect(() => {
    if (resumes && resumes.length > 0 && !resumeId) {
      const first = resumes[0]
      if (first) setResumeId(first.id)
    }
  }, [resumes, resumeId])

  // 选中简历后加载该简历的项目
  const [resumeDetail, setResumeDetail] = useState<ResumeDetail | null>(null)
  const [resumeDetailLoading, setResumeDetailLoading] = useState(false)

  useEffect(() => {
    if (!resumeId) {
      setResumeDetail(null)
      setSelectedProjectIds([])
      return
    }
    let cancelled = false
    setResumeDetailLoading(true)
    fetch(`/api/resumes/${resumeId}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((res) => {
        if (cancelled) return
        if (res.success) {
          setResumeDetail({
            id: res.data.id,
            projects: (res.data.projects ?? []) as ResumeProject[],
          })
          // 切简历时清空已选项目
          setSelectedProjectIds([])
        }
      })
      .finally(() => {
        if (!cancelled) setResumeDetailLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [resumeId])

  const projects = resumeDetail?.projects ?? []
  const needsProjects = trainingType === 'project_qa'
  const showsProjects = trainingType === 'project_qa' || trainingType === 'full'
  const projectMissingError = needsProjects && selectedProjectIds.length === 0

  const noResumes = resumes !== null && resumes.length === 0
  const canSubmit =
    !submitting && !!resumeId && !projectMissingError && !noResumes

  const toggleProject = (pid: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(pid) ? prev.filter((id) => id !== pid) : [...prev, pid],
    )
  }

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setSubmitError(null)

    const body: Record<string, unknown> = {
      type: trainingType,
      resume_id: resumeId,
    }
    if (targetCompany.trim()) body.target_company = targetCompany.trim()
    if (jobDescription.trim()) body.job_description = jobDescription.trim()
    if (selectedProjectIds.length > 0) body.project_ids = selectedProjectIds

    try {
      const res = await fetch('/api/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setSubmitError(json.error?.message || json.error || '创建训练失败')
        setSubmitting(false)
        return
      }
      // 刷新列表缓存，让历史页能拿到新建的会话
      invalidateKey('/api/training')
      navigate(`/training/${json.data.id}`)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : '网络错误')
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">训练</h1>
        <p className="text-sm text-slate-500 mt-1">
          选择一份简历，配置训练参数，立即开始模拟
        </p>
      </div>

      {/* 进行中训练 banner */}
      {runningSession && (
        <Link
          to={`/training/${runningSession.id}`}
          className="block card-elevated p-5 border-l-4 border-l-emerald-500 hover:border-emerald-400 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center ring-1 ring-emerald-500/20 group-hover:ring-emerald-500/40 transition-all">
                <Play size={20} className="text-emerald-400" />
              </div>
              <div>
                <p className="font-semibold text-emerald-100">
                  模拟面试进行中
                </p>
                <p className="text-sm text-slate-400">
                  当前阶段：{runningSession.currentState || '进行中'}
                </p>
              </div>
            </div>
            <span className="flex items-center gap-1 text-sm text-emerald-400 font-medium group-hover:gap-2 transition-all">
              继续
              <ArrowRight size={16} />
            </span>
          </div>
        </Link>
      )}

      {/* 没有简历的引导 */}
      {noResumes ? (
        <div className="card-elevated p-8 text-center border border-amber-700/30">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center mx-auto mb-4 ring-1 ring-amber-500/20">
            <FileText size={24} className="text-amber-400" />
          </div>
          <p className="text-slate-200 font-semibold text-lg">还没有简历</p>
          <p className="text-sm text-slate-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
            训练需要基于一份简历，AI 才能进行项目深挖和针对性出题
          </p>
          <Link
            to="/resumes"
            className="btn-primary mt-5"
          >
            去添加简历
            <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 简历选择（必选） */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <FileText size={16} className="text-slate-500" />
              <span>选择简历</span>
              <span className="text-red-400">*</span>
            </div>
            {resumes === null ? (
              <p className="text-sm text-slate-500">加载中...</p>
            ) : (
              <div className="relative">
                <select
                  value={resumeId}
                  onChange={(e) => setResumeId(e.target.value)}
                  className="input-field w-full px-3 py-2.5 pr-10 appearance-none cursor-pointer"
                >
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
              </div>
            )}
          </div>

          {/* 训练类型 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <Layers size={16} className="text-slate-500" />
              <span>训练类型</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TRAINING_TYPES.map((t) => {
                const active = trainingType === t.value
                const Icon = t.icon
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTrainingType(t.value)}
                    className={`relative text-left p-4 rounded-xl border transition-all duration-200 group ${
                      active
                        ? 'border-emerald-500/50 bg-gradient-to-br from-emerald-950/40 to-emerald-900/20 ring-1 ring-emerald-500/20'
                        : 'border-slate-800 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-800/30'
                    }`}
                  >
                    {active && (
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                        <Check size={12} className="text-white" />
                      </div>
                    )}
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2.5 ${
                      active
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-slate-800 text-slate-500 group-hover:text-slate-400'
                    }`}>
                      <Icon size={18} />
                    </div>
                    <div className={`font-semibold text-sm ${active ? 'text-emerald-100' : 'text-slate-200'}`}>
                      {t.label}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 leading-relaxed">{t.desc}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 目标公司与 JD */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
              <Building2 size={16} className="text-slate-500" />
              <span>目标信息</span>
              <span className="text-xs text-slate-600 font-normal">（可选）</span>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">目标公司</label>
              <input
                type="text"
                value={targetCompany}
                onChange={(e) => setTargetCompany(e.target.value)}
                placeholder="如：字节跳动、阿里"
                className="input-field w-full px-3 py-2.5"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">岗位 JD</label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="粘贴岗位描述，AI 会据此调整出题方向..."
                rows={4}
                className="input-field w-full px-3 py-2.5 resize-none"
              />
            </div>
          </div>

          {/* 项目选择（仅项目问答 / 整面） */}
          {showsProjects && (
            <div className="card p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <Layers size={16} className="text-slate-500" />
                <span>选择项目</span>
                {needsProjects ? (
                  <span className="text-red-400">*</span>
                ) : (
                  <span className="text-xs text-slate-600 font-normal">（可选，整面会自动从中挑选）</span>
                )}
              </div>
              {resumeDetailLoading ? (
                <p className="text-sm text-slate-500">加载该简历的项目中...</p>
              ) : projects.length === 0 ? (
                <div className="py-6 text-center border border-dashed border-slate-800 rounded-lg">
                  <Layers size={20} className="mx-auto text-slate-600 mb-2" />
                  <p className="text-sm text-slate-500">
                    该简历暂无项目
                    {needsProjects && '，无法进行项目问答'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {projects.map((p) => {
                    const checked = selectedProjectIds.includes(p.id)
                    return (
                      <label
                        key={p.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                          checked
                            ? 'border-emerald-700/50 bg-emerald-950/20 ring-1 ring-emerald-500/10'
                            : 'border-slate-800 hover:border-slate-600 hover:bg-slate-800/20'
                        }`}
                      >
                        <div className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          checked
                            ? 'bg-emerald-500 border-emerald-500'
                            : 'border-slate-600 bg-slate-950'
                        }`}>
                          {checked && <Check size={12} className="text-white" />}
                        </div>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleProject(p.id)}
                          className="sr-only"
                        />
                        <div className="min-w-0">
                          <p className="text-sm text-slate-200 font-medium">{p.name}</p>
                          {(p.role || p.period) && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              {[p.role, p.period].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* 错误提示 */}
          {submitError && (
            <div className="flex items-start gap-2.5 p-4 rounded-lg border border-red-900/50 bg-red-950/30 text-red-300 text-sm">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* 提交 */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="btn-primary w-full py-3 text-base"
          >
            <Mic size={20} />
            {submitting ? '创建中...' : '开始训练'}
          </button>
        </div>
      )}

      {/* 历史入口 */}
      <div className="flex justify-center pt-2">
        <Link
          to="/reviews"
          className="btn-ghost text-sm"
        >
          <History size={14} />
          查看训练历史与复盘
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  )
}
