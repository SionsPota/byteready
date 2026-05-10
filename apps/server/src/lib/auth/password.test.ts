import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from './password.ts'

describe('password', () => {
  it('should hash and verify a password', () => {
    const hash = hashPassword('my-secret-123')
    expect(hash).toContain(':')
    expect(verifyPassword('my-secret-123', hash)).toBe(true)
    expect(verifyPassword('wrong-password', hash)).toBe(false)
  })

  it('should produce different hashes for same password', () => {
    const h1 = hashPassword('same')
    const h2 = hashPassword('same')
    expect(h1).not.toBe(h2)
    expect(verifyPassword('same', h1)).toBe(true)
    expect(verifyPassword('same', h2)).toBe(true)
  })

  it('should reject malformed stored hash', () => {
    expect(verifyPassword('x', 'nocolon')).toBe(false)
    expect(verifyPassword('x', '')).toBe(false)
  })
})
