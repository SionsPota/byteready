import { randomBytes } from 'node:crypto'

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

interface Session {
  userId: string
  expiresAt: number
}

const store = new Map<string, Session>()

export const createSession = (userId: string): string => {
  const token = randomBytes(32).toString('hex')
  store.set(token, { userId, expiresAt: Date.now() + SESSION_TTL_MS })
  return token
}

export const getUserIdByToken = (token: string): string | null => {
  const sess = store.get(token)
  if (!sess) return null
  if (Date.now() > sess.expiresAt) {
    store.delete(token)
    return null
  }
  return sess.userId
}

export const deleteSession = (token: string): void => {
  store.delete(token)
}

export const cleanupExpired = (): void => {
  const now = Date.now()
  for (const [token, sess] of store) {
    if (now > sess.expiresAt) store.delete(token)
  }
}
