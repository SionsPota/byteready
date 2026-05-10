import { getKimiClient, KIMI_INSTANT_MODE, KIMI_MODEL } from '../llm/kimi.ts'

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

const EXTRACTION_PROMPT = `你是一位简历解析专家。请从以下简历文本中提取项目经历，返回严格 JSON。

## 提取规则
1. 每个项目必须包含：name（项目名称）
2. 可选字段：
   - period: 项目时间段（如"2023.06 - 2024.01"）
   - role: 担任角色（如"后端负责人"）
   - summary: 项目概述（1-3 句话）
   - keywords: 涉及的技术关键词数组（如 ["React", "Node.js", "PostgreSQL"]）
3. 如果简历中没有明确的项目经历，返回空数组
4. 不要编造不存在的信息

## 返回格式（严格 JSON，不要加 markdown 代码块）
{
  "projects": [
    {
      "name": "项目名称",
      "period": "时间段",
      "role": "角色",
      "summary": "概述",
      "keywords": ["关键词1", "关键词2"]
    }
  ]
}`

export async function extractProjectsFromResume(rawText: string): Promise<ExtractionResult> {
  const response = await getKimiClient().chat.completions.create({
    model: KIMI_MODEL,
    messages: [
      { role: 'system', content: EXTRACTION_PROMPT },
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
