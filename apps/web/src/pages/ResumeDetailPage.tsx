import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Edit, RefreshCw, Mail, Phone, MapPin, User, GraduationCap, Briefcase, Wrench, FolderGit2, Loader2 } from 'lucide-react'

interface Project {
  id: string
  name: string
  period: string | null
  role: string | null
  summary: string | null
  keywords: string[]
  source: string | null
}

interface ResumeDetail {
  id: string
  title: string
  sourceFormat: string
  parsedAt: number | null
  createdAt: number
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
  projects: Project[]
}

export function ResumeDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [resume, setResume] = useState<ResumeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [reparsing, setReparsing] = useState(false)

  const fetchResume = () => {
    fetch(`/api/resumes/${id}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setResume({
            ...res.data,
            contact: res.data.contact || {},
            educations: Array.isArray(res.data.educations) ? res.data.educations : [],
            experiences: Array.isArray(res.data.experiences) ? res.data.experiences : [],
            skills: Array.isArray(res.data.skills) ? res.data.skills : [],
            projects: Array.isArray(res.data.projects) ? res.data.projects : [],
          })
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchResume()
  }, [id])

  const handleReparse = async () => {
    if (!confirm('重新解析将替换现有的结构化信息，确定继续？')) return
    setReparsing(true)
    const res = await fetch(`/api/resumes/${id}/reparse`, {
      method: 'POST',
      credentials: 'include',
    })
    const json = await res.json()
    setReparsing(false)
    if (json.success) {
      setResume({
        ...json.data,
        contact: json.data.contact || {},
        educations: Array.isArray(json.data.educations) ? json.data.educations : [],
        experiences: Array.isArray(json.data.experiences) ? json.data.experiences : [],
        skills: Array.isArray(json.data.skills) ? json.data.skills : [],
        projects: Array.isArray(json.data.projects) ? json.data.projects : [],
      })
    }
  }

  if (loading) return <p className="text-slate-500">加载中...</p>
  if (!resume) return <p className="text-slate-500">简历不存在</p>

  const hasStructuredData = resume.parsedAt && (
    resume.educations.length > 0 ||
    resume.experiences.length > 0 ||
    resume.skills.length > 0 ||
    resume.projects.length > 0
  )

  return (
    <div>
      <button
        onClick={() => navigate('/resumes')}
        className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-300 mb-4"
      >
        <ArrowLeft size={14} />
        返回简历列表
      </button>

      {/* 头部 */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{resume.title}</h1>
          <p className="text-sm text-slate-500 mt-1">
            来源：{resume.sourceFormat === 'paste' ? '粘贴' : resume.sourceFormat.toUpperCase()}
            {resume.parsedAt ? ' · 已解析' : ' · 未解析'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReparse}
            disabled={reparsing}
            className="flex items-center gap-1 px-3 py-2 rounded-md border border-slate-700 text-slate-400 text-sm hover:text-slate-200 transition-colors disabled:opacity-50"
          >
            {reparsing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            重新解析
          </button>
          <Link
            to={`/resumes/${id}/edit`}
            className="flex items-center gap-1 px-3 py-2 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-500 transition-colors"
          >
            <Edit size={14} />
            编辑
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        {/* 联系信息 */}
        <section className="p-4 rounded-lg border border-slate-800 bg-slate-900">
          <div className="flex items-center gap-2 mb-3">
            <User size={16} className="text-slate-500" />
            <h2 className="text-lg font-semibold">联系信息</h2>
          </div>
          {resume.contact.name || resume.contact.email || resume.contact.phone ? (
            <div className="grid grid-cols-2 gap-3">
              {resume.contact.name && (
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <User size={14} className="text-slate-600" />
                  {resume.contact.name}
                </div>
              )}
              {resume.contact.email && (
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Mail size={14} className="text-slate-600" />
                  {resume.contact.email}
                </div>
              )}
              {resume.contact.phone && (
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Phone size={14} className="text-slate-600" />
                  {resume.contact.phone}
                </div>
              )}
              {resume.contact.location && (
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <MapPin size={14} className="text-slate-600" />
                  {resume.contact.location}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-600">暂无联系信息</p>
          )}
        </section>

        {/* 个人简介 */}
        {resume.summary && (
          <section className="p-4 rounded-lg border border-slate-800 bg-slate-900">
            <h2 className="text-lg font-semibold mb-2">个人简介</h2>
            <p className="text-sm text-slate-300 leading-relaxed">{resume.summary}</p>
          </section>
        )}

        {/* 教育经历 */}
        <section className="p-4 rounded-lg border border-slate-800 bg-slate-900">
          <div className="flex items-center gap-2 mb-3">
            <GraduationCap size={16} className="text-slate-500" />
            <h2 className="text-lg font-semibold">教育经历</h2>
          </div>
          {resume.educations.length > 0 ? (
            <div className="space-y-3">
              {resume.educations.map((edu, i) => (
                <div key={i} className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{edu.school}</p>
                    <p className="text-sm text-slate-400">{edu.major} · {edu.degree}</p>
                  </div>
                  <span className="text-xs text-slate-600">{edu.period}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-600">暂无教育经历</p>
          )}
        </section>

        {/* 工作经历 */}
        <section className="p-4 rounded-lg border border-slate-800 bg-slate-900">
          <div className="flex items-center gap-2 mb-3">
            <Briefcase size={16} className="text-slate-500" />
            <h2 className="text-lg font-semibold">工作经历</h2>
          </div>
          {resume.experiences.length > 0 ? (
            <div className="space-y-3">
              {resume.experiences.map((exp, i) => (
                <div key={i}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{exp.company}</p>
                      <p className="text-sm text-slate-400">{exp.title}</p>
                    </div>
                    <span className="text-xs text-slate-600">{exp.period}</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">{exp.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-600">暂无工作经历</p>
          )}
        </section>

        {/* 技能 */}
        <section className="p-4 rounded-lg border border-slate-800 bg-slate-900">
          <div className="flex items-center gap-2 mb-3">
            <Wrench size={16} className="text-slate-500" />
            <h2 className="text-lg font-semibold">技能</h2>
          </div>
          {resume.skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {resume.skills.map((skill, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-full text-sm bg-slate-800 text-slate-300 border border-slate-700"
                >
                  {skill.name}
                  {skill.level && <span className="text-slate-600 ml-1">· {skill.level}</span>}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-600">暂无技能</p>
          )}
        </section>

        {/* 项目经历 */}
        <section className="p-4 rounded-lg border border-slate-800 bg-slate-900">
          <div className="flex items-center gap-2 mb-3">
            <FolderGit2 size={16} className="text-slate-500" />
            <h2 className="text-lg font-semibold">项目经历</h2>
          </div>
          {resume.projects.length > 0 ? (
            <div className="space-y-3">
              {resume.projects.map((p) => (
                <div key={p.id} className="p-3 rounded bg-slate-950 border border-slate-800">
                  <div className="flex items-start justify-between">
                    <p className="font-medium text-sm">{p.name}</p>
                    {p.period && <span className="text-xs text-slate-600">{p.period}</span>}
                  </div>
                  {p.role && <p className="text-sm text-slate-400 mt-0.5">{p.role}</p>}
                  {p.summary && <p className="text-sm text-slate-500 mt-1">{p.summary}</p>}
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
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-600">暂无项目</p>
          )}
        </section>
      </div>
    </div>
  )
}
