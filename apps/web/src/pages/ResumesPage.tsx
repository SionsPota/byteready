import { useState, useRef, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  FileText,
  Trash2,
  Upload,
  X,
  Loader2,
  FolderGit2,
  RefreshCw,
  Edit,
  User,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Briefcase,
  Wrench,
} from 'lucide-react'
import { useApi } from '../hooks/useApi.ts'
import { invalidateKey } from '../lib/api.ts'

interface Resume {
  id: string
  title: string
  sourceFormat: string
  parsedAt: number | null
  createdAt: number
}

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

export function ResumesPage() {
  const { data: resumes, loading: resumesLoading, refresh } = useApi<Resume[]>('/api/resumes', {
    ttl: 30_000,
  })

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ResumeDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [reparsing, setReparsing] = useState(false)

  const [showPaste, setShowPaste] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [pasteTitle, setPasteTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const list = resumes ?? []

  const reload = useCallback(() => {
    invalidateKey('/api/resumes')
    refresh()
  }, [refresh])

  // 选中简历后获取详情（含项目）
  useEffect(() => {
    if (!selectedId) {
      setDetail(null)
      return
    }
    setDetailLoading(true)
    fetch(`/api/resumes/${selectedId}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          const d = res.data
          setDetail({
            id: d.id,
            title: d.title,
            sourceFormat: d.sourceFormat,
            parsedAt: d.parsedAt,
            createdAt: d.createdAt,
            contact: d.contact || {},
            summary: d.summary ?? null,
            educations: Array.isArray(d.educations) ? d.educations : [],
            experiences: Array.isArray(d.experiences) ? d.experiences : [],
            skills: Array.isArray(d.skills) ? d.skills : [],
            projects: Array.isArray(d.projects) ? d.projects : [],
          })
        }
      })
      .finally(() => setDetailLoading(false))
  }, [selectedId])

  // 默认选中第一个简历
  useEffect(() => {
    const first = list[0]
    if (first && !selectedId) {
      setSelectedId(first.id)
    }
  }, [list, selectedId])

  const handlePasteSubmit = async () => {
    if (!pasteTitle.trim() || !pasteText.trim()) return
    const res = await fetch('/api/resumes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title: pasteTitle, raw_text: pasteText, source_format: 'paste' }),
    })
    if (res.ok) {
      setShowPaste(false)
      setPasteText('')
      setPasteTitle('')
      reload()
    }
  }

  const handleFileUpload = useCallback(
    async (file: File) => {
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (!ext || !['pdf', 'docx'].includes(ext)) {
        setUploadError('仅支持 PDF 和 DOCX 格式')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('文件大小不能超过 10MB')
        return
      }

      setUploading(true)
      setUploadError('')

      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', file.name.replace(/\.[^.]+$/, ''))

      try {
        const res = await fetch('/api/resumes', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        })
        const json = await res.json()
        if (!res.ok) {
          setUploadError(json.error?.message || '上传失败')
        } else {
          reload()
        }
      } catch {
        setUploadError('网络错误，请重试')
      } finally {
        setUploading(false)
      }
    },
    [reload],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFileUpload(file)
    },
    [handleFileUpload],
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileUpload(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDeleteResume = async (id: string) => {
    if (!confirm('确定删除这份简历？')) return
    await fetch(`/api/resumes/${id}`, { method: 'DELETE', credentials: 'include' })
    if (selectedId === id) setSelectedId(null)
    reload()
  }

  const handleReparse = async () => {
    if (!detail) return
    if (!confirm('重新解析将替换现有的结构化信息，确定继续？')) return
    setReparsing(true)
    const res = await fetch(`/api/resumes/${detail.id}/reparse`, {
      method: 'POST',
      credentials: 'include',
    })
    const json = await res.json()
    setReparsing(false)
    if (json.success) {
      const d = json.data
      setDetail({
        id: d.id,
        title: d.title,
        sourceFormat: d.sourceFormat,
        parsedAt: d.parsedAt,
        createdAt: d.createdAt,
        contact: d.contact || {},
        summary: d.summary ?? null,
        educations: d.educations || [],
        experiences: d.experiences || [],
        skills: d.skills || [],
        projects: d.projects || [],
      })
    }
  }

  const handleDeleteProject = async (pid: string) => {
    if (!confirm('确定删除这个项目？')) return
    await fetch(`/api/projects/${pid}`, { method: 'DELETE', credentials: 'include' })
    if (detail) {
      setDetail({
        ...detail,
        projects: detail.projects.filter((p) => p.id !== pid),
      })
    }
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-4rem)]">
      {/* 左侧：简历列表 */}
      <div className="w-72 flex flex-col gap-4 shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">我的简历</h1>
          <button
            onClick={() => {
              setShowPaste(!showPaste)
              setUploadError('')
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-slate-100 text-slate-950 text-xs font-medium hover:bg-slate-200 transition-colors"
          >
            <Plus size={14} />
            粘贴
          </button>
        </div>

        {/* 上传区域 */}
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-3 rounded-lg border-2 border-dashed cursor-pointer transition-colors text-center ${
            dragOver
              ? 'border-emerald-500 bg-emerald-950/30'
              : 'border-slate-700 bg-slate-900 hover:border-slate-500'
          }`}
        >
          <input ref={fileInputRef} type="file" accept=".pdf,.docx" onChange={handleFileChange} className="hidden" />
          {uploading ? (
            <div className="flex flex-col items-center gap-1">
              <Loader2 size={16} className="text-emerald-400 animate-spin" />
              <p className="text-xs text-slate-400">解析中...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <Upload size={16} className="text-slate-500" />
              <p className="text-xs text-slate-400">拖拽或点击上传 PDF/DOCX</p>
            </div>
          )}
        </div>

        {uploadError && (
          <div className="p-2 rounded-lg bg-red-950/50 border border-red-900 text-red-400 text-xs flex items-center justify-between">
            {uploadError}
            <button onClick={() => setUploadError('')}>
              <X size={12} />
            </button>
          </div>
        )}

        {showPaste && (
          <div className="p-3 rounded-lg border border-slate-800 bg-slate-900 space-y-2">
            <input
              type="text"
              value={pasteTitle}
              onChange={(e) => setPasteTitle(e.target.value)}
              placeholder="简历标题"
              className="w-full px-2 py-1.5 rounded-md bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-slate-600"
            />
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="粘贴简历内容..."
              rows={5}
              className="w-full px-2 py-1.5 rounded-md bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-slate-600"
            />
            <div className="flex gap-2">
              <button
                onClick={handlePasteSubmit}
                className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs hover:bg-emerald-500 transition-colors"
              >
                保存
              </button>
              <button
                onClick={() => setShowPaste(false)}
                className="px-3 py-1.5 rounded-md border border-slate-700 text-slate-400 text-xs hover:text-slate-200 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* 简历列表 */}
        <div className="flex-1 overflow-y-auto space-y-2 -mr-2 pr-2">
          {resumesLoading && list.length === 0 ? (
            <p className="text-sm text-slate-500">加载中...</p>
          ) : list.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-slate-800 rounded-lg">
              <p className="text-sm text-slate-500">还没有简历</p>
              <p className="text-xs text-slate-600 mt-1">上传或粘贴简历</p>
            </div>
          ) : (
            list.map((r) => {
              const active = selectedId === r.id
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors group ${
                    active
                      ? 'border-emerald-500/50 bg-emerald-950/20'
                      : 'border-slate-800 bg-slate-900 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText size={14} className={active ? 'text-emerald-400' : 'text-slate-500'} />
                    <span className={`text-sm font-medium truncate ${active ? 'text-emerald-100' : 'text-slate-200'}`}>
                      {r.title}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-slate-500">
                      {new Date(r.createdAt).toLocaleDateString('zh-CN')} ·{' '}
                      {r.sourceFormat === 'paste' ? '粘贴' : (r.sourceFormat ?? 'unknown').toUpperCase()}
                      {r.parsedAt && ' · 已解析'}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteResume(r.id)
                      }}
                      className="p-1 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* 右侧：选中简历的完整详情 */}
      <div className="flex-1 overflow-y-auto min-w-0">
        {!selectedId ? (
          <div className="flex items-center justify-center h-full text-slate-500">
            <p>选择一份简历查看详情</p>
          </div>
        ) : detailLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={20} className="text-slate-500 animate-spin" />
          </div>
        ) : !detail ? (
          <div className="flex items-center justify-center h-full text-slate-500">
            <p>简历不存在</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 简历头部 */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold">{detail.title}</h2>
                <p className="text-sm text-slate-500 mt-1">
                  来源：{detail.sourceFormat === 'paste' ? '粘贴' : (detail.sourceFormat ?? 'unknown').toUpperCase()}
                  {detail.parsedAt ? ' · 已解析' : ' · 未解析'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleReparse}
                  disabled={reparsing}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-700 text-slate-400 text-sm hover:text-slate-200 transition-colors disabled:opacity-50"
                >
                  {reparsing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  重新解析
                </button>
                <Link
                  to={`/resumes/${detail.id}/edit`}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-500 transition-colors"
                >
                  <Edit size={14} />
                  编辑
                </Link>
              </div>
            </div>

            {/* 联系信息 */}
            <section className="p-4 rounded-lg border border-slate-800 bg-slate-900">
              <div className="flex items-center gap-2 mb-3">
                <User size={16} className="text-slate-500" />
                <h3 className="font-semibold">联系信息</h3>
              </div>
              {detail.contact.name || detail.contact.email || detail.contact.phone ? (
                <div className="grid grid-cols-2 gap-3">
                  {detail.contact.name && (
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <User size={14} className="text-slate-600" />
                      {detail.contact.name}
                    </div>
                  )}
                  {detail.contact.email && (
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Mail size={14} className="text-slate-600" />
                      {detail.contact.email}
                    </div>
                  )}
                  {detail.contact.phone && (
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Phone size={14} className="text-slate-600" />
                      {detail.contact.phone}
                    </div>
                  )}
                  {detail.contact.location && (
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <MapPin size={14} className="text-slate-600" />
                      {detail.contact.location}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-600">暂无联系信息</p>
              )}
            </section>

            {/* 个人简介 */}
            {detail.summary && (
              <section className="p-4 rounded-lg border border-slate-800 bg-slate-900">
                <h3 className="font-semibold mb-2">个人简介</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{detail.summary}</p>
              </section>
            )}

            {/* 教育经历 */}
            <section className="p-4 rounded-lg border border-slate-800 bg-slate-900">
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap size={16} className="text-slate-500" />
                <h3 className="font-semibold">教育经历</h3>
              </div>
              {detail.educations.length > 0 ? (
                <div className="space-y-3">
                  {detail.educations.map((edu, i) => (
                    <div key={i} className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{edu.school}</p>
                        <p className="text-sm text-slate-400">
                          {edu.major} · {edu.degree}
                        </p>
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
                <h3 className="font-semibold">工作经历</h3>
              </div>
              {detail.experiences.length > 0 ? (
                <div className="space-y-3">
                  {detail.experiences.map((exp, i) => (
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
                <h3 className="font-semibold">技能</h3>
              </div>
              {detail.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {detail.skills.map((skill, i) => (
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

            {/* 项目列表 */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <FolderGit2 size={18} className="text-slate-500" />
                <h3 className="font-semibold">项目经历</h3>
                <span className="text-xs text-slate-500">({detail.projects.length})</span>
              </div>

              {detail.projects.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-800 rounded-lg">
                  <p className="text-slate-500">该简历暂无项目</p>
                  <p className="text-sm text-slate-600 mt-1">上传简历后自动解析，或使用编辑功能添加</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {detail.projects.map((p) => (
                    <Link
                      to={`/projects/${p.id}`}
                      key={p.id}
                      className="p-4 rounded-lg border border-slate-800 bg-slate-900 group hover:border-slate-600 transition-colors block"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <FolderGit2 size={14} className="text-slate-500 shrink-0" />
                            <h4 className="font-medium text-sm truncate">{p.name}</h4>
                          </div>
                          {p.role && <p className="text-sm text-slate-400 mt-1">{p.role}</p>}
                          {p.period && <p className="text-xs text-slate-600">{p.period}</p>}
                          {p.summary && <p className="text-sm text-slate-500 mt-2 line-clamp-2">{p.summary}</p>}
                          {Array.isArray(p.keywords) && p.keywords.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {p.keywords.map((k) => (
                                <span
                                  key={k}
                                  className="px-1.5 py-0.5 rounded text-xs bg-slate-800 text-slate-400"
                                >
                                  {k}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleDeleteProject(p.id)
                          }}
                          className="p-1.5 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
