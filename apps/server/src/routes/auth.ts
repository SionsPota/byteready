import { Hono } from 'hono'
import { err, ok } from '@byteready/shared'
import { registerSchema, loginSchema } from '@byteready/shared'
import { getDb } from '../lib/db/client.ts'
import { hashPassword, verifyPassword } from '../lib/auth/password.ts'
import { createSession, deleteSession } from '../lib/auth/session.ts'
import { AUTH_COOKIE } from '../lib/auth/middleware.ts'
import { setCookie, deleteCookie, getCookie } from 'hono/cookie'
import { randomUUID } from 'node:crypto'

const cookieOpts = {
  httpOnly: true,
  secure: false, // V1 开发环境用 http
  sameSite: 'Lax' as const,
  maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  path: '/',
}

export const authRoute = new Hono()

authRoute.post('/register', async (c) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json(err('VALIDATION', '请求体必须是 JSON'), 400)
  }

  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    const messages = parsed.error.issues.map((i) => i.message).join('; ')
    return c.json(err('VALIDATION', messages), 400)
  }

  const { email, password, name } = parsed.data
  const db = getDb()

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string } | undefined
  if (existing) {
    return c.json(err('CONFLICT', '该邮箱已被注册'), 409)
  }

  const id = randomUUID()
  const now = Date.now()
  db.prepare('INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, email, name ?? null, hashPassword(password), now)

  const token = createSession(id)
  setCookie(c, AUTH_COOKIE, token, cookieOpts)

  return c.json(ok({ id, email, name: name ?? null }), 201)
})

authRoute.post('/login', async (c) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json(err('VALIDATION', '请求体必须是 JSON'), 400)
  }

  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    const messages = parsed.error.issues.map((i) => i.message).join('; ')
    return c.json(err('VALIDATION', messages), 400)
  }

  const { email, password } = parsed.data
  const db = getDb()

  const row = db.prepare('SELECT id, email, name, password_hash FROM users WHERE email = ?').get(email) as
    | { id: string; email: string; name: string | null; password_hash: string }
    | undefined

  if (!row || !verifyPassword(password, row.password_hash)) {
    return c.json(err('UNAUTHORIZED', '邮箱或密码错误'), 401)
  }

  const token = createSession(row.id)
  setCookie(c, AUTH_COOKIE, token, cookieOpts)

  return c.json(ok({ id: row.id, email: row.email, name: row.name }))
})

authRoute.post('/logout', (c) => {
  const token = getCookie(c, AUTH_COOKIE)
  if (token) deleteSession(token)
  deleteCookie(c, AUTH_COOKIE, { path: '/' })
  return c.json(ok({ message: '已登出' }))
})
