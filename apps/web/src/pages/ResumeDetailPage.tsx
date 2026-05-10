import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'

interface Project {
  id: string
  name: string
  period: string | null
  role: string | null
  summary: string | null
  keywords: string[]
  order: number
}

interface ResumeDetail {
  id: string
  title: string
  rawText: string
  sourceFormat: string
  projects: Project[]
}

export function ResumeDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [resume, setResume] = useState<ResumeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Record<string, Partial<Project>>>({})

  useEffect(() => {
    fetch(`/api/resumes/${id}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setResume(res.data)
      })
      .finally(() => setLoading(false))
  }, [id])

  const handleProjectChange = (pid: string, field: keyof Project, value: string) => {
    setEditing((prev) => ({
      ...prev,
      [pid]: { ...prev[pid], [field]: value },
    }))
  }

  const handleSaveProject = async (pid: string) => {
    const changes = editing[pid]
    if (!changes) return
    const res = await fetch(`/api/resumes/${id}/projects/${pid}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(changes),
    })
    if (res.ok) {
      setEditing((prev) => {
        const next = { ...prev }
        delete next[pid]
        return next
      })
      // 刷新
      const refreshed = await fetch(`/api/resumes/${id}`, { credentials: 'include' }).then((r) => r.json())
      if (refreshed.success) setResume(refreshed.data)
    }
  }

  if (loading) return <p className="text-slate-500">加载中...</p>
  if (!resume) return <p className="text-slate-500">简历不存在</p>

  return (
    <div>
      <button
        onClick={() => navigate('/resumes')}
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-300 mb-4"
      >
        <ArrowLeft size={14} />
        返回简历列表
      </button>

      <h1 className="text-2xl font-bold mb-2">{resume.title}</h1>
      <p className="text-sm text-slate-500 mb-6">
        来源：{resume.sourceFormat === 'paste' ? '粘贴' : resume.sourceFormat} · 共 {resume.projects.length} 个项目
      </p>

      <h2 className="text-lg font-semibold mb-4">项目经历</h2>
      <div className="space-y-4">
        {resume.projects.map((p) => (
          <div key={p.id} className="p-4 rounded-lg border border-slate-800 bg-slate-900 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500">项目名称</label>
                <input
                  type="text"
                  defaultValue={p.name}
                  onChange={(e) => handleProjectChange(p.id, 'name', e.target.value)}
                  className="w-full mt-1 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-sm focus:outline-none focus:border-slate-600"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">时间段</label>
                <input
                  type="text"
                  defaultValue={p.period ?? ''}
                  onChange={(e) => handleProjectChange(p.id, 'period', e.target.value)}
                  className="w-full mt-1 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-sm focus:outline-none focus:border-slate-600"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500">角色</label>
              <input
                type="text"
                defaultValue={p.role ?? ''}
                onChange={(e) => handleProjectChange(p.id, 'role', e.target.value)}
                className="w-full mt-1 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-sm focus:outline-none focus:border-slate-600"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">概述</label>
              <textarea
                defaultValue={p.summary ?? ''}
                onChange={(e) => handleProjectChange(p.id, 'summary', e.target.value)}
                rows={2}
                className="w-full mt-1 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-sm focus:outline-none focus:border-slate-600"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">关键词（逗号分隔）</label>
              <input
                type="text"
                defaultValue={p.keywords.join(', ')}
                onChange={(e) => handleProjectChange(p.id, 'keywords', e.target.value)}
                className="w-full mt-1 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-sm focus:outline-none focus:border-slate-600"
              />
            </div>
            {editing[p.id] && (
              <button
                onClick={() => handleSaveProject(p.id)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-500 transition-colors"
              >
                <Save size={14} />
                保存
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
