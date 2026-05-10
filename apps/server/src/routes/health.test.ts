import { describe, expect, it } from 'vitest'
import { healthRoute } from './health.ts'

interface HealthBody {
  success: true
  data: { status: string; uptime: number; timestamp: string }
}

describe('GET /api/health', () => {
  it('returns 200 with ok envelope', async () => {
    const res = await healthRoute.request('/')
    expect(res.status).toBe(200)
    const body = (await res.json()) as HealthBody
    expect(body.success).toBe(true)
    expect(body.data.status).toBe('ok')
    expect(typeof body.data.uptime).toBe('number')
    expect(body.data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})
