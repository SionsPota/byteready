import { Hono } from 'hono'
import { err, ok, resumeCreateSchema, projectUpdateSchema, resumeUpdateSchema } from '@byteready/shared'
import { requireAuth } from '../lib/auth/middleware.ts'
import { getDb } from '../lib/db/client.ts'
import { createResumeRepository } from '../lib/resume/repository.ts'
import { extractResumeInfo, extractProjectsFromResume } from '../lib/resume/extractor.ts'
import { optimizeResumeText } from '../lib/resume-optimizer.ts'
import { extractTextFromPDF } from '../lib/pdf-parser.ts'
import { convertToHtml } from 'mammoth'
import { env } from '../env.ts'

export const resumesRoute = new Hono()
resumesRoute.use('*', requireAuth)

const getRepo = () => createResumeRepository(getDb())

// 辅助：安全解析 JSON 字段
const safeJsonParse = (str: string | null): unknown => {
  if (!str) return null
  try { return JSON.parse(str) } catch { return null }
}
const safeJsonArray = (str: string | null): unknown[] => {
  const v = safeJsonParse(str)
  return Array.isArray(v) ? v : []
}

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

  // 大模型优化
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

  // 提取全部结构化信息
  let parsedData: import('../lib/resume/repository.ts').ParsedResumeData | undefined
  if (env.KIMI_API_KEY) {
    try {
      const extracted = await extractResumeInfo(optimizedText)
      parsedData = extracted
      console.log('[resume-upload] extracted:', {
        contact: extracted.contact.name,
        educations: extracted.educations.length,
        experiences: extracted.experiences.length,
        skills: extracted.skills.length,
        projects: extracted.projects.length,
      })
    } catch (e) {
      console.error('[resume] 简历提取失败:', e)
    }
  }

  rawText = optimizedText
  const projects = parsedData?.projects ?? []

  const repo = getRepo()
  const resume = repo.create({
    ownerId: userId,
    title,
    rawText,
    sourceFormat,
    parsedData,
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
    contact: {
      name: row.contact_name,
      email: row.contact_email,
      phone: row.contact_phone,
      location: row.contact_location,
    },
    summary: row.summary,
    educations: safeJsonArray(row.educations),
    experiences: safeJsonArray(row.experiences),
    skills: safeJsonArray(row.skills),
    projectIds: safeJsonArray(row.project_ids),
    projects: row.projects.map((p) => ({
      id: p.id,
      name: p.name,
      period: p.period,
      role: p.role,
      summary: p.summary,
      keywords: p.keywords ? JSON.parse(p.keywords) : [],
      source: p.source,
    })),
  }))
})

// PATCH /api/resumes/:id - 编辑
resumesRoute.patch('/:id', async (c) => {
  const userId = c.get('userId' as never) as string
  const id = c.req.param('id')
  const repo = getRepo()

  const resume = repo.getById(id)
  if (!resume || resume.owner_id !== userId) {
    return c.json(err('NOT_FOUND', '简历不存在'), 404)
  }

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json(err('VALIDATION', '请求体必须是 JSON'), 400)
  }

  const parsed = resumeUpdateSchema.safeParse(body)
  if (!parsed.success) {
    const messages = parsed.error.issues.map((i) => i.message).join('; ')
    return c.json(err('VALIDATION', messages), 400)
  }

  const data = parsed.data
  repo.update(id, {
    title: data.title,
    contact_name: data.contact_name,
    contact_email: data.contact_email,
    contact_phone: data.contact_phone,
    contact_location: data.contact_location,
    summary: data.summary,
    educations: data.educations,
    experiences: data.experiences,
    skills: data.skills,
    project_ids: data.project_ids,
  })

  const updated = repo.getById(id)
  return c.json(ok(updated))
})

// POST /api/resumes/:id/reparse - 重新解析
resumesRoute.post('/:id/reparse', async (c) => {
  const userId = c.get('userId' as never) as string
  const id = c.req.param('id')
  const repo = getRepo()

  const resume = repo.getById(id)
  if (!resume || resume.owner_id !== userId) {
    return c.json(err('NOT_FOUND', '简历不存在'), 404)
  }

  const rawText = resume.raw_text
  if (!rawText.trim()) {
    return c.json(err('VALIDATION', '简历内容为空，无法解析'), 400)
  }

  // 重新提取全部结构化信息
  let parsedData: import('../lib/resume/repository.ts').ParsedResumeData | undefined
  if (env.KIMI_API_KEY) {
    try {
      const extracted = await extractResumeInfo(rawText)
      parsedData = extracted
      console.log('[resume-reparse] extracted:', {
        contact: extracted.contact.name,
        educations: extracted.educations.length,
        experiences: extracted.experiences.length,
        skills: extracted.skills.length,
        projects: extracted.projects.length,
      })
    } catch (e) {
      console.error('[resume] 重新解析失败:', e)
      return c.json(err('PARSE_ERROR', '重新解析失败，请稍后重试'), 500)
    }
  }

  const projects = parsedData?.projects ?? []
  repo.reparse(id, rawText, projects, userId, parsedData)

  const updated = repo.getById(id)
  return c.json(ok(updated))
})

// PATCH /api/resumes/:id/projects/:pid - 编辑项目（V1 兼容，推荐使用 /api/projects/:id）
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
  if (!project || project.source_resume_id !== resumeId) {
    return c.json(err('NOT_FOUND', '项目不存在'), 404)
  }

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json(err('VALIDATION', '请求体必须是 JSON'), 400)
  }

  const parsed = projectUpdateSchema.safeParse(body)
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
    source: updated!.source,
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
