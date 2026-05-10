import { describe, expect, it } from 'vitest'
import { openDbInMemory } from '../db/client.ts'
import { createRepository } from './repository.ts'

const setup = () => {
  const db = openDbInMemory()
  const repo = createRepository(db)
  return { db, repo }
}

describe('createRepository', () => {
  it('createConversation + getConversation 往返一致', () => {
    const { db, repo } = setup()
    const conv = repo.createConversation({
      title: 'test',
      model: 'kimi-k2.6',
      systemPrompt: 'be concise',
    })
    expect(conv.id).toBeTruthy()
    expect(conv.title).toBe('test')
    expect(conv.model).toBe('kimi-k2.6')
    expect(conv.systemPrompt).toBe('be concise')
    expect(conv.createdAt).toBeTypeOf('number')
    expect(conv.updatedAt).toBe(conv.createdAt)

    const got = repo.getConversation(conv.id)
    expect(got).toEqual(conv)
    db.close()
  })

  it('createConversation 不带可选字段时返回 null 字段', () => {
    const { db, repo } = setup()
    const conv = repo.createConversation({})
    expect(conv.title).toBeNull()
    expect(conv.model).toBeNull()
    expect(conv.systemPrompt).toBeNull()
    db.close()
  })

  it('getConversation 找不到时返回 null', () => {
    const { db, repo } = setup()
    expect(repo.getConversation('nonexistent')).toBeNull()
    db.close()
  })

  it('listConversations 按 updated_at DESC 排序', () => {
    const { db, repo } = setup()
    const c1 = repo.createConversation({ title: 'a' })
    const c2 = repo.createConversation({ title: 'b' })
    const c3 = repo.createConversation({ title: 'c' })
    db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(1000, c1.id)
    db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(3000, c2.id)
    db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(2000, c3.id)

    const list = repo.listConversations()
    expect(list.map((c) => c.id)).toEqual([c2.id, c3.id, c1.id])
    db.close()
  })

  it('listConversations 支持 limit/offset', () => {
    const { db, repo } = setup()
    for (let i = 0; i < 5; i++) {
      const c = repo.createConversation({ title: `n${i}` })
      db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(i, c.id)
    }
    expect(repo.listConversations({ limit: 2 }).length).toBe(2)
    expect(repo.listConversations({ limit: 2, offset: 4 }).length).toBe(1)
    db.close()
  })

  it('appendMessage + listMessages 按 created_at ASC 返回', () => {
    const { db, repo } = setup()
    const conv = repo.createConversation({})
    const m1 = repo.appendMessage({ conversationId: conv.id, role: 'user', content: 'hi' })
    const m2 = repo.appendMessage({ conversationId: conv.id, role: 'assistant', content: 'hello' })
    db.prepare('UPDATE messages SET created_at = ? WHERE id = ?').run(2000, m1.id)
    db.prepare('UPDATE messages SET created_at = ? WHERE id = ?').run(1000, m2.id)

    const msgs = repo.listMessages(conv.id)
    expect(msgs.map((m) => m.id)).toEqual([m2.id, m1.id])
    db.close()
  })

  it('appendMessage 把 conversation.updated_at 推到当前时间', () => {
    const { db, repo } = setup()
    const conv = repo.createConversation({})
    db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(0, conv.id)
    repo.appendMessage({ conversationId: conv.id, role: 'user', content: 'hi' })
    const after = repo.getConversation(conv.id)
    expect(after).not.toBeNull()
    expect(after!.updatedAt).toBeGreaterThan(0)
    db.close()
  })

  it('appendMessage 默认 status=completed，可显式置为 pending', () => {
    const { db, repo } = setup()
    const conv = repo.createConversation({})
    const m1 = repo.appendMessage({ conversationId: conv.id, role: 'user', content: 'a' })
    expect(m1.status).toBe('completed')
    const m2 = repo.appendMessage({
      conversationId: conv.id,
      role: 'assistant',
      content: '',
      status: 'pending',
    })
    expect(m2.status).toBe('pending')
    db.close()
  })

  it('updateMessage 部分字段更新，未提供的保留原值', () => {
    const { db, repo } = setup()
    const conv = repo.createConversation({})
    const m = repo.appendMessage({
      conversationId: conv.id,
      role: 'assistant',
      content: 'old',
      reasoningContent: 'r-old',
      status: 'pending',
    })
    repo.updateMessage(m.id, { content: 'new', status: 'completed' })
    const msgs = repo.listMessages(conv.id)
    expect(msgs[0]!.content).toBe('new')
    expect(msgs[0]!.reasoningContent).toBe('r-old')
    expect(msgs[0]!.status).toBe('completed')
    db.close()
  })

  it('updateMessage 显式置 reasoningContent 为 null', () => {
    const { db, repo } = setup()
    const conv = repo.createConversation({})
    const m = repo.appendMessage({
      conversationId: conv.id,
      role: 'assistant',
      content: 'x',
      reasoningContent: 'r',
    })
    repo.updateMessage(m.id, { reasoningContent: null })
    const msgs = repo.listMessages(conv.id)
    expect(msgs[0]!.reasoningContent).toBeNull()
    db.close()
  })

  it('updateMessage 不存在的 id 静默忽略', () => {
    const { db, repo } = setup()
    expect(() => repo.updateMessage('nonexistent', { content: 'x' })).not.toThrow()
    db.close()
  })

  it('deleteConversation 级联删除其下 messages', () => {
    const { db, repo } = setup()
    const conv = repo.createConversation({})
    repo.appendMessage({ conversationId: conv.id, role: 'user', content: 'a' })
    repo.appendMessage({ conversationId: conv.id, role: 'assistant', content: 'b' })
    repo.deleteConversation(conv.id)
    expect(repo.getConversation(conv.id)).toBeNull()
    expect(repo.listMessages(conv.id)).toEqual([])
    db.close()
  })

  it('transaction 抛错回滚', () => {
    const { db, repo } = setup()
    const conv = repo.createConversation({})
    expect(() =>
      repo.transaction(() => {
        repo.appendMessage({ conversationId: conv.id, role: 'user', content: 'a' })
        repo.appendMessage({ conversationId: conv.id, role: 'assistant', content: 'b' })
        throw new Error('boom')
      }),
    ).toThrow('boom')
    expect(repo.listMessages(conv.id)).toEqual([])
    db.close()
  })

  it('transaction 正常提交', () => {
    const { db, repo } = setup()
    const conv = repo.createConversation({})
    const result = repo.transaction(() => {
      repo.appendMessage({ conversationId: conv.id, role: 'user', content: 'a' })
      return 'ok'
    })
    expect(result).toBe('ok')
    expect(repo.listMessages(conv.id).length).toBe(1)
    db.close()
  })
})
