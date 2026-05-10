import { Link } from 'react-router-dom'
import { Dumbbell, Clock, Play, ArrowRight } from 'lucide-react'
import { useApi } from '../hooks/useApi.ts'
import { invalidateKey } from '../lib/api.ts'

interface TrainingSession {
  id: string
  position: string
  status: string
  currentState?: string
  createdAt: number
}

export function TrainingPage() {
  const { data: sessions, loading, refresh } = useApi<TrainingSession[]>('/api/training', {
    ttl: 30_000,
  })

  const list = sessions ?? []
  const runningSession = list.find((s) => s.status === 'running')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">训练中心</h1>
        <Link
          to="/training/interview/new"
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 transition-colors"
        >
          <Dumbbell size={16} />
          开始模拟面试
        </Link>
      </div>

      {/* 进行中的训练 */}
      {runningSession && (
        <div className="mb-6 p-4 rounded-lg border border-emerald-800 bg-emerald-950/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Play size={18} className="text-emerald-400" />
              <div>
                <p className="font-medium">{runningSession.position} · 模拟面试进行中</p>
                <p className="text-sm text-slate-500">当前阶段：{runningSession.currentState || '进行中'}</p>
              </div>
            </div>
            <Link
              to={`/training/interview/${runningSession.id}`}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-500 transition-colors"
            >
              继续
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

      {/* 历史训练 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">历史训练</h2>
        <button
          onClick={() => { invalidateKey('/api/training'); refresh() }}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          刷新
        </button>
      </div>
      {loading && list.length === 0 ? (
        <p className="text-slate-500">加载中...</p>
      ) : list.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-800 rounded-lg">
          <p className="text-slate-500">还没有训练记录</p>
          <Link to="/training/interview/new" className="text-emerald-400 hover:text-emerald-300 text-sm mt-2 inline-block">
            开始第一场模拟面试 →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between p-4 rounded-lg border border-slate-800 bg-slate-900"
            >
              <div className="flex items-center gap-3">
                <Clock size={16} className="text-slate-500" />
                <div>
                  <p className="font-medium">{s.position}</p>
                  <p className="text-sm text-slate-500">
                    {new Date(s.createdAt).toLocaleDateString('zh-CN')} · {s.status === 'ended' ? '已结束' : s.status === 'running' ? '进行中' : '待开始'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {s.status === 'pending' && (
                  <Link
                    to={`/training/interview/${s.id}`}
                    className="text-sm text-emerald-400 hover:text-emerald-300"
                  >
                    开始
                  </Link>
                )}
                {s.status === 'ended' && (
                  <Link
                    to={`/reviews/${s.id}`}
                    className="text-sm text-emerald-400 hover:text-emerald-300"
                  >
                    复盘
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
