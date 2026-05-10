import { Hono } from 'hono'
import { ok, err } from '@byteready/shared'
import { getDb } from '../../lib/db/client.ts'
import { createCompanyRepository } from '../../lib/explore/companies.repository.ts'

export const companiesRoute = new Hono()

const decodeArr = (s: string | null): string[] => {
  if (!s) return []
  try {
    const parsed = JSON.parse(s)
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch {
    return []
  }
}

// GET /api/explore/companies
companiesRoute.get('/', (c) => {
  const repo = createCompanyRepository(getDb())
  const rows = repo.listWithExperienceCount()
  return c.json(
    ok(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        interviewStyle: r.interview_style,
        positions: decodeArr(r.positions),
        tags: decodeArr(r.tags),
        logo: r.logo,
        industry: r.industry,
        color: r.color,
        experienceCount: r.experience_count,
        updatedAt: r.updated_at,
      })),
    ),
  )
})

// GET /api/explore/companies/:id
companiesRoute.get('/:id', (c) => {
  const id = c.req.param('id')
  const repo = createCompanyRepository(getDb())
  const row = repo.getById(id)
  if (!row) return c.json(err('NOT_FOUND', '公司不存在'), 404)

  return c.json(
    ok({
      id: row.id,
      name: row.name,
      description: row.description,
      interviewStyle: row.interview_style,
      positions: decodeArr(row.positions),
      tags: decodeArr(row.tags),
      logo: row.logo,
      industry: row.industry,
      color: row.color,
      updatedAt: row.updated_at,
    }),
  )
})
