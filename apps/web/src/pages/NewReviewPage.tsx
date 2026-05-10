import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Loader2 } from 'lucide-react'

export function NewReviewPage() {
  const navigate = useNavigate()
  const [type, setType] = useState<'project' | 'custom'>('project')
  const [targetId, setTargetId] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!targetId.trim() || !content.trim()) return
    setLoading(true)
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ type, target_id: targetId, content }),
    })
    const json = await res.json()
    setLoading(false)
    if (json.success) {
      navigate(`/reviews/${json.data.id}`)
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">新建复盘</h1>

      <div className="space-y-5 p-6 rounded-lg border border-slate-800 bg-slate-900">
        <div>
          <label className="block text-sm text-slate-400 mb-2">复盘类型</label>
          <div className="flex gap-2">
            <button
              onClick={() => setType('project')}
              className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                type === 'project'
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-950'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500'
              }`}
            >
              项目复盘
            </button>
            <button
              onClick={() => setType('custom')}
              className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                type === 'custom'
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-950'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500'
              }`}
            >
              自定义复盘
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">{type === 'project' ? '项目 ID' : '标题'}</label>
          <input
            type="text"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            placeholder={type === 'project' ? '输入项目 ID' : '输入复盘标题'}
            className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-slate-600"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">内容描述</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            placeholder="描述项目经历或需要复盘的内容..."
            className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-slate-600"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !targetId.trim() || !content.trim()}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md bg-emerald-600 text-white font-medium hover:bg-emerald-500 disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
          {loading ? '生成中...' : '生成复盘'}
        </button>
      </div>
    </div>
  )
}
