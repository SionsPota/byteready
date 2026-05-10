import { readdir, readFile } from 'node:fs/promises'
import { join, relative, basename, posix } from 'node:path'

export interface LoadedSkill {
  name: string
  description: string
  systemPrompt: string
  files: string[]
}

export type SkillVariables = Record<string, string>

interface ParsedFrontmatter {
  name: string
  description: string
  body: string
}

const SKILL_MD = 'skill.md'

function sortByName(a: { name: string }, b: { name: string }): number {
  return a.name.localeCompare(b.name)
}

async function collectMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })

  const files = entries
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => join(dir, e.name))
    .sort((a, b) => basename(a).localeCompare(basename(b)))

  const skillMdPath = files.find((f) => basename(f).toLowerCase() === SKILL_MD)
  const orderedFiles: string[] = []

  if (skillMdPath) {
    orderedFiles.push(skillMdPath)
  }

  for (const f of files) {
    if (f !== skillMdPath) {
      orderedFiles.push(f)
    }
  }

  const subdirs = entries
    .filter((e) => e.isDirectory())
    .sort(sortByName)

  for (const subdir of subdirs) {
    const subFiles = await collectMarkdownFiles(join(dir, subdir.name))
    orderedFiles.push(...subFiles)
  }

  return orderedFiles
}

function toPosix(p: string): string {
  return p.replace(/\\/g, '/')
}

function parseFrontmatter(content: string): ParsedFrontmatter {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) {
    return { name: '', description: '', body: content.trim() }
  }

  const frontmatter: string = match[1]!
  const body: string = match[2]!.trim()

  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m)
  const name = nameMatch?.[1]?.trim() ?? ''

  // description 解析：支持单行、引号、折叠 (>)
  let description = ''
  const fmLines: string[] = frontmatter.split('\n')
  const descIdx = fmLines.findIndex((l) => l.trimStart().startsWith('description:'))

  if (descIdx >= 0) {
    const descLine: string = fmLines[descIdx]!
    const colonIdx = descLine.indexOf(':')
    let afterColon = descLine.slice(colonIdx + 1).trimStart()

    if (afterColon.startsWith('"') || afterColon.startsWith("'")) {
      // 引号包裹
      const quote = afterColon[0]
      let value = ''
      let escaped = false
      for (let i = 1; i < afterColon.length; i++) {
        const ch = afterColon[i]
        if (escaped) {
          value += ch
          escaped = false
          continue
        }
        if (ch === '\\') {
          escaped = true
          continue
        }
        if (ch === quote) {
          break
        }
        value += ch
      }
      description = value
    } else if (afterColon === '' || afterColon === '>' || afterColon === '|') {
      // 折叠或字面块：后续缩进行属于此字段
      const baseIndent = descLine.length - descLine.trimStart().length
      const folded: string[] = []
      for (let i = descIdx + 1; i < fmLines.length; i++) {
        const line: string = fmLines[i]!
        if (line.trim() === '') continue
        const lineIndent = line.length - line.trimStart().length
        if (lineIndent <= baseIndent) break
        folded.push(line.trim())
      }
      description = folded.join(' ')
    } else {
      // 简单单行
      description = afterColon
    }
  }

  return { name, description: description.trim(), body }
}

async function loadSingle(skillDir: string): Promise<LoadedSkill> {
  const files = await collectMarkdownFiles(skillDir)
  if (files.length === 0) {
    throw new Error(`No .md files found in skill directory: ${skillDir}`)
  }

  const skillMdPath = files.find(
    (f) => basename(f).toLowerCase() === SKILL_MD,
  )

  let name = 'unknown'
  let description = ''
  let skillContent = ''

  if (skillMdPath) {
    const raw = await readFile(skillMdPath, 'utf-8')
    const parsed = parseFrontmatter(raw)
    name = parsed.name || name
    description = parsed.description || description
    skillContent = parsed.body
  }

  const referenceParts: string[] = []
  for (const file of files) {
    if (file === skillMdPath) continue
    const relPath = toPosix(relative(skillDir, file))
    const content = await readFile(file, 'utf-8')
    const parsed = parseFrontmatter(content)
    referenceParts.push(`--- Reference: ${relPath} ---\n\n${parsed.body}`)
  }

  const systemPrompt = [
    `--- Skill: ${name} ---`,
    '',
    skillContent,
    ...referenceParts,
  ].join('\n')

  return {
    name,
    description,
    systemPrompt,
    files: files.map((f) => toPosix(relative(skillDir, f))),
  }
}

function mergeSkills(skills: LoadedSkill[]): LoadedSkill {
  if (skills.length === 1) return skills[0]!

  const names = skills.map((s) => s.name)
  const descriptions = skills.map((s) => s.description).filter(Boolean)

  const systemPrompt = skills
    .map((s) => s.systemPrompt)
    .join('\n\n--- Combined Skill ---\n\n')

  const allFiles = skills.flatMap((s, i) =>
    s.files.map((f) => `${names[i]}/${f}`),
  )

  return {
    name: names.join('+'),
    description: descriptions.join('; '),
    systemPrompt,
    files: allFiles,
  }
}

function interpolateTemplate(text: string, variables: SkillVariables): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    return key in variables ? variables[key]! : _match
  })
}

function applyVariables(skill: LoadedSkill, variables: SkillVariables): LoadedSkill {
  if (Object.keys(variables).length === 0) return skill
  return {
    name: skill.name,
    description: skill.description,
    systemPrompt: interpolateTemplate(skill.systemPrompt, variables),
    files: skill.files,
  }
}

export class SkillLoader {
  async load(
    skillDir: string | string[],
    variables: SkillVariables = {},
  ): Promise<LoadedSkill> {
    const dirs = Array.isArray(skillDir) ? skillDir : [skillDir]
    const loaded = await Promise.all(dirs.map((d) => loadSingle(d)))
    const merged = mergeSkills(loaded)
    return applyVariables(merged, variables)
  }
}
