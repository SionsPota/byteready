import type OpenAI from 'openai'

export type Role = 'system' | 'user' | 'assistant'

export interface ChatMessage {
  role: Role
  content: string
}

export interface RawStreamChunk {
  reasoning?: string
  delta?: string
  done?: boolean
}

export interface ChatStreamArgs {
  messages: ChatMessage[]
  model: string
  temperature?: number
  signal?: AbortSignal
}

export interface ChatStreamer {
  stream(args: ChatStreamArgs): AsyncIterable<RawStreamChunk>
}

interface OpenAIChunkChoice {
  delta?: { content?: string; reasoning_content?: string }
  finish_reason?: string | null
}

interface OpenAIChunk {
  choices?: OpenAIChunkChoice[]
}

export const createKimiStreamer = (client: OpenAI): ChatStreamer => ({
  stream: async function* ({ messages, model, temperature, signal }: ChatStreamArgs) {
    const stream = (await client.chat.completions.create(
      {
        model,
        messages,
        temperature: temperature ?? 0.7,
        stream: true,
      },
      { signal },
    )) as unknown as AsyncIterable<OpenAIChunk>

    for await (const chunk of stream) {
      const choice = chunk.choices?.[0]
      if (!choice) continue
      const reasoning = choice.delta?.reasoning_content
      const content = choice.delta?.content
      if (reasoning) yield { reasoning }
      if (content) yield { delta: content }
      if (choice.finish_reason) {
        yield { done: true }
        break
      }
    }
  },
})
