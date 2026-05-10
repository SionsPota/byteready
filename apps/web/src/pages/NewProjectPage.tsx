import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderGit2, Plus, X } from 'lucide-react'

export function NewProjectPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [period, setPeriod] = useState('')
  const [role, setRole] = useState('')
  const [summary, setSummary] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])
  const [keywordInput, setKeywordInput] = useState('')
  const [loading, setLoading] = useState(false)

  const addKeyword = () => {
    const trimmed = keywordInput.trim()
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed])
      setKeywordInput('')
    }
  }

  const removeKeyword = (k: string) => {
    setKeywords(keywords.filter((x) => x !== k))
  }

  const handleSubmit = async () => {
    if (!name.trim()) return
    setLoading(true)
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, period, role, summary, keywords }),
    })
    const json = await res.json()
    setLoading(false)
    if (json.success) {
      navigate('/projects')
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">新建项目</h1>

      <div className="space-y-5 p-6 rounded-lg border border-slate-800 bg-slate-900">
        <div>
          <label className="block text-sm text-slate-400 mb-1">项目名称 *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-slate-600"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-slate-400 mb-1">时间段</label>
            <input
              type="text"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder="如：2023.06 - 2024.01"
              className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-slate-600"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">角色</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="如：后端负责人"
              className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-slate-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">项目概述</label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-slate-600"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">技术关键词</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
              placeholder="输入后按回车添加"
              className="flex-1 px-3 py-2 rounded-md bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-slate-600"
            />
            <button
              onClick={addKeyword}
              className="px-3 py-2 rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {keywords.map((k) => (
              <span
                key={k}
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-sm bg-slate-800 text-slate-300"
              >
                {k}
                <button onClick={() => removeKeyword(k)} className="text-slate-500 hover:text-slate-200">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !name.trim()}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md bg-emerald-600 text-white font-medium hover:bg-emerald-500 disabled:opacity-50 transition-colors"
        >
          <FolderGit2 size={18} />
          {loading ? '创建中...' : '创建项目'}
        </button>
      </div>
    </div>
  )
}
