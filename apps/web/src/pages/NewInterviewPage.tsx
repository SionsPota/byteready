import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mic } from 'lucide-react'

interface ResumeOption {
  id: string
  title: string
}

interface ProjectOption {
  id: string
  name: string
}

const TRAINING_TYPES = [
  { value: 'full', label: '整面面试', desc: '完整流程：自我介绍→项目问答→随机问答' },
  { value: 'self_intro', label: '自我介绍', desc: '仅练习自我介绍环节' },
  { value: 'project_qa', label: '项目问答', desc: '仅练习项目深挖与交叉追问' },
  { value: 'random_qa', label: '随机问答', desc: '仅练习技术问答（八股/算法/场景）' },
]

const POSITIONS = ['frontend', 'backend', 'algorithm', 'data', 'ai']

const PERSONAS = [
  { value: 'standard', label: '标准严肃型', desc: '专业、冷静、层层递进' },
  { value: 'friendly', label: '亲和引导型', desc: '温和、鼓励、给提示' },
  { value: 'aggressive', label: '压力挑战型', desc: '直接、挑战、快节奏' },
]

export function NewInterviewPage() {
  const navigate = useNavigate()
  const [trainingType, setTrainingType] = useState('full')
  const [position, setPosition] = useState('backend')
  const [targetCompany, setTargetCompany] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [personaId, setPersonaId] = useState('')
  const [resumeId, setResumeId] = useState('')
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([])
  const [resumes, setResumes] = useState<ResumeOption[]>([])
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/resumes', { credentials: 'include' })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setResumes(res.data)
      })
    fetch('/api/projects', { credentials: 'include' })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setProjects(res.data)
      })
  }, [])

  const handleSubmit = async () => {
    setLoading(true)
    const body: Record<string, unknown> = {
      type: trainingType,
      position,
    }
    if (targetCompany.trim()) body.target_company = targetCompany.trim()
    if (jobDescription.trim()) body.job_description = jobDescription.trim()
    if (personaId) body.persona_id = personaId
    if (resumeId) body.resume_id = resumeId
    if (selectedProjectIds.length > 0) body.project_ids = selectedProjectIds

    const res = await fetch('/api/training', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    })
    const json = await res.json()
    setLoading(false)

    if (json.success) {
      navigate(`/training/${json.data.id}`)
    }
  }

  const toggleProject = (pid: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(pid) ? prev.filter((id) => id !== pid) : [...prev, pid]
    )
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">新建训练</h1>

      <div className="space-y-5 p-6 rounded-lg border border-slate-800 bg-slate-900">
        {/* 训练类型 */}
        <div>
          <label className="block text-sm text-slate-400 mb-2">训练类型</label>
          <div className="space-y-2">
            {TRAINING_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setTrainingType(t.value)}
                className={`w-full text-left px-4 py-3 rounded-md border transition-colors ${
                  trainingType === t.value
                    ? 'border-emerald-500 bg-emerald-950/50'
                    : 'border-slate-700 hover:border-slate-500'
                }`}
              >
                <div className={`font-medium ${trainingType === t.value ? 'text-emerald-400' : 'text-slate-200'}`}>
                  {t.label}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 岗位 */}
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

        {/* 目标公司 */}
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

        {/* 岗位描述 */}
        <div>
          <label className="block text-sm text-slate-400 mb-1">岗位描述 JD（可选）</label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="粘贴岗位描述，AI 会据此调整出题方向..."
            rows={4}
            className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-slate-600 resize-none"
          />
        </div>

        {/* 面试官风格 */}
        <div>
          <label className="block text-sm text-slate-400 mb-2">面试官风格（可选）</label>
          <div className="flex gap-2">
            {PERSONAS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPersonaId(p.value === personaId ? '' : p.value)}
                className={`flex-1 text-left px-3 py-2 rounded-md text-sm border transition-colors ${
                  personaId === p.value
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-950'
                    : 'border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
              >
                <div className="font-medium">{p.label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{p.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 关联简历 */}
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

        {/* 关联项目（项目问答时必填） */}
        {(trainingType === 'project_qa' || trainingType === 'full') && projects.length > 0 && (
          <div>
            <label className="block text-sm text-slate-400 mb-1">
              选择项目{trainingType === 'project_qa' ? '（必填）' : '（可选）'}
            </label>
            <div className="space-y-1">
              {projects.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-md border border-slate-800 cursor-pointer hover:border-slate-600"
                >
                  <input
                    type="checkbox"
                    checked={selectedProjectIds.includes(p.id)}
                    onChange={() => toggleProject(p.id)}
                    className="accent-emerald-500"
                  />
                  <span className="text-sm text-slate-300">{p.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || (trainingType === 'project_qa' && selectedProjectIds.length === 0)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md bg-emerald-600 text-white font-medium hover:bg-emerald-500 disabled:opacity-50 transition-colors"
        >
          <Mic size={18} />
          {loading ? '创建中...' : '开始训练'}
        </button>
      </div>
    </div>
  )
}
