import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Filter, FileText, Play, Clock, ArrowRight, TrendingUp, Zap, ChevronDown } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface TrainingItem {
  id: string
  type: string
  position: string
  targetCompany: string | null
  status: string
  currentState?: string | null
  createdAt: number
}

interface TrendPoint {
  sessionId: string
  value: number
  createdAt: number
}

type TrendSeries = Record<string, TrendPoint[]>

const TYPE_LABELS: Record<string, string> = {
  full: '整面面试',
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

const STATUS_LABELS: Record<string, string> = {
  ended: '已结束',
  running: '进行中',
  pending: '待开始',
}

const PHASE_TYPES = [
  { value: 'self_intro', label: '自我介绍' },
  { value: 'project_qa', label: '项目问答' },
  { value: 'random_qa', label: '随机问答' },
] as const

const FULL_METRIC_LABELS: Record<string, string> = {
  overall_score: '总分',
  coherence_score: '阶段间连贯性',
  jd_match_score: 'JD 匹配度',
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

function buildChartData(series: TrendSeries): {
  rows: Record<string, string | number>[]
  axes: string[]
} {
  const axes = Object.keys(series)
  const points = new Map<number, Record<string, number>>()
  for (const axis of axes) {
    const list = series[axis] ?? []
    list.forEach((p, idx) => {
      const existing = points.get(idx) ?? {}
      existing[axis] = p.value
      points.set(idx, existing)
    })
  }
  const rows = Array.from(points.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([idx, vals]) => ({ session: `第${idx + 1}场`, ...vals }))
  return { rows, axes }
}

function TrendsSection() {
  const [viewMode, setViewMode] = useState<'phase' | 'full'>('phase')
  const [selectedPhaseType, setSelectedPhaseType] =
    useState<(typeof PHASE_TYPES)[number]['value']>('self_intro')
  const [phaseData, setPhaseData] = useState<TrendSeries>({})
  const [fullData, setFullData] = useState<TrendSeries>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (viewMode === 'phase') {
      setLoading(true)
      fetch(`/api/trends/phase?phaseType=${selectedPhaseType}`, { credentials: 'include' })
        .then((r) => r.json())
        .then((res) => {
          if (res.success) setPhaseData(res.data)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(true)
      fetch('/api/trends/full', { credentials: 'include' })
        .then((r) => r.json())
        .then((res) => {
          if (res.success) setFullData(res.data)
        })
        .finally(() => setLoading(false))
    }
  }, [viewMode, selectedPhaseType])

  const currentData = viewMode === 'phase' ? phaseData : fullData
  const { rows, axes } = buildChartData(currentData)
  const hasData = axes.some((a) => (currentData[a]?.length ?? 0) > 0)

  return (
    <div className="card p-5 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center ring-1 ring-sky-500/10">
            <TrendingUp size={16} className="text-sky-400" />
          </div>
          <h2 className="text-base font-semibold text-slate-100">模拟表现趋势</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('phase')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              viewMode === 'phase'
                ? 'border-emerald-500/50 text-emerald-400 bg-emerald-950/40 ring-1 ring-emerald-500/20'
                : 'border-slate-700 text-slate-400 hover:border-slate-500'
            }`}
          >
            阶段趋势
          </button>
          <button
            onClick={() => setViewMode('full')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              viewMode === 'full'
                ? 'border-emerald-500/50 text-emerald-400 bg-emerald-950/40 ring-1 ring-emerald-500/20'
                : 'border-slate-700 text-slate-400 hover:border-slate-500'
            }`}
          >
            整面趋势
          </button>
        </div>
      </div>

      {viewMode === 'phase' && (
        <div className="flex gap-2 mb-4">
          {PHASE_TYPES.map((pt) => (
            <button
              key={pt.value}
              onClick={() => setSelectedPhaseType(pt.value)}
              className={`px-3 py-1 rounded-lg text-xs border transition-all ${
                selectedPhaseType === pt.value
                  ? 'border-slate-500 text-slate-200 bg-slate-800'
                  : 'border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-600'
              }`}
            >
              {pt.label}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-slate-800/60 bg-slate-950/40 p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-slate-700 border-t-sky-500 rounded-full animate-spin" />
          </div>
        ) : !hasData ? (
          <div className="text-center py-12">
            <TrendingUp size={24} className="mx-auto text-slate-600 mb-2" />
            <p className="text-sm text-slate-500">还没有足够的复盘数据</p>
            <p className="text-xs text-slate-600 mt-1">完成至少 1 场模拟，这里会自动汇总趋势</p>
          </div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="session" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis
                  domain={viewMode === 'full' ? [0, 'dataMax'] : [0, 5]}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #1e293b',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Legend
                  formatter={(v) =>
                    viewMode === 'full' ? FULL_METRIC_LABELS[v] ?? v : v
                  }
                />
                {axes.map((axis, i) => (
                  <Line
                    key={axis}
                    type="monotone"
                    dataKey={axis}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}

interface HistoryRowProps {
  item: TrainingItem
}

function HistoryRow({ item }: HistoryRowProps) {
  const isEnded = item.status === 'ended'
  const isRunning = item.status === 'running'

  const linkTo = isEnded ? `/reviews/${item.id}` : `/training/${item.id}`

  const statusConfig = isEnded
    ? { cls: 'bg-slate-800/60 text-slate-400 border-slate-700', dot: null }
    : isRunning
      ? { cls: 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40', dot: 'bg-emerald-500' }
      : { cls: 'bg-amber-950/40 text-amber-400 border-amber-800/40', dot: null }

  const Icon = isEnded ? FileText : isRunning ? Play : Clock
  const iconColor = isEnded ? 'text-slate-500' : isRunning ? 'text-emerald-400' : 'text-amber-400'

  return (
    <Link
      to={linkTo}
      className="card-interactive group block p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            isRunning ? 'bg-emerald-500/10 ring-1 ring-emerald-500/20' : 'bg-slate-800/60'
          }`}>
            <Icon size={16} className={iconColor} />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">
              <span className={TYPE_COLORS[item.type] || 'text-slate-300'}>
                {TYPE_LABELS[item.type] || item.type}
              </span>
              {item.position && ` · ${item.position}`}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {new Date(item.createdAt).toLocaleDateString('zh-CN')}
              {item.targetCompany ? ` · ${item.targetCompany}` : ''}
              {isRunning && item.currentState ? ` · ${item.currentState}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-md border ${statusConfig.cls} flex items-center gap-1.5`}>
            {statusConfig.dot && (
              <span className="relative flex h-1.5 w-1.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${statusConfig.dot} opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${statusConfig.dot}`}></span>
              </span>
            )}
            {STATUS_LABELS[item.status] || item.status}
          </span>
          <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium group-hover:gap-2 transition-all">
            {isEnded ? '查看复盘' : isRunning ? '继续' : '开始'}
            <ArrowRight size={12} />
          </span>
        </div>
      </div>
    </Link>
  )
}

export function ReviewsPage() {
  const [trainings, setTrainings] = useState<TrainingItem[]>([])
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/training', { credentials: 'include' })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setTrainings(res.data as TrainingItem[])
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    return trainings.filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false
      if (statusFilter !== 'all' && t.status !== statusFilter) return false
      return true
    })
  }, [trainings, typeFilter, statusFilter])

  const stats = useMemo(() => {
    const ended = trainings.filter((t) => t.status === 'ended').length
    const running = trainings.filter((t) => t.status === 'running').length
    return { total: trainings.length, ended, running }
  }, [trainings])

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">复盘</h1>
          <p className="text-sm text-slate-500 mt-1">
            查看模拟表现趋势与全部模拟历史
          </p>
        </div>
        <Link
          to="/training"
          className="btn-primary self-start sm:self-auto shrink-0"
        >
          <Zap size={16} />
          开始新模拟
        </Link>
      </div>

      {/* Stats */}
      {stats.total > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-slate-100">{stats.total}</p>
            <p className="text-xs text-slate-500 mt-1">总模拟</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">{stats.ended}</p>
            <p className="text-xs text-slate-500 mt-1">已完成</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-amber-400">{stats.running}</p>
            <p className="text-xs text-slate-500 mt-1">进行中</p>
          </div>
        </div>
      )}

      <TrendsSection />

      {/* Filters + History */}
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="section-title">模拟历史</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={14} className="text-slate-500" />
            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="input-field pl-3 pr-8 py-1.5 text-xs appearance-none cursor-pointer"
              >
                <option value="all">全部类型</option>
                <option value="full">整面面试</option>
                <option value="self_intro">自我介绍</option>
                <option value="project_qa">项目问答</option>
                <option value="random_qa">随机问答</option>
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-field pl-3 pr-8 py-1.5 text-xs appearance-none cursor-pointer"
              >
                <option value="all">全部状态</option>
                <option value="ended">已结束</option>
                <option value="running">进行中</option>
                <option value="pending">待开始</option>
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-8 h-8 border-2 border-slate-700 border-t-sky-500 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 card border-dashed">
            <Clock size={24} className="mx-auto text-slate-600 mb-3" />
            <p className="text-slate-500">
              {trainings.length === 0 ? '还没有模拟记录' : '没有符合筛选条件的记录'}
            </p>
            {trainings.length === 0 && (
              <Link
                to="/training"
                className="btn-primary mt-4"
              >
                开始第一场模拟
                <ArrowRight size={14} />
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2 stagger-children">
            {filtered.map((t) => (
              <HistoryRow key={t.id} item={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
