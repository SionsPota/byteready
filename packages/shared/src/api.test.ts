import { describe, expect, it } from 'vitest'
import { err, ok } from './api.ts'

describe('ok()', () => {
  it('wraps data without meta', () => {
    expect(ok({ x: 1 })).toEqual({ success: true, data: { x: 1 } })
  })

  it('wraps data with meta', () => {
    expect(ok([1, 2], { total: 2, page: 1, limit: 10 })).toEqual({
      success: true,
      data: [1, 2],
      meta: { total: 2, page: 1, limit: 10 },
    })
  })
})

describe('err()', () => {
  it('produces failure envelope without details', () => {
    expect(err('FOO', 'bar')).toEqual({
      success: false,
      error: { code: 'FOO', message: 'bar' },
    })
  })

  it('includes details when provided', () => {
    expect(err('VAL', 'invalid', { field: 'name' })).toEqual({
      success: false,
      error: { code: 'VAL', message: 'invalid', details: { field: 'name' } },
    })
  })
})
