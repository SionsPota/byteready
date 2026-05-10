export type Role = 'system' | 'user' | 'assistant'

export type MessageStatus = 'pending' | 'completed' | 'aborted' | 'error'

export interface Message {
  id: string
  conversationId: string
  role: Role
  content: string
  reasoningContent: string | null
  status: MessageStatus
  createdAt: number
}

export interface Conversation {
  id: string
  title: string | null
  model: string | null
  systemPrompt: string | null
  createdAt: number
  updatedAt: number
}
