import { Hono } from 'hono'
import { ok } from '@byteready/shared'
import { readdir, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { requireAuth } from '../lib/auth/middleware.ts'

const here = dirname(fileURLToPath(import.meta.url))
const SKILLS_BASE_DIR = resolve(here, '../../skills')

export const skillsRoute = new Hono()
skillsRoute.use('*', requireAuth)

// GET /api/skills - 列出所有可用 skill
skillsRoute.get('/', async (c) => {
  const entries = await readdir(SKILLS_BASE_DIR, { withFileTypes: true })
  const skills: { name: string }[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const skillMdPath = join(SKILLS_BASE_DIR, entry.name, 'SKILL.md')
    try {
      await stat(skillMdPath)
      skills.push({ name: entry.name })
    } catch {
      // 没有 SKILL.md 的不是合法 skill，跳过
    }
  }

  return c.json(ok(skills))
})
