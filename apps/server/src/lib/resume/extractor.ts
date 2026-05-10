import { getKimiClient, KIMI_INSTANT_MODE, KIMI_MODEL } from '../llm/kimi.ts'
import { loadSkill } from '../skills/prompt.ts'

export interface ExtractedContact {
  name: string | null
  email: string | null
  phone: string | null
  location: string | null
}

export interface ExtractedEducation {
  school: string
  major: string
  degree: string
  period: string
}

export interface ExtractedExperience {
  company: string
  title: string
  period: string
  description: string
}

export interface ExtractedSkill {
  name: string
  level?: string
}

export interface ExtractedProject {
  name: string
  period?: string
  role?: string
  summary?: string
  keywords?: string[]
}

export interface ExtractionResult {
  contact: ExtractedContact
  summary: string | null
  educations: ExtractedEducation[]
  experiences: ExtractedExperience[]
  skills: ExtractedSkill[]
  projects: ExtractedProject[]
}

function normalizeContact(raw: unknown): ExtractedContact {
  if (!raw || typeof raw !== 'object') {
    return { name: null, email: null, phone: null, location: null }
  }
  const c = raw as Record<string, unknown>
  return {
    name: c.name && typeof c.name === 'string' ? c.name : null,
    email: c.email && typeof c.email === 'string' ? c.email : null,
    phone: c.phone && typeof c.phone === 'string' ? c.phone : null,
    location: c.location && typeof c.location === 'string' ? c.location : null,
  }
}

function normalizeStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((s): s is string => typeof s === 'string')
}

function normalizeEducations(raw: unknown): ExtractedEducation[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((e): e is Record<string, unknown> => e !== null && typeof e === 'object')
    .map((e) => ({
      school: typeof e.school === 'string' ? e.school : '',
      major: typeof e.major === 'string' ? e.major : '',
      degree: typeof e.degree === 'string' ? e.degree : '',
      period: typeof e.period === 'string' ? e.period : '',
    }))
    .filter((e) => e.school || e.major)
}

function normalizeExperiences(raw: unknown): ExtractedExperience[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((e): e is Record<string, unknown> => e !== null && typeof e === 'object')
    .map((e) => ({
      company: typeof e.company === 'string' ? e.company : '',
      title: typeof e.title === 'string' ? e.title : '',
      period: typeof e.period === 'string' ? e.period : '',
      description: typeof e.description === 'string' ? e.description : '',
    }))
    .filter((e) => e.company || e.title)
}

function normalizeSkills(raw: unknown): ExtractedSkill[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((s): s is Record<string, unknown> => s !== null && typeof s === 'object')
    .map((s) => ({
      name: typeof s.name === 'string' ? s.name : '',
      level: s.level && typeof s.level === 'string' ? s.level : undefined,
    }))
    .filter((s) => s.name)
}

function normalizeProjects(raw: unknown): ExtractedProject[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((p): p is Record<string, unknown> => p !== null && typeof p === 'object')
    .map((p) => ({
      name: typeof p.name === 'string' ? p.name : '',
      period: p.period && typeof p.period === 'string' ? p.period : undefined,
      role: p.role && typeof p.role === 'string' ? p.role : undefined,
      summary: p.summary && typeof p.summary === 'string' ? p.summary : undefined,
      keywords: normalizeStringArray(p.keywords),
    }))
    .filter((p) => p.name)
}

export async function extractResumeInfo(rawText: string): Promise<ExtractionResult> {
  const skill = await loadSkill('task-resume-extractor')

  const response = await getKimiClient().chat.completions.create({
    model: KIMI_MODEL,
    messages: [
      { role: 'system', content: skill.systemPrompt },
      { role: 'user', content: rawText },
    ],
    temperature: 0.1,
    response_format: { type: 'json_object' },
    ...KIMI_INSTANT_MODE,
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    return {
      contact: { name: null, email: null, phone: null, location: null },
      summary: null,
      educations: [],
      experiences: [],
      skills: [],
      projects: [],
    }
  }

  try {
    const parsed = JSON.parse(content) as Record<string, unknown>
    return {
      contact: normalizeContact(parsed.contact),
      summary: parsed.summary && typeof parsed.summary === 'string' ? parsed.summary : null,
      educations: normalizeEducations(parsed.educations),
      experiences: normalizeExperiences(parsed.experiences),
      skills: normalizeSkills(parsed.skills),
      projects: normalizeProjects(parsed.projects),
    }
  } catch {
    return {
      contact: { name: null, email: null, phone: null, location: null },
      summary: null,
      educations: [],
      experiences: [],
      skills: [],
      projects: [],
    }
  }
}

// 向后兼容：保留旧函数名，内部调用新函数
export async function extractProjectsFromResume(rawText: string): Promise<{ projects: ExtractedProject[] }> {
  const result = await extractResumeInfo(rawText)
  return { projects: result.projects }
}
