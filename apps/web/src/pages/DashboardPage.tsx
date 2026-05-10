import { Link } from 'react-router-dom'
import { Dumbbell, FileText, TrendingUp, Compass } from 'lucide-react'
import { useApi } from '../hooks/useApi.ts'

interface TrainingSummary {
  id: string
  position: string
  status: string
  createdAt: number
}

export function DashboardPage() {
  const { data: trainings, loading } = useApi<TrainingSummary[]>('/api/training', {
    ttl: 30_000,
  })

  const list = trainings?.slice(0, 5) ?? []

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">仪表盘</h1>

      {/* 四大模块入口 */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Link
          to="/training"
          className="p-6 rounded-lg border border-slate-800 bg-slate-900 hover:border-slate-600 transition-colors"
        >
          <Dumbbell className="mb-3 text-emerald-400" size={24} />
          <h3 className="font-medium">训练</h3>
          <p className="text-sm text-slate-500 mt-1">模拟面试 + 专项训练</p>
        </Link>
        <Link
          to="/resumes"
          className="p-6 rounded-lg border border-slate-800 bg-slate-900 hover:border-slate-600 transition-colors"
        >
          <FileText className="mb-3 text-blue-400" size={24} />
          <h3 className="font-medium">项目与简历</h3>
          <p className="text-sm text-slate-500 mt-1">管理简历和项目素材</p>
        </Link>
        <Link
          to="/trends"
          className="p-6 rounded-lg border border-slate-800 bg-slate-900 hover:border-slate-600 transition-colors"
        >
          <TrendingUp className="mb-3 text-amber-400" size={24} />
          <h3 className="font-medium">复盘</h3>
          <p className="text-sm text-slate-500 mt-1">查看训练复盘和趋势</p>
        </Link>
        <Link
          to="/explore"
          className="p-6 rounded-lg border border-slate-800 bg-slate-900 hover:border-slate-600 transition-colors"
        >
          <Compass className="mb-3 text-purple-400" size={24} />
          <h3 className="font-medium">探索</h3>
          <p className="text-sm text-slate-500 mt-1">面经 + 公司画像</p>
        </Link>
      </div>

      <h2 className="text-lg font-semibold mb-4">近期训练</h2>
      {loading && list.length === 0 ? (
        <p className="text-slate-500">加载中...</p>
      ) : list.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-800 rounded-lg">
          <p className="text-slate-500">还没有训练记录</p>
          <Link to="/training/interview/new" className="text-emerald-400 hover:text-emerald-300 text-sm mt-2 inline-block">
            开始第一场训练 →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between p-4 rounded-lg border border-slate-800 bg-slate-900"
            >
              <div className="flex items-center gap-3">
                <div>
                  <p className="font-medium">{t.position}</p>
                  <p className="text-sm text-slate-500">
                    {new Date(t.createdAt).toLocaleDateString('zh-CN')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    t.status === 'ended'
                      ? 'bg-slate-800 text-slate-400'
                      : t.status === 'running'
                        ? 'bg-emerald-950 text-emerald-400'
                        : 'bg-amber-950 text-amber-400'
                  }`}
                >
                  {t.status === 'ended' ? '已结束' : t.status === 'running' ? '进行中' : '待开始'}
                </span>
                {t.status === 'ended' && (
                  <Link
                    to={`/reviews/${t.id}`}
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
