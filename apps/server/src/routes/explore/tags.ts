import { Hono } from 'hono'
import { ok } from '@byteready/shared'
import { getDb } from '../../lib/db/client.ts'
import { createTagRepository } from '../../lib/explore/tags.repository.ts'

export const tagsRoute = new Hono()

// GET /api/explore/tags
tagsRoute.get('/', (c) => {
  const repo = createTagRepository(getDb())
  const rows = repo.list()
  return c.json(
    ok(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        color: r.color,
        category: r.category,
      })),
    ),
  )
})
