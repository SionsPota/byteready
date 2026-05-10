import { getKimiClient, KIMI_INSTANT_MODE, KIMI_MODEL } from './llm/kimi.ts'
import { loadSkill } from './skills/prompt.ts'

export async function optimizeResumeText(rawText: string): Promise<string> {
  const task = await loadSkill('task-resume-optimizer')

  const response = await getKimiClient().chat.completions.create({
    model: KIMI_MODEL,
    messages: [
      { role: 'system', content: task.systemPrompt },
      { role: 'user', content: rawText },
    ],
    temperature: 0.1,
    ...KIMI_INSTANT_MODE,
  })
  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('Kimi 返回空内容')
  }
  return content
}
