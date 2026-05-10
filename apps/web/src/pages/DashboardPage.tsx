import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Mic, FileText, TrendingUp, Clock } from 'lucide-react'

interface InterviewSummary {
  id: string
  position: string
  level: string
  status: string
  createdAt: number
}

export function DashboardPage() {
  const [interviews, setInterviews] = useState<InterviewSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/interviews', { credentials: 'include' })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setInterviews(res.data.slice(0, 5))
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">仪表盘</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <Link
          to="/interviews/new"
          className="p-6 rounded-lg border border-slate-800 bg-slate-900 hover:border-slate-600 transition-colors"
        >
          <Mic className="mb-3 text-emerald-400" size={24} />
          <h3 className="font-medium">开始一场面试</h3>
          <p className="text-sm text-slate-500 mt-1">选择岗位和职级，开启模拟</p>
        </Link>
        <Link
          to="/resumes"
          className="p-6 rounded-lg border border-slate-800 bg-slate-900 hover:border-slate-600 transition-colors"
        >
          <FileText className="mb-3 text-blue-400" size={24} />
          <h3 className="font-medium">管理简历</h3>
          <p className="text-sm text-slate-500 mt-1">上传或编辑简历项目</p>
        </Link>
        <Link
          to="/trends"
          className="p-6 rounded-lg border border-slate-800 bg-slate-900 hover:border-slate-600 transition-colors"
        >
          <TrendingUp className="mb-3 text-amber-400" size={24} />
          <h3 className="font-medium">查看趋势</h3>
          <p className="text-sm text-slate-500 mt-1">跨场评分进步曲线</p>
        </Link>
      </div>

      <h2 className="text-lg font-semibold mb-4">近期面试</h2>
      {loading ? (
        <p className="text-slate-500">加载中...</p>
      ) : interviews.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-800 rounded-lg">
          <p className="text-slate-500">还没有面试记录</p>
          <Link to="/interviews/new" className="text-emerald-400 hover:text-emerald-300 text-sm mt-2 inline-block">
            开始第一场面试 →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {interviews.map((iv) => (
            <div
              key={iv.id}
              className="flex items-center justify-between p-4 rounded-lg border border-slate-800 bg-slate-900"
            >
              <div className="flex items-center gap-3">
                <Clock size={16} className="text-slate-500" />
                <div>
                  <p className="font-medium">
                    {iv.position} · {iv.level}
                  </p>
                  <p className="text-sm text-slate-500">
                    {new Date(iv.createdAt).toLocaleDateString('zh-CN')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    iv.status === 'ended'
                      ? 'bg-slate-800 text-slate-400'
                      : iv.status === 'running'
                        ? 'bg-emerald-950 text-emerald-400'
                        : 'bg-amber-950 text-amber-400'
                  }`}
                >
                  {iv.status === 'ended' ? '已结束' : iv.status === 'running' ? '进行中' : '待开始'}
                </span>
                {iv.status === 'ended' && (
                  <Link
                    to={`/reviews/${iv.id}`}
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
