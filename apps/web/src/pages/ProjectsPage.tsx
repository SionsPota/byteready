import { Link } from 'react-router-dom'
import { Plus, FolderGit2, Trash2 } from 'lucide-react'
import { useApi } from '../hooks/useApi.ts'
import { invalidateKey } from '../lib/api.ts'

interface Project {
  id: string
  name: string
  period: string | null
  role: string | null
  summary: string | null
  keywords: string[]
  source: string | null
  createdAt: number
}

export function ProjectsPage() {
  const { data: projects, loading, refresh } = useApi<Project[]>('/api/projects', {
    ttl: 30_000,
  })

  const list = projects ?? []

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除这个项目？')) return
    await fetch(`/api/projects/${id}`, { method: 'DELETE', credentials: 'include' })
    invalidateKey('/api/projects')
    refresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">项目管理</h1>
        <Link to="/projects/new" className="flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 transition-colors">
          <Plus size={16} />
          新建项目
        </Link>
      </div>

      {loading && list.length === 0 ? (
        <p className="text-slate-500">加载中...</p>
      ) : list.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-800 rounded-lg">
          <p className="text-slate-500">还没有项目</p>
          <p className="text-sm text-slate-600 mt-1">从简历解析会自动生成项目</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {list.map((p) => (
            <div
              key={p.id}
              className="p-4 rounded-lg border border-slate-800 bg-slate-900"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <FolderGit2 size={16} className="text-slate-500" />
                    <h3 className="font-medium">{p.name}</h3>
                  </div>
                  {p.role && <p className="text-sm text-slate-400 mt-1">{p.role}</p>}
                  {p.period && <p className="text-xs text-slate-600">{p.period}</p>}
                  {p.summary && (
                    <p className="text-sm text-slate-500 mt-2 line-clamp-2">{p.summary}</p>
                  )}
                  {p.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {p.keywords.map((k) => (
                        <span key={k} className="px-1.5 py-0.5 rounded text-xs bg-slate-800 text-slate-400">
                          {k}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="p-2 text-slate-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
