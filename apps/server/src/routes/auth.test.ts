import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createApp } from '../app.ts'
import { openDbInMemory, overrideDb, closeDb } from '../lib/db/client.ts'

describe('auth routes', () => {
  let app: ReturnType<typeof createApp>

  beforeEach(() => {
    closeDb()
    overrideDb(openDbInMemory())
    app = createApp()
  })

  afterEach(() => {
    closeDb()
  })

  it('注册成功', async () => {
    const res = await app.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'password123', name: 'Test' }),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(201)
    const json = (await res.json()) as { success: boolean; data: { id: string; email: string; name: string | null } }
    expect(json.success).toBe(true)
    expect(json.data.email).toBe('test@example.com')
    expect(json.data.name).toBe('Test')
    expect(json.data.id).toBeDefined()
  })

  it('注册重复邮箱返回 409', async () => {
    await app.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'dup@example.com', password: 'password123' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await app.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'dup@example.com', password: 'password123' }),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(409)
    const json = (await res.json()) as { success: boolean }
    expect(json.success).toBe(false)
  })

  it('注册参数校验失败返回 400', async () => {
    const res = await app.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'bad', password: '123' }),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(400)
    const json = (await res.json()) as { success: boolean }
    expect(json.success).toBe(false)
  })

  it('登录成功并返回用户信息', async () => {
    await app.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'login@example.com', password: 'password123' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'login@example.com', password: 'password123' }),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { success: boolean; data: { email: string } }
    expect(json.success).toBe(true)
    expect(json.data.email).toBe('login@example.com')
  })

  it('登录密码错误返回 401', async () => {
    await app.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'wrong@example.com', password: 'password123' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'wrong@example.com', password: 'wrongpass' }),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(401)
    const json = (await res.json()) as { success: boolean }
    expect(json.success).toBe(false)
  })

  it('登录不存在的用户返回 401', async () => {
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'nobody@example.com', password: 'password123' }),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status).toBe(401)
    const json = (await res.json()) as { success: boolean }
    expect(json.success).toBe(false)
  })

  it('登出成功', async () => {
    const res = await app.request('/api/auth/logout', { method: 'POST' })
    expect(res.status).toBe(200)
    const json = (await res.json()) as { success: boolean }
    expect(json.success).toBe(true)
  })
})
