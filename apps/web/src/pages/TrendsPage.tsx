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

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']

export function TrendsPage() {
  const [data, setData] = useState<TrendSeries | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/trends', { credentials: 'include' })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setData(res.data)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-slate-500">加载中...</p>

  // 没有数据时展示空状态
  if (!data || Object.keys(data).length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">跨场趋势</h1>
        <div className="text-center py-16 border border-dashed border-slate-800 rounded-lg">
          <p className="text-slate-500">还没有足够的面试数据</p>
          <p className="text-sm text-slate-600 mt-1">完成至少 2 场面试后，这里将展示进步曲线</p>
        </div>
      </div>
    )
  }

  // 构建折线图数据：按 createdAt 分组，每个时间点有各轴的值
  const allPoints = Object.entries(data).flatMap(([axis, points]) =>
    points.map((p, idx) => ({ ...p, axis, idx: idx + 1 }))
  )

  // 按 idx 分组（每场面试）
  const bySession = new Map<number, Record<string, number>>()
  allPoints.forEach((p) => {
    const existing = bySession.get(p.idx) || {}
    existing[p.axis] = p.value
    bySession.set(p.idx, existing)
  })

  const chartData = Array.from(bySession.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([idx, values]) => ({ session: `第${idx}场`, ...values }))

  const axes = Object.keys(data)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">跨场趋势</h1>

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
      <div className="mt-6 grid grid-cols-5 gap-4">
        {axes.map((axis, i) => {
          const points = data[axis] || []
          const avg = points.length > 0 ? points.reduce((s, p) => s + p.value, 0) / points.length : 0
          return (
            <div key={axis} className="p-3 rounded-lg border border-slate-800 bg-slate-900 text-center">
              <p className="text-xs text-slate-500 mb-1">{axis}</p>
              <p className="text-xl font-bold" style={{ color: COLORS[i % COLORS.length] }}>
                {avg.toFixed(1)}
              </p>
              <p className="text-xs text-slate-600">{points.length} 场平均</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
