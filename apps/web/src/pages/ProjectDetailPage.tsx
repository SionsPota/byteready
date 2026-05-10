import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Edit, Trash2, Dumbbell } from 'lucide-react'

interface Project {
  id: string
  name: string
  period: string | null
  role: string | null
  summary: string | null
  keywords: string[]
  source: string | null
  sourceResumeId: string | null
  createdAt: number
  updatedAt: number
}

export function ProjectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<Project>>({})

  useEffect(() => {
    fetch(`/api/projects/${id}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setProject(res.data)
          setForm(res.data)
        }
      })
      .finally(() => setLoading(false))
  }, [id])

  const handleDelete = async () => {
    if (!confirm('确定删除这个项目？')) return
    await fetch(`/api/projects/${id}`, { method: 'DELETE', credentials: 'include' })
    navigate('/projects')
  }

  const handleSave = async () => {
    const res = await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: form.name,
        period: form.period,
        role: form.role,
        summary: form.summary,
      }),
    })
    if (res.ok) {
      const json = await res.json()
      if (json.success) {
        setProject(json.data)
        setEditing(false)
      }
    }
  }

  if (loading) return <p className="text-slate-500">加载中...</p>
  if (!project) return <p className="text-slate-500">项目不存在</p>

  return (
    <div>
      <button
        onClick={() => navigate('/projects')}
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-300 mb-4"
      >
        <ArrowLeft size={14} />
        返回项目列表
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          {project.period && <p className="text-sm text-slate-500 mt-1">{project.period}</p>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setEditing(!editing)}
            className="flex items-center gap-1 px-3 py-2 rounded-md border border-slate-700 text-slate-400 text-sm hover:text-slate-200"
          >
            <Edit size={14} />
            {editing ? '取消' : '编辑'}
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1 px-3 py-2 rounded-md border border-red-900 text-red-400 text-sm hover:bg-red-950"
          >
            <Trash2 size={14} />
            删除
          </button>
        </div>
      </div>

      {editing ? (
        <div className="space-y-4 p-4 rounded-lg border border-slate-800 bg-slate-900">
          <div>
            <label className="block text-sm text-slate-400 mb-1">项目名称</label>
            <input
              type="text"
              value={form.name || ''}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-800 text-slate-100"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-400 mb-1">时间段</label>
              <input
                type="text"
                value={form.period || ''}
                onChange={(e) => setForm({ ...form, period: e.target.value })}
                className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-800 text-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">角色</label>
              <input
                type="text"
                value={form.role || ''}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-800 text-slate-100"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">概述</label>
            <textarea
              value={form.summary || ''}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-800 text-slate-100"
            />
          </div>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-500"
          >
            保存
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {project.role && (
            <div className="p-4 rounded-lg border border-slate-800 bg-slate-900">
              <h2 className="text-sm text-slate-500 mb-1">担任角色</h2>
              <p className="text-slate-200">{project.role}</p>
            </div>
          )}

          {project.summary && (
            <div className="p-4 rounded-lg border border-slate-800 bg-slate-900">
              <h2 className="text-sm text-slate-500 mb-1">项目概述</h2>
              <p className="text-slate-300 leading-relaxed">{project.summary}</p>
            </div>
          )}

          {project.keywords.length > 0 && (
            <div className="p-4 rounded-lg border border-slate-800 bg-slate-900">
              <h2 className="text-sm text-slate-500 mb-2">技术关键词</h2>
              <div className="flex flex-wrap gap-2">
                {project.keywords.map((k) => (
                  <span key={k} className="px-2 py-1 rounded text-sm bg-slate-800 text-slate-300">
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}

          {project.source === 'resume' && project.sourceResumeId && (
            <div className="p-4 rounded-lg border border-slate-800 bg-slate-900">
              <p className="text-sm text-slate-500">
                来源：
                <Link to={`/resumes/${project.sourceResumeId}`} className="text-emerald-400 hover:text-emerald-300">
                  简历解析
                </Link>
              </p>
            </div>
          )}

          <Link
            to="/training/interview/new"
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-500 w-fit"
          >
            <Dumbbell size={16} />
            开始项目训练
          </Link>
        </div>
      )}
    </div>
  )
}
