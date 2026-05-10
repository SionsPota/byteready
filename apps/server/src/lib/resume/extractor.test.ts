import { describe, it, expect, vi } from 'vitest'
import { extractProjectsFromResume } from './extractor.ts'

vi.mock('../llm/kimi.ts', () => ({
  getKimiClient: () => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                projects: [
                  {
                    name: '智能客服系统',
                    period: '2023.06 - 2024.01',
                    role: '后端负责人',
                    summary: '基于大模型的智能客服系统',
                    keywords: ['Python', 'FastAPI', 'LLM'],
                  },
                ],
              }),
            },
          }],
        }),
      },
    },
  }),
  KIMI_MODEL: 'kimi-test',
  KIMI_INSTANT_MODE: { thinking: { type: 'disabled' } },
}))

describe('extractProjectsFromResume', () => {
  it('should extract projects from raw text', async () => {
    const result = await extractProjectsFromResume('some resume text')
    expect(result.projects).toHaveLength(1)
    expect(result.projects[0]!.name).toBe('智能客服系统')
    expect(result.projects[0]!.keywords).toEqual(['Python', 'FastAPI', 'LLM'])
  })
})
