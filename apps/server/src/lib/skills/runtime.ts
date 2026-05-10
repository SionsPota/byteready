import type { ChatMessage, ChatStreamer, RawStreamChunk } from '../llm/stream.ts'
import { getKimiClient, KIMI_INSTANT_MODE } from '../llm/kimi.ts'
import { SkillLoader, type LoadedSkill, type SkillVariables } from './loader.ts'

export interface AgentRuntimeOptions {
  skillDir: string
  streamer: ChatStreamer
  model: string
  temperature?: number
  variables?: SkillVariables
}

export interface AgentRuntimeMultiOptions {
  skillDirs: string[]
  streamer: ChatStreamer
  model: string
  temperature?: number
  variables?: SkillVariables
}

export interface ChatOptions {
  messages: ChatMessage[]
  signal?: AbortSignal
}

export interface JsonChatOptions extends ChatOptions {
  /** 在用户消息前追加一条 JSON 格式提示，帮助模型输出结构化数据 */
  jsonInstruction?: string
}

export interface JsonChatResult {
  text: string
  data: unknown | null
}

export class AgentRuntime {
  private readonly options: AgentRuntimeOptions | AgentRuntimeMultiOptions
  private loadedSkill: LoadedSkill | null = null

  constructor(options: AgentRuntimeOptions | AgentRuntimeMultiOptions) {
    this.options = options
  }

  async load(): Promise<LoadedSkill> {
    const loader = new SkillLoader()
    const dirs =
      'skillDirs' in this.options
        ? this.options.skillDirs
        : [this.options.skillDir]
    const variables = this.options.variables ?? {}
    this.loadedSkill = await loader.load(dirs, variables)
    return this.loadedSkill
  }

  async *chat(options: ChatOptions): AsyncIterable<RawStreamChunk> {
    if (!this.loadedSkill) {
      await this.load()
    }

    const systemMessage: ChatMessage = {
      role: 'system',
      content: this.loadedSkill!.systemPrompt,
    }

    const allMessages: ChatMessage[] = [systemMessage, ...options.messages]

    yield* this.options.streamer.stream({
      messages: allMessages,
      model: this.options.model,
      temperature: this.options.temperature,
      signal: options.signal,
    })
  }

  async jsonChat(options: JsonChatOptions): Promise<JsonChatResult> {
    if (!this.loadedSkill) {
      await this.load()
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: this.loadedSkill!.systemPrompt },
      ...options.messages,
    ]

    if (options.jsonInstruction) {
      messages.push({ role: 'user', content: options.jsonInstruction })
    }

    const response = await getKimiClient().chat.completions.create({
      model: this.options.model,
      messages,
      temperature: this.options.temperature ?? 0.3,
      response_format: { type: 'json_object' },
      ...KIMI_INSTANT_MODE,
    })

    const text = response.choices[0]?.message?.content ?? ''
    try {
      const data = JSON.parse(text) as unknown
      return { text, data }
    } catch {
      return { text, data: null }
    }
  }

  get skill(): LoadedSkill | null {
    return this.loadedSkill
  }
}
