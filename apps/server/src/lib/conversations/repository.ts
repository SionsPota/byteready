import type { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'
import type { Conversation, Message, MessageStatus, Role } from './types.ts'

let lastTick = 0
const monotonicNow = (): number => {
  const now = Date.now()
  lastTick = now > lastTick ? now : lastTick + 1
  return lastTick
}

interface ConversationRow {
  id: string
  title: string | null
  model: string | null
  system_prompt: string | null
  created_at: number
  updated_at: number
}

interface MessageRow {
  id: string
  conversation_id: string
  role: Role
  content: string
  reasoning_content: string | null
  status: MessageStatus
  created_at: number
}

const rowToConversation = (row: ConversationRow): Conversation => ({
  id: row.id,
  title: row.title,
  model: row.model,
  systemPrompt: row.system_prompt,
  createdAt: Number(row.created_at),
  updatedAt: Number(row.updated_at),
})

const rowToMessage = (row: MessageRow): Message => ({
  id: row.id,
  conversationId: row.conversation_id,
  role: row.role,
  content: row.content,
  reasoningContent: row.reasoning_content,
  status: row.status,
  createdAt: Number(row.created_at),
})

export interface CreateConversationInput {
  title?: string
  model?: string
  systemPrompt?: string
}

export interface AppendMessageInput {
  conversationId: string
  role: Role
  content?: string
  reasoningContent?: string | null
  status?: MessageStatus
}

export interface UpdateMessagePatch {
  content?: string
  reasoningContent?: string | null
  status?: MessageStatus
}

export interface ListOptions {
  limit?: number
  offset?: number
}

export interface ConversationsRepository {
  createConversation(input: CreateConversationInput): Conversation
  getConversation(id: string): Conversation | null
  listConversations(opts?: ListOptions): Conversation[]
  listMessages(conversationId: string): Message[]
  appendMessage(input: AppendMessageInput): Message
  updateMessage(id: string, patch: UpdateMessagePatch): void
  deleteConversation(id: string): void
  transaction<T>(fn: () => T): T
}

export const createRepository = (db: DatabaseSync): ConversationsRepository => {
  const insertConv = db.prepare(
    `INSERT INTO conversations (id, title, model, system_prompt, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
  const getConv = db.prepare('SELECT * FROM conversations WHERE id = ?')
  const listConv = db.prepare(
    'SELECT * FROM conversations ORDER BY updated_at DESC, id ASC LIMIT ? OFFSET ?',
  )
  const deleteConv = db.prepare('DELETE FROM conversations WHERE id = ?')
  const touchConv = db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?')
  const listMsg = db.prepare(
    'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC, id ASC',
  )
  const insertMsg = db.prepare(
    `INSERT INTO messages (id, conversation_id, role, content, reasoning_content, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
  const getMsg = db.prepare('SELECT * FROM messages WHERE id = ?')
  const updateMsg = db.prepare(
    'UPDATE messages SET content = ?, reasoning_content = ?, status = ? WHERE id = ?',
  )

  return {
    createConversation: (input) => {
      const id = randomUUID()
      const now = monotonicNow()
      insertConv.run(
        id,
        input.title ?? null,
        input.model ?? null,
        input.systemPrompt ?? null,
        now,
        now,
      )
      return {
        id,
        title: input.title ?? null,
        model: input.model ?? null,
        systemPrompt: input.systemPrompt ?? null,
        createdAt: now,
        updatedAt: now,
      }
    },

    getConversation: (id) => {
      const row = getConv.get(id) as ConversationRow | undefined
      return row ? rowToConversation(row) : null
    },

    listConversations: (opts) => {
      const limit = opts?.limit ?? 50
      const offset = opts?.offset ?? 0
      const rows = listConv.all(limit, offset) as unknown as ConversationRow[]
      return rows.map(rowToConversation)
    },

    listMessages: (conversationId) => {
      const rows = listMsg.all(conversationId) as unknown as MessageRow[]
      return rows.map(rowToMessage)
    },

    appendMessage: (input) => {
      const id = randomUUID()
      const now = monotonicNow()
      const content = input.content ?? ''
      const reasoning = input.reasoningContent ?? null
      const status: MessageStatus = input.status ?? 'completed'
      insertMsg.run(id, input.conversationId, input.role, content, reasoning, status, now)
      touchConv.run(now, input.conversationId)
      return {
        id,
        conversationId: input.conversationId,
        role: input.role,
        content,
        reasoningContent: reasoning,
        status,
        createdAt: now,
      }
    },

    updateMessage: (id, patch) => {
      const current = getMsg.get(id) as MessageRow | undefined
      if (!current) return
      const newContent = patch.content !== undefined ? patch.content : current.content
      const newReasoning =
        patch.reasoningContent !== undefined ? patch.reasoningContent : current.reasoning_content
      const newStatus: MessageStatus = patch.status !== undefined ? patch.status : current.status
      updateMsg.run(newContent, newReasoning, newStatus, id)
      touchConv.run(monotonicNow(), current.conversation_id)
    },

    deleteConversation: (id) => {
      deleteConv.run(id)
    },

    transaction: <T>(fn: () => T): T => {
      db.exec('BEGIN')
      try {
        const result = fn()
        db.exec('COMMIT')
        return result
      } catch (error) {
        db.exec('ROLLBACK')
        throw error
      }
    },
  }
}
