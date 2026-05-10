import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Filter } from 'lucide-react'

interface TrainingItem {
  id: string
  type: string
  position: string
  targetCompany: string | null
  status: string
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

export function ReviewsPage() {
  const [trainings, setTrainings] = useState<TrainingItem[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/training', { credentials: 'include' })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          const ended = res.data.filter((t: { status: string }) => t.status === 'ended')
          setTrainings(ended)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'all' ? trainings : trainings.filter((t) => t.type === filter)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">复盘列表</h1>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-500" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-1.5 rounded-md bg-slate-950 border border-slate-800 text-slate-100 text-sm"
          >
            <option value="all">全部</option>
            <option value="full">整面面试</option>
            <option value="self_intro">自我介绍</option>
            <option value="project_qa">项目问答</option>
            <option value="random_qa">随机问答</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-500">加载中...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-800 rounded-lg">
          <p className="text-slate-500">还没有复盘记录</p>
          <p className="text-sm text-slate-600 mt-1">完成一场训练后会自动生成复盘</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <Link
              key={t.id}
              to={`/reviews/${t.id}`}
              className="block p-4 rounded-lg border border-slate-800 bg-slate-900 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText size={16} className="text-slate-500" />
                  <div>
                    <p className="font-medium text-sm">
                      <span className={TYPE_COLORS[t.type] || 'text-slate-300'}>
                        {TYPE_LABELS[t.type] || t.type}
                      </span>
                      {' · '}
                      {t.position}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(t.createdAt).toLocaleDateString('zh-CN')}
                      {t.targetCompany ? ` · ${t.targetCompany}` : ''}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-emerald-400 bg-emerald-950 px-2 py-1 rounded">
                  查看复盘
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
