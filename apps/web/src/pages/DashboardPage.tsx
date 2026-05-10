import { Link } from 'react-router-dom'
import {
  Dumbbell,
  FileText,
  TrendingUp,
  Compass,
  Play,
  ArrowRight,
  Clock,
  Zap,
  ChevronRight,
} from 'lucide-react'
import { useApi } from '../hooks/useApi.ts'
import { useAuth } from '../contexts/AuthContext'

interface TrainingSummary {
  id: string
  position: string
  status: string
  currentState?: string
  createdAt: number
}

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

const ENTRY_CARDS = [
  {
    to: '/training',
    icon: Dumbbell,
    iconBg: 'from-emerald-500/20 to-emerald-600/10',
    iconColor: 'text-emerald-400',
    ringColor: 'group-hover:ring-emerald-500/30',
    title: '训练',
    desc: '配置一场模拟面试，立即开始',
  },
  {
    to: '/resumes',
    icon: FileText,
    iconBg: 'from-blue-500/20 to-blue-600/10',
    iconColor: 'text-blue-400',
    ringColor: 'group-hover:ring-blue-500/30',
    title: '简历与项目',
    desc: '管理简历和项目素材',
  },
  {
    to: '/reviews',
    icon: TrendingUp,
    iconBg: 'from-amber-500/20 to-amber-600/10',
    iconColor: 'text-amber-400',
    ringColor: 'group-hover:ring-amber-500/30',
    title: '复盘',
    desc: '查看趋势与训练历史',
  },
  {
    to: '/explore',
    icon: Compass,
    iconBg: 'from-purple-500/20 to-purple-600/10',
    iconColor: 'text-purple-400',
    ringColor: 'group-hover:ring-purple-500/30',
    title: '探索',
    desc: '面经、行业趋势、学习项目',
  },
] as const

function formatTime(ts: number): string {
  const now = Date.now()
  const diff = now - ts
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (days > 0) return `${days} 天前`
  if (hours > 0) return `${hours} 小时前`
  if (minutes > 0) return `${minutes} 分钟前`
  return '刚刚'
}

export function DashboardPage() {
  const { user } = useAuth()
  const { data: trainings } = useApi<TrainingSummary[]>('/api/training', {
    ttl: 30_000,
  })

  const runningSession = (trainings ?? []).find((t) => t.status === 'running')
  const recentTrainings = (trainings ?? [])
    .filter((t) => t.status !== 'running')
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5)

  const totalCount = trainings?.length ?? 0
  const completedCount = (trainings ?? []).filter((t) => t.status === 'ended').length

  return (
    <div className="animate-fade-in space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500 mb-1">
            {new Date().toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
            你好，{user?.name || user?.email?.split('@')[0] || '候选人'}
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            准备好今天的面试训练了吗？
          </p>
        </div>
        <Link
          to="/training"
          className="btn-primary self-start sm:self-auto shrink-0"
        >
          <Zap size={16} />
          开始新训练
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-slate-100">{totalCount}</p>
          <p className="text-xs text-slate-500 mt-1">总训练次数</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">{completedCount}</p>
          <p className="text-xs text-slate-500 mt-1">已完成</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-sky-400">
            {runningSession ? '进行中' : '空闲'}
          </p>
          <p className="text-xs text-slate-500 mt-1">当前状态</p>
        </div>
      </div>

      {/* Running Session Banner */}
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
                <p className="text-sm text-slate-400 mt-0.5">
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

      {/* Entry Cards */}
      <div>
        <h2 className="section-title mb-4">快速入口</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
          {ENTRY_CARDS.map((card) => {
            const Icon = card.icon
            return (
              <Link
                key={card.to}
                to={card.to}
                className="card-interactive group p-5 flex flex-col"
              >
                <div
                  className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.iconBg} flex items-center justify-center ring-1 ring-white/5 ${card.ringColor} transition-all mb-4`}
                >
                  <Icon className={card.iconColor} size={22} />
                </div>
                <h3 className="font-semibold text-slate-100 text-base">{card.title}</h3>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">{card.desc}</p>
                <div className="mt-auto pt-3 flex items-center gap-1 text-xs text-slate-600 group-hover:text-slate-400 transition-colors">
                  进入
                  <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Recent Activity */}
      {recentTrainings.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">最近训练</h2>
            <Link
              to="/reviews"
              className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-0.5 transition-colors"
            >
              查看全部
              <ChevronRight size={12} />
            </Link>
          </div>
          <div className="card divide-y divide-slate-800/60">
            {recentTrainings.map((t) => {
              const isEnded = t.status === 'ended'
              const Icon = isEnded ? FileText : Play
              const iconColor = isEnded ? 'text-slate-400' : 'text-emerald-400'
              const iconBg = isEnded ? 'from-slate-700 to-slate-800' : 'from-emerald-900 to-emerald-950'
              return (
                <Link
                  key={t.id}
                  to={isEnded ? `/reviews/${t.id}` : `/training/${t.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-800/30 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${iconBg} flex items-center justify-center shrink-0`}>
                      <Icon size={14} className={iconColor} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">
                        <span className={TYPE_COLORS[t.type] || 'text-slate-300'}>
                          {TYPE_LABELS[t.type] || t.type}
                        </span>
                        {t.position && ` · ${t.position}`}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                            isEnded
                              ? 'bg-slate-800 text-slate-400 border-slate-700'
                              : 'bg-emerald-950/50 text-emerald-400 border-emerald-800/50'
                          }`}
                        >
                          {isEnded ? '已完成' : '进行中'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-xs text-slate-600 flex items-center gap-1">
                      <Clock size={11} />
                      {formatTime(t.createdAt)}
                    </span>
                    <ChevronRight
                      size={14}
                      className="text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all"
                    />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
