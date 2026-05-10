import type { ConversationsRepository } from './repository.ts'
import type { Message, MessageStatus } from './types.ts'
import type { ChatMessage, ChatStreamer } from '../llm/stream.ts'
import { loadSkill } from '../skills/prompt.ts'

export type ChatEvent =
  | { kind: 'reasoning'; text: string }
  | { kind: 'delta'; text: string }
  | { kind: 'done'; message: Message }
  | { kind: 'error'; error: string; message: Message }

export interface ChatOptions {
  model?: string
  temperature?: number
  abortSignal?: AbortSignal
  skillName?: string
}

export interface ConversationServiceDeps {
  repo: ConversationsRepository
  streamer: ChatStreamer
  defaultModel?: string
}

export interface ConversationService {
  streamChat(
    conversationId: string,
    userText: string,
    opts?: ChatOptions,
  ): AsyncIterable<ChatEvent>
  chatOnce(conversationId: string, userText: string, opts?: ChatOptions): Promise<Message>
}

const isAbortError = (err: unknown): boolean =>
  err instanceof Error && (err.name === 'AbortError' || err.message === 'AbortError')

export const createConversationService = (deps: ConversationServiceDeps): ConversationService => {
  const { repo, streamer, defaultModel } = deps

  async function* streamChat(
    conversationId: string,
    userText: string,
    opts?: ChatOptions,
  ): AsyncIterable<ChatEvent> {
    const conv = repo.getConversation(conversationId)
    if (!conv) throw new Error(`conversation_not_found: ${conversationId}`)

    const history = repo.listMessages(conversationId)

    const { assistantId } = repo.transaction(() => {
      repo.appendMessage({
        conversationId,
        role: 'user',
        content: userText,
        status: 'completed',
      })
      const assistant = repo.appendMessage({
        conversationId,
        role: 'assistant',
        content: '',
        status: 'pending',
      })
      return { assistantId: assistant.id }
    })

    let skillSystemPrompt = ''
    if (opts?.skillName) {
      try {
        const skill = await loadSkill(opts.skillName)
        skillSystemPrompt = skill.systemPrompt
      } catch {
        // skill 加载失败时静默跳过，不阻塞对话
      }
    }

    const llmMessages: ChatMessage[] = []
    if (conv.systemPrompt) {
      llmMessages.push({ role: 'system', content: conv.systemPrompt })
    }
    if (skillSystemPrompt) {
      llmMessages.push({ role: 'system', content: skillSystemPrompt })
    }
    for (const m of history) {
      if (m.role === 'system') {
        if (conv.systemPrompt || skillSystemPrompt) continue
      }
      llmMessages.push({ role: m.role, content: m.content })
    }
    llmMessages.push({ role: 'user', content: userText })

    const model = opts?.model ?? conv.model ?? defaultModel ?? ''
    if (!model) {
      repo.updateMessage(assistantId, {
        content: '',
        status: 'error',
      })
      throw new Error('no_model_configured')
    }

    let contentBuffer = ''
    let reasoningBuffer = ''
    let finalStatus: MessageStatus = 'completed'
    let errorMsg: string | null = null

    try {
      const stream = streamer.stream({
        messages: llmMessages,
        model,
        temperature: opts?.temperature,
        signal: opts?.abortSignal,
      })
      for await (const chunk of stream) {
        if (chunk.reasoning) {
          reasoningBuffer += chunk.reasoning
          yield { kind: 'reasoning', text: chunk.reasoning }
        }
        if (chunk.delta) {
          contentBuffer += chunk.delta
          yield { kind: 'delta', text: chunk.delta }
        }
        if (chunk.done) break
      }
    } catch (err) {
      finalStatus = isAbortError(err) ? 'aborted' : 'error'
      errorMsg = err instanceof Error ? err.message : String(err)
    } finally {
      repo.updateMessage(assistantId, {
        content: contentBuffer,
        reasoningContent: reasoningBuffer || null,
        status: finalStatus,
      })
    }

    const persisted = repo.listMessages(conversationId).find((m) => m.id === assistantId)
    if (!persisted) throw new Error('assistant_message_lost')

    if (errorMsg !== null) {
      yield { kind: 'error', error: errorMsg, message: persisted }
    } else {
      yield { kind: 'done', message: persisted }
    }
  }

  const chatOnce = async (
    conversationId: string,
    userText: string,
    opts?: ChatOptions,
  ): Promise<Message> => {
    let last: Message | null = null
    for await (const evt of streamChat(conversationId, userText, opts)) {
      if (evt.kind === 'done' || evt.kind === 'error') {
        last = evt.message
      }
    }
    if (!last) throw new Error('chat_no_message')
    return last
  }

  return { streamChat, chatOnce }
}
