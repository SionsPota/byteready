import { describe, it, expect } from 'vitest'
import { createSession, getUserIdByToken, deleteSession } from './session.ts'

describe('session', () => {
  it('should create and retrieve session', () => {
    const token = createSession('user-123')
    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(0)
    expect(getUserIdByToken(token)).toBe('user-123')
  })

  it('should return null for unknown token', () => {
    expect(getUserIdByToken('nonexistent')).toBeNull()
  })

  it('should delete session', () => {
    const token = createSession('user-456')
    expect(getUserIdByToken(token)).toBe('user-456')
    deleteSession(token)
    expect(getUserIdByToken(token)).toBeNull()
  })
})
