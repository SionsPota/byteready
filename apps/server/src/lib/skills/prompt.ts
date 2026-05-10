import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SkillLoader } from './loader.ts'

const here = dirname(fileURLToPath(import.meta.url))
export const SKILLS_BASE_DIR = resolve(here, '../../../skills')

const loader = new SkillLoader()

export async function loadSkill(
  name: string,
  variables?: Record<string, string>,
) {
  return loader.load(join(SKILLS_BASE_DIR, name), variables ?? {})
}
