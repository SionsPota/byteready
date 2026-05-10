import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dumbbell } from 'lucide-react'

interface ResumeOption {
  id: string
  title: string
}

const POSITIONS = ['frontend', 'backend', 'algorithm', 'data', 'ai']

export function NewTrainingPage() {
  const navigate = useNavigate()
  const [position, setPosition] = useState('backend')
  const [targetCompany, setTargetCompany] = useState('')
  const [resumeId, setResumeId] = useState('')
  const [resumes, setResumes] = useState<ResumeOption[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/resumes', { credentials: 'include' })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setResumes(res.data)
      })
  }, [])

  const handleSubmit = async () => {
    setLoading(true)
    const body: Record<string, unknown> = { position }
    if (targetCompany.trim()) body.target_company = targetCompany.trim()
    if (resumeId) body.resume_id = resumeId

    const res = await fetch('/api/training', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    })
    const json = await res.json()
    setLoading(false)

    if (json.success) {
      navigate(`/training/interview/${json.data.id}`)
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">新建训练</h1>

      <div className="space-y-5 p-6 rounded-lg border border-slate-800 bg-slate-900">
        <div>
          <label className="block text-sm text-slate-400 mb-2">目标岗位</label>
          <div className="flex flex-wrap gap-2">
            {POSITIONS.map((p) => (
              <button
                key={p}
                onClick={() => setPosition(p)}
                className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                  position === p
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-950'
                    : 'border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">目标公司（可选）</label>
          <input
            type="text"
            value={targetCompany}
            onChange={(e) => setTargetCompany(e.target.value)}
            placeholder="如：字节跳动、阿里"
            className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-slate-600"
          />
        </div>

        {resumes.length > 0 && (
          <div>
            <label className="block text-sm text-slate-400 mb-1">关联简历（可选）</label>
            <select
              value={resumeId}
              onChange={(e) => setResumeId(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-slate-600"
            >
              <option value="">不关联</option>
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md bg-emerald-600 text-white font-medium hover:bg-emerald-500 disabled:opacity-50 transition-colors"
        >
          <Dumbbell size={18} />
          {loading ? '创建中...' : '开始训练'}
        </button>
      </div>
    </div>
  )
}
