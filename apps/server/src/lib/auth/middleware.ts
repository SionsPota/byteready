import type { MiddlewareHandler } from 'hono'
import { getCookie } from 'hono/cookie'
import { err } from '@byteready/shared'
import { getUserIdByToken } from './session.ts'

const AUTH_COOKIE = 'byteready_session'

export const requireAuth: MiddlewareHandler = async (c, next) => {
  const token = getCookie(c, AUTH_COOKIE)
  if (!token) {
    return c.json(err('UNAUTHORIZED', '请先登录'), 401)
  }
  const userId = getUserIdByToken(token)
  if (!userId) {
    return c.json(err('UNAUTHORIZED', '登录已过期，请重新登录'), 401)
  }
  c.set('userId', userId)
  await next()
}

export const getAuthToken = (c: { req: { header: (name: string) => string | undefined } }): string | undefined => {
  return undefined
}

export { AUTH_COOKIE }
