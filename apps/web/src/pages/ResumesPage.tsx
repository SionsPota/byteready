import { useEffect, useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Plus, FileText, Trash2, Upload, X, Loader2 } from 'lucide-react'

interface Resume {
  id: string
  title: string
  sourceFormat: string
  parsedAt: number | null
  createdAt: number
}

export function ResumesPage() {
  const [resumes, setResumes] = useState<Resume[]>([])
  const [loading, setLoading] = useState(true)
  const [showPaste, setShowPaste] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [pasteTitle, setPasteTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchResumes = () => {
    fetch('/api/resumes', { credentials: 'include' })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setResumes(res.data)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchResumes()
  }, [])

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
      fetchResumes()
    }
  }

  const handleFileUpload = useCallback(async (file: File) => {
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
        fetchResumes()
      }
    } catch {
      setUploadError('网络错误，请重试')
    } finally {
      setUploading(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }, [handleFileUpload])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileUpload(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除这份简历？')) return
    await fetch(`/api/resumes/${id}`, { method: 'DELETE', credentials: 'include' })
    fetchResumes()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">我的简历</h1>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowPaste(!showPaste); setUploadError('') }}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-slate-100 text-slate-950 text-sm font-medium hover:bg-slate-200 transition-colors"
          >
            <Plus size={16} />
            粘贴简历
          </button>
        </div>
      </div>

      {/* 文件上传区域 */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`mb-6 p-6 rounded-lg border-2 border-dashed cursor-pointer transition-colors text-center ${
          dragOver
            ? 'border-emerald-500 bg-emerald-950/30'
            : 'border-slate-700 bg-slate-900 hover:border-slate-500'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx"
          onChange={handleFileChange}
          className="hidden"
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={24} className="text-emerald-400 animate-spin" />
            <p className="text-sm text-slate-400">正在解析，请稍候...</p>
            <p className="text-xs text-slate-600">PDF 提取 → 大模型项目抽取中</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload size={24} className="text-slate-500" />
            <p className="text-sm text-slate-400">
              点击或拖拽上传 <span className="text-emerald-400 font-medium">PDF</span> / <span className="text-emerald-400 font-medium">DOCX</span> 简历
            </p>
            <p className="text-xs text-slate-600">支持大模型自动解析项目经历</p>
          </div>
        )}
      </div>

      {uploadError && (
        <div className="mb-4 p-3 rounded-lg bg-red-950/50 border border-red-900 text-red-400 text-sm flex items-center justify-between">
          {uploadError}
          <button onClick={() => setUploadError('')}>
            <X size={14} />
          </button>
        </div>
      )}

      {showPaste && (
        <div className="mb-6 p-4 rounded-lg border border-slate-800 bg-slate-900 space-y-3">
          <input
            type="text"
            value={pasteTitle}
            onChange={(e) => setPasteTitle(e.target.value)}
            placeholder="简历标题"
            className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-slate-600"
          />
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="粘贴简历内容..."
            rows={10}
            className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-slate-600"
          />
          <div className="flex gap-2">
            <button
              onClick={handlePasteSubmit}
              className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-500 transition-colors"
            >
              保存
            </button>
            <button
              onClick={() => setShowPaste(false)}
              className="px-4 py-2 rounded-md border border-slate-700 text-slate-400 text-sm hover:text-slate-200 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-slate-500">加载中...</p>
      ) : resumes.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-800 rounded-lg">
          <p className="text-slate-500">还没有简历</p>
          <p className="text-sm text-slate-600 mt-1">上传 PDF/DOCX 文件或粘贴简历内容</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {resumes.map((r) => (
            <div
              key={r.id}
              className="p-4 rounded-lg border border-slate-800 bg-slate-900 flex items-start justify-between"
            >
              <Link to={`/resumes/${r.id}`} className="flex-1">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-slate-500" />
                  <h3 className="font-medium">{r.title}</h3>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  {new Date(r.createdAt).toLocaleDateString('zh-CN')} · {r.sourceFormat === 'paste' ? '粘贴' : r.sourceFormat.toUpperCase()}
                  {r.parsedAt && ' · 已解析'}
                </p>
              </Link>
              <button
                onClick={() => handleDelete(r.id)}
                className="p-2 text-slate-600 hover:text-red-400 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
