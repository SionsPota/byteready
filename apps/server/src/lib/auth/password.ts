import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto'

const SALT_LEN = 16
const KEY_LEN = 64

export const hashPassword = (password: string): string => {
  const salt = randomBytes(SALT_LEN).toString('hex')
  const hash = scryptSync(password, salt, KEY_LEN).toString('hex')
  return `${salt}:${hash}`
}

export const verifyPassword = (password: string, stored: string): boolean => {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const computed = scryptSync(password, salt, KEY_LEN)
  const expected = Buffer.from(hash, 'hex')
  if (computed.length !== expected.length) return false
  return timingSafeEqual(computed, expected)
}
