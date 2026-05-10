import { describe, it, expect, vi } from 'vitest'
import { extractResumeInfo, extractProjectsFromResume } from './extractor.ts'

vi.mock('../llm/kimi.ts', () => ({
  getKimiClient: () => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                contact: {
                  name: '张三',
                  email: 'zhangsan@example.com',
                  phone: '138-0000-0000',
                  location: '北京',
                },
                summary: '3 年后端开发经验',
                educations: [
                  { school: '清华大学', major: '计算机科学', degree: '本科', period: '2015.09 - 2019.06' },
                ],
                experiences: [
                  { company: '字节跳动', title: '后端工程师', period: '2019.07 - 至今', description: '负责支付系统' },
                ],
                skills: [
                  { name: 'Go', level: '精通' },
                  { name: 'Redis', level: null },
                ],
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

describe('extractResumeInfo', () => {
  it('should extract all structured info from raw text', async () => {
    const result = await extractResumeInfo('some resume text')

    expect(result.contact.name).toBe('张三')
    expect(result.contact.email).toBe('zhangsan@example.com')
    expect(result.contact.phone).toBe('138-0000-0000')
    expect(result.contact.location).toBe('北京')

    expect(result.summary).toBe('3 年后端开发经验')

    expect(result.educations).toHaveLength(1)
    expect(result.educations[0]!.school).toBe('清华大学')
    expect(result.educations[0]!.degree).toBe('本科')

    expect(result.experiences).toHaveLength(1)
    expect(result.experiences[0]!.company).toBe('字节跳动')
    expect(result.experiences[0]!.title).toBe('后端工程师')

    expect(result.skills).toHaveLength(2)
    expect(result.skills[0]!.name).toBe('Go')
    expect(result.skills[0]!.level).toBe('精通')
    expect(result.skills[1]!.level).toBeUndefined()

    expect(result.projects).toHaveLength(1)
    expect(result.projects[0]!.name).toBe('智能客服系统')
    expect(result.projects[0]!.keywords).toEqual(['Python', 'FastAPI', 'LLM'])
  })
})

describe('extractProjectsFromResume (backward compat)', () => {
  it('should return only projects', async () => {
    const result = await extractProjectsFromResume('some resume text')
    expect(result.projects).toHaveLength(1)
    expect(result.projects[0]!.name).toBe('智能客服系统')
    expect(result.projects[0]!.keywords).toEqual(['Python', 'FastAPI', 'LLM'])
  })
})
