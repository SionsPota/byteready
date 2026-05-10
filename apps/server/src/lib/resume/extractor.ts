import { getKimiClient, KIMI_INSTANT_MODE, KIMI_MODEL } from '../llm/kimi.ts'
import { loadSkill } from '../skills/prompt.ts'

export interface ExtractedProject {
  name: string
  period?: string
  role?: string
  summary?: string
  keywords?: string[]
}

export interface ExtractionResult {
  projects: ExtractedProject[]
}

export async function extractProjectsFromResume(rawText: string): Promise<ExtractionResult> {
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
    return { projects: [] }
  }

  try {
    const parsed = JSON.parse(content) as ExtractionResult
    if (!Array.isArray(parsed.projects)) {
      return { projects: [] }
    }
    return {
      projects: parsed.projects.map((p) => ({
        name: String(p.name ?? ''),
        period: p.period ? String(p.period) : undefined,
        role: p.role ? String(p.role) : undefined,
        summary: p.summary ? String(p.summary) : undefined,
        keywords: Array.isArray(p.keywords) ? p.keywords.filter((k): k is string => typeof k === 'string') : undefined,
      })),
    }
  } catch {
    return { projects: [] }
  }
}
