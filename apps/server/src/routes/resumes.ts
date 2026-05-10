import { Hono } from 'hono'
import { err, ok, resumeCreateSchema, resumeProjectUpdateSchema } from '@byteready/shared'
import { requireAuth } from '../lib/auth/middleware.ts'
import { getDb } from '../lib/db/client.ts'
import { createResumeRepository } from '../lib/resume/repository.ts'
import { extractProjectsFromResume } from '../lib/resume/extractor.ts'
import { optimizeResumeText } from '../lib/resume-optimizer.ts'
import { extractTextFromPDF } from '../lib/pdf-parser.ts'
import { convertToHtml } from 'mammoth'
import { env } from '../env.ts'

export const resumesRoute = new Hono()
resumesRoute.use('*', requireAuth)

const getRepo = () => createResumeRepository(getDb())

// GET /api/resumes - 列表
resumesRoute.get('/', (c) => {
  const userId = c.get('userId' as never) as string
  const repo = getRepo()
  const rows = repo.listByOwner(userId)
  return c.json(ok(rows.map((r) => ({
    id: r.id,
    title: r.title,
    sourceFormat: r.source_format,
    parsedAt: r.parsed_at,
    createdAt: r.created_at,
  }))))
})

// POST /api/resumes - 创建
resumesRoute.post('/', async (c) => {
  const userId = c.get('userId' as never) as string
  const contentType = c.req.header('content-type') ?? ''

  let rawText = ''
  let title = ''
  let sourceFormat: 'pdf' | 'docx' | 'paste' = 'paste'

  if (contentType.includes('multipart/form-data')) {
    const formData = await c.req.formData()
    const file = formData.get('file')
    title = String(formData.get('title') ?? '')

    console.log('[resume-upload] content-type:', contentType)
    console.log('[resume-upload] file type:', typeof file, file?.constructor?.name)

    if (!file || typeof file !== 'object') {
      return c.json(err('VALIDATION', '请上传文件'), 400)
    }

    // 不依赖 instanceof File，直接检查是否有 arrayBuffer 方法
    const fileObj = file as { arrayBuffer(): Promise<ArrayBuffer>; name: string }
    const buffer = new Uint8Array(await fileObj.arrayBuffer())
    const ext = fileObj.name.split('.').pop()?.toLowerCase()

    console.log('[resume-upload] file name:', fileObj.name, 'ext:', ext, 'size:', buffer.length)

    if (ext === 'pdf') {
      sourceFormat = 'pdf'
      const pages = await extractTextFromPDF(buffer)
      rawText = pages.map((p) => p.text).join('\n')
      console.log('[resume-upload] PDF extracted, length:', rawText.length)
    } else if (ext === 'docx') {
      sourceFormat = 'docx'
      const result = await convertToHtml({ buffer: Buffer.from(buffer) })
      rawText = result.value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      console.log('[resume-upload] DOCX extracted, length:', rawText.length)
    } else {
      return c.json(err('VALIDATION', '不支持的文件格式，仅支持 PDF 和 DOCX'), 400)
    }

    if (!title) title = fileObj.name.replace(/\.[^.]+$/, '')
  } else {
    // JSON body (paste)
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json(err('VALIDATION', '请求体必须是 JSON 或 multipart'), 400)
    }

    const parsed = resumeCreateSchema.safeParse(body)
    if (!parsed.success) {
      const messages = parsed.error.issues.map((i) => i.message).join('; ')
      return c.json(err('VALIDATION', messages), 400)
    }

    rawText = parsed.data.raw_text
    title = parsed.data.title
    sourceFormat = parsed.data.source_format
  }

  if (!rawText.trim()) {
    return c.json(err('VALIDATION', '简历内容为空'), 400)
  }

  // 大模型优化：清洗/格式化原始文本（PDF/DOCX 提取的文本通常混乱）
  let optimizedText = rawText
  if (env.KIMI_API_KEY && sourceFormat !== 'paste') {
    try {
      optimizedText = await optimizeResumeText(rawText)
      console.log('[resume-upload] optimized text length:', optimizedText.length)
    } catch (e) {
      console.error('[resume] 文本优化失败，使用原始文本:', e)
      optimizedText = rawText
    }
  }

  // 提取项目
  let projects: { name: string; period?: string; role?: string; summary?: string; keywords?: string[] }[] = []
  if (env.KIMI_API_KEY) {
    try {
      const extracted = await extractProjectsFromResume(optimizedText)
      projects = extracted.projects
      console.log('[resume-upload] extracted projects:', projects.length)
    } catch (e) {
      console.error('[resume] 项目提取失败:', e)
    }
  }

  // 使用优化后的文本落库
  rawText = optimizedText

  const repo = getRepo()
  const resume = repo.create({
    ownerId: userId,
    title,
    rawText,
    sourceFormat,
  }, projects)

  const detail = repo.getById(resume.id)
  return c.json(ok(detail), 201)
})

// GET /api/resumes/:id - 详情
resumesRoute.get('/:id', (c) => {
  const userId = c.get('userId' as never) as string
  const id = c.req.param('id')
  const repo = getRepo()
  const row = repo.getById(id)

  if (!row || row.owner_id !== userId) {
    return c.json(err('NOT_FOUND', '简历不存在'), 404)
  }

  return c.json(ok({
    id: row.id,
    title: row.title,
    rawText: row.raw_text,
    sourceFormat: row.source_format,
    parsedAt: row.parsed_at,
    createdAt: row.created_at,
    projects: row.projects.map((p) => ({
      id: p.id,
      name: p.name,
      period: p.period,
      role: p.role,
      summary: p.summary,
      keywords: p.keywords ? JSON.parse(p.keywords) : [],
      order: p.order,
    })),
  }))
})

// PATCH /api/resumes/:id/projects/:pid - 编辑项目
resumesRoute.patch('/:id/projects/:pid', async (c) => {
  const userId = c.get('userId' as never) as string
  const resumeId = c.req.param('id')
  const projectId = c.req.param('pid')
  const repo = getRepo()

  const resume = repo.getById(resumeId)
  if (!resume || resume.owner_id !== userId) {
    return c.json(err('NOT_FOUND', '简历不存在'), 404)
  }

  const project = repo.getProject(projectId)
  if (!project || project.resume_id !== resumeId) {
    return c.json(err('NOT_FOUND', '项目不存在'), 404)
  }

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json(err('VALIDATION', '请求体必须是 JSON'), 400)
  }

  const parsed = resumeProjectUpdateSchema.safeParse(body)
  if (!parsed.success) {
    const messages = parsed.error.issues.map((i) => i.message).join('; ')
    return c.json(err('VALIDATION', messages), 400)
  }

  const { name, period, role, summary, keywords } = parsed.data
  repo.updateProject(projectId, {
    name,
    period: period ?? null,
    role: role ?? null,
    summary: summary ?? null,
    keywords: keywords ?? null,
  })

  const updated = repo.getProject(projectId)
  return c.json(ok({
    id: updated!.id,
    name: updated!.name,
    period: updated!.period,
    role: updated!.role,
    summary: updated!.summary,
    keywords: updated!.keywords ? JSON.parse(updated!.keywords) : [],
    order: updated!.order,
  }))
})

// DELETE /api/resumes/:id
resumesRoute.delete('/:id', (c) => {
  const userId = c.get('userId' as never) as string
  const id = c.req.param('id')
  const repo = getRepo()

  const resume = repo.getById(id)
  if (!resume || resume.owner_id !== userId) {
    return c.json(err('NOT_FOUND', '简历不存在'), 404)
  }

  repo.delete(id)
  return c.json(ok({ message: '已删除' }))
})
