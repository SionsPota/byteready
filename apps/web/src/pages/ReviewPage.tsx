import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts'

interface Score {
  axis: string
  value: number
  evidence: string
}

interface ReviewData {
  id: string
  sessionId: string
  overallText: string
  generatedAt: number
  scores: Score[]
}

export function ReviewPage() {
  const { id } = useParams()
  const [review, setReview] = useState<ReviewData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/reviews/${id}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setReview(res.data)
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="text-slate-500">加载中...</p>
  if (!review) return <p className="text-slate-500">复盘报告不存在</p>

  const radarData = review.scores.map((s) => ({
    axis: s.axis,
    value: s.value,
    fullMark: 5,
  }))

  return (
    <div>
      <Link to="/dashboard" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-300 mb-4">
        <ArrowLeft size={14} />
        返回仪表盘
      </Link>

      <h1 className="text-2xl font-bold mb-6">复盘报告</h1>

      {/* Radar Chart */}
      <div className="mb-8 p-4 rounded-lg border border-slate-800 bg-slate-900">
        <h2 className="text-lg font-semibold mb-4">5 轴评分</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="axis" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <PolarRadiusAxis domain={[0, 5]} tick={{ fill: '#64748b', fontSize: 10 }} />
              <Radar
                name="得分"
                dataKey="value"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Scores Detail */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">评分详情</h2>
        <div className="space-y-3">
          {review.scores.map((s) => (
            <div key={s.axis} className="p-4 rounded-lg border border-slate-800 bg-slate-900">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{s.axis}</span>
                <span className="text-emerald-400 font-bold">{s.value.toFixed(1)} / 5.0</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${(s.value / 5) * 100}%` }}
                />
              </div>
              {s.evidence && <p className="text-sm text-slate-500 mt-2">{s.evidence}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Overall */}
      <div className="p-4 rounded-lg border border-slate-800 bg-slate-900">
        <h2 className="text-lg font-semibold mb-2">总评</h2>
        <p className="text-slate-300 leading-relaxed">{review.overallText}</p>
      </div>
    </div>
  )
}
