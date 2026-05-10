import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react'

interface ResumeDetail {
  id: string
  title: string
  contact: {
    name: string | null
    email: string | null
    phone: string | null
    location: string | null
  }
  summary: string | null
  educations: { school: string; major: string; degree: string; period: string }[]
  experiences: { company: string; title: string; period: string; description: string }[]
  skills: { name: string; level?: string }[]
}

export function ResumeEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [resume, setResume] = useState<ResumeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/resumes/${id}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setResume({
            ...res.data,
            educations: res.data.educations || [],
            experiences: res.data.experiences || [],
            skills: res.data.skills || [],
          })
        }
      })
      .finally(() => setLoading(false))
  }, [id])

  const handleSave = async () => {
    if (!resume) return
    setSaving(true)
    const res = await fetch(`/api/resumes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(resume),
    })
    setSaving(false)
    if (res.ok) {
      navigate(`/resumes/${id}`)
    }
  }

  const updateField = (field: keyof ResumeDetail, value: unknown) => {
    setResume((prev) => prev ? { ...prev, [field]: value } : null)
  }

  const updateContact = (field: keyof ResumeDetail['contact'], value: string) => {
    setResume((prev) => prev ? { ...prev, contact: { ...prev.contact, [field]: value } } : null)
  }

  const addEducation = () => {
    setResume((prev) => prev ? { ...prev, educations: [...prev.educations, { school: '', major: '', degree: '', period: '' }] } : null)
  }

  const removeEducation = (idx: number) => {
    setResume((prev) => prev ? { ...prev, educations: prev.educations.filter((_, i) => i !== idx) } : null)
  }

  const updateEducation = (idx: number, field: 'school' | 'major' | 'degree' | 'period', value: string) => {
    setResume((prev) => {
      if (!prev) return null
      const next = [...prev.educations]
      next[idx] = { ...next[idx], [field]: value } as typeof next[0]
      return { ...prev, educations: next }
    })
  }

  const addExperience = () => {
    setResume((prev) => prev ? { ...prev, experiences: [...prev.experiences, { company: '', title: '', period: '', description: '' }] } : null)
  }

  const removeExperience = (idx: number) => {
    setResume((prev) => prev ? { ...prev, experiences: prev.experiences.filter((_, i) => i !== idx) } : null)
  }

  const updateExperience = (idx: number, field: 'company' | 'title' | 'period' | 'description', value: string) => {
    setResume((prev) => {
      if (!prev) return null
      const next = [...prev.experiences]
      next[idx] = { ...next[idx], [field]: value } as typeof next[0]
      return { ...prev, experiences: next }
    })
  }

  const addSkill = () => {
    setResume((prev) => prev ? { ...prev, skills: [...prev.skills, { name: '' }] } : null)
  }

  const removeSkill = (idx: number) => {
    setResume((prev) => prev ? { ...prev, skills: prev.skills.filter((_, i) => i !== idx) } : null)
  }

  const updateSkill = (idx: number, value: string) => {
    setResume((prev) => {
      if (!prev) return null
      const next = [...prev.skills]
      next[idx] = { ...next[idx], name: value }
      return { ...prev, skills: next }
    })
  }

  if (loading) return <p className="text-slate-500">加载中...</p>
  if (!resume) return <p className="text-slate-500">简历不存在</p>

  return (
    <div>
      <button
        onClick={() => navigate(`/resumes/${id}`)}
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-300 mb-4"
      >
        <ArrowLeft size={14} />
        返回详情
      </button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">编辑简历</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-500 disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? '保存中...' : '保存'}
        </button>
      </div>

      <div className="space-y-6">
        {/* 基本信息 */}
        <div className="p-4 rounded-lg border border-slate-800 bg-slate-900 space-y-3">
          <h2 className="text-lg font-semibold">基本信息</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500">标题</label>
              <input
                type="text"
                value={resume.title}
                onChange={(e) => updateField('title', e.target.value)}
                className="w-full mt-1 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">姓名</label>
              <input
                type="text"
                value={resume.contact.name ?? ''}
                onChange={(e) => updateContact('name', e.target.value)}
                className="w-full mt-1 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">邮箱</label>
              <input
                type="text"
                value={resume.contact.email ?? ''}
                onChange={(e) => updateContact('email', e.target.value)}
                className="w-full mt-1 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">电话</label>
              <input
                type="text"
                value={resume.contact.phone ?? ''}
                onChange={(e) => updateContact('phone', e.target.value)}
                className="w-full mt-1 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500">个人简介</label>
            <textarea
              value={resume.summary ?? ''}
              onChange={(e) => updateField('summary', e.target.value)}
              rows={3}
              className="w-full mt-1 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-sm"
            />
          </div>
        </div>

        {/* 教育经历 */}
        <div className="p-4 rounded-lg border border-slate-800 bg-slate-900 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">教育经历</h2>
            <button onClick={addEducation} className="flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300">
              <Plus size={14} /> 添加
            </button>
          </div>
          {resume.educations.map((edu, idx) => (
            <div key={idx} className="grid grid-cols-5 gap-2 items-end">
              <input placeholder="学校" value={edu.school} onChange={(e) => updateEducation(idx, 'school', e.target.value)} className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-sm" />
              <input placeholder="专业" value={edu.major} onChange={(e) => updateEducation(idx, 'major', e.target.value)} className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-sm" />
              <input placeholder="学位" value={edu.degree} onChange={(e) => updateEducation(idx, 'degree', e.target.value)} className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-sm" />
              <input placeholder="时间段" value={edu.period} onChange={(e) => updateEducation(idx, 'period', e.target.value)} className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-sm" />
              <button onClick={() => removeEducation(idx)} className="text-slate-600 hover:text-red-400"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>

        {/* 工作经历 */}
        <div className="p-4 rounded-lg border border-slate-800 bg-slate-900 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">工作经历</h2>
            <button onClick={addExperience} className="flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300">
              <Plus size={14} /> 添加
            </button>
          </div>
          {resume.experiences.map((exp, idx) => (
            <div key={idx} className="space-y-2">
              <div className="grid grid-cols-4 gap-2 items-end">
                <input placeholder="公司" value={exp.company} onChange={(e) => updateExperience(idx, 'company', e.target.value)} className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-sm" />
                <input placeholder="职位" value={exp.title} onChange={(e) => updateExperience(idx, 'title', e.target.value)} className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-sm" />
                <input placeholder="时间段" value={exp.period} onChange={(e) => updateExperience(idx, 'period', e.target.value)} className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-sm" />
                <button onClick={() => removeExperience(idx)} className="text-slate-600 hover:text-red-400"><Trash2 size={14} /></button>
              </div>
              <textarea placeholder="工作描述" value={exp.description} onChange={(e) => updateExperience(idx, 'description', e.target.value)} rows={2} className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-sm" />
            </div>
          ))}
        </div>

        {/* 技能 */}
        <div className="p-4 rounded-lg border border-slate-800 bg-slate-900 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">技能</h2>
            <button onClick={addSkill} className="flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300">
              <Plus size={14} /> 添加
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {resume.skills.map((skill, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <input
                  value={skill.name}
                  onChange={(e) => updateSkill(idx, e.target.value)}
                  className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-sm w-32"
                />
                <button onClick={() => removeSkill(idx)} className="text-slate-600 hover:text-red-400"><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
