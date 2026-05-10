import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface TrendPoint {
  sessionId: string
  value: number
  createdAt: number
}

interface TrendSeries {
  [axis: string]: TrendPoint[]
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

const PHASE_DIMENSIONS: Record<string, string[]> = {
  self_intro: ['结构完整性', '时长控制', '信息密度', '表达流畅度', '个性化程度'],
  project_qa: ['项目理解深度', '技术深度', '表达结构', '追问应对', '项目间关联'],
  random_qa: ['知识准确度', '思维深度', '表达清晰度', '边界意识', '岗位匹配'],
}

const PHASE_LABELS: Record<string, string> = {
  self_intro: '自我介绍',
  project_qa: '项目问答',
  random_qa: '随机问答',
}

export function TrendsPage() {
  const [viewMode, setViewMode] = useState<'phase' | 'full'>('phase')
  const [selectedPhaseType, setSelectedPhaseType] = useState<string>('self_intro')
  const [phaseData, setPhaseData] = useState<TrendSeries | null>(null)
  const [fullData, setFullData] = useState<TrendSeries | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // V3 双轨趋势 API 占位，使用旧的趋势数据兼容
    fetch('/api/trends', { credentials: 'include' })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          // 旧数据作为 full 趋势的兼容
          setFullData(res.data)
          // phase 数据占位（实际由 V3 API 提供）
          setPhaseData(res.data)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-slate-500">加载中...</p>

  const currentData = viewMode === 'phase' ? phaseData : fullData

  if (!currentData || Object.keys(currentData).length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">趋势分析</h1>
        <div className="text-center py-16 border border-dashed border-slate-800 rounded-lg">
          <p className="text-slate-500">还没有足够的训练数据</p>
          <p className="text-sm text-slate-600 mt-1">完成至少 2 场训练后，这里将展示进步曲线</p>
        </div>
      </div>
    )
  }

  // 构建折线图数据
  const allPoints = Object.entries(currentData).flatMap(([axis, points]) =>
    points.map((p, idx) => ({ ...p, axis, idx: idx + 1 }))
  )

  const bySession = new Map<number, Record<string, number>>()
  allPoints.forEach((p) => {
    const existing = bySession.get(p.idx) || {}
    existing[p.axis] = p.value
    bySession.set(p.idx, existing)
  })

  const chartData = Array.from(bySession.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([idx, values]) => ({ session: `第${idx}场`, ...values }))

  const axes = viewMode === 'phase'
    ? PHASE_DIMENSIONS[selectedPhaseType] || []
    : Object.keys(currentData)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">趋势分析</h1>

      {/* 视图切换 */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setViewMode('phase')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'phase'
              ? 'bg-emerald-950 text-emerald-400 border border-emerald-500'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-600'
          }`}
        >
          阶段趋势
        </button>
        <button
          onClick={() => setViewMode('full')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'full'
              ? 'bg-emerald-950 text-emerald-400 border border-emerald-500'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-600'
          }`}
        >
          整面趋势
        </button>
      </div>

      {/* 阶段类型选择 */}
      {viewMode === 'phase' && (
        <div className="flex gap-2 mb-4">
          {Object.entries(PHASE_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSelectedPhaseType(key)}
              className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                selectedPhaseType === key
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-950'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* 图表 */}
      <div className="p-4 rounded-lg border border-slate-800 bg-slate-900">
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="session" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis domain={[0, 5]} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Legend />
              {axes.map((axis, i) => (
                <Line
                  key={axis}
                  type="monotone"
                  dataKey={axis}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        {axes.slice(0, 6).map((axis, i) => {
          const points = currentData[axis] || []
          const avg = points.length > 0 ? points.reduce((s, p) => s + p.value, 0) / points.length : 0
          const firstVal = points.length > 0 ? (points[points.length - 1]?.value ?? 0) : 0
          const lastVal = points.length > 0 ? (points[0]?.value ?? 0) : 0
          const trend = lastVal > firstVal ? '↑' : lastVal < firstVal ? '↓' : '→'
          return (
            <div key={axis} className="p-3 rounded-lg border border-slate-800 bg-slate-900 text-center">
              <p className="text-xs text-slate-500 mb-1">{axis}</p>
              <p className="text-xl font-bold" style={{ color: COLORS[i % COLORS.length] }}>
                {avg.toFixed(1)} <span className="text-sm">{trend}</span>
              </p>
              <p className="text-xs text-slate-600">{points.length} 场平均</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
