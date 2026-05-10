import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { SkillLoader } from './loader.ts'

describe('SkillLoader', () => {
  let tmpDir: string
  let loader: SkillLoader

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'skill-test-'))
    loader = new SkillLoader()
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('loads SKILL.md with frontmatter', async () => {
    await writeFile(
      join(tmpDir, 'SKILL.md'),
      '---\nname: test-skill\ndescription: A test skill\n---\n\n# Test Skill\n\nThis is the body.',
    )

    const loaded = await loader.load(tmpDir)

    expect(loaded.name).toBe('test-skill')
    expect(loaded.description).toBe('A test skill')
    expect(loaded.systemPrompt).toContain('# Test Skill')
    expect(loaded.systemPrompt).toContain('This is the body.')
    expect(loaded.files).toContain('SKILL.md')
  })

  it('loads reference files in subdirectories', async () => {
    await writeFile(
      join(tmpDir, 'SKILL.md'),
      '---\nname: ref-skill\n---\n\nMain skill content.',
    )
    await mkdir(join(tmpDir, 'references'))
    await writeFile(
      join(tmpDir, 'references', 'guide.md'),
      '---\n---\n\n# Guide\n\nReference content.',
    )

    const loaded = await loader.load(tmpDir)

    expect(loaded.files).toContain('references/guide.md')
    expect(loaded.systemPrompt).toContain('--- Reference: references/guide.md ---')
    expect(loaded.systemPrompt).toContain('Reference content.')
  })

  it('folds multi-line description with >', async () => {
    await writeFile(
      join(tmpDir, 'SKILL.md'),
      '---\nname: fold-skill\ndescription: >\n  Line one\n  Line two\n---\n\nBody.',
    )

    const loaded = await loader.load(tmpDir)

    expect(loaded.description).toBe('Line one Line two')
  })

  it('throws when directory has no .md files', async () => {
    await expect(loader.load(tmpDir)).rejects.toThrow(
      'No .md files found',
    )
  })

  it('orders SKILL.md first then alphabetical', async () => {
    await writeFile(
      join(tmpDir, 'SKILL.md'),
      '---\nname: ordered\n---\n\nMain.',
    )
    await writeFile(
      join(tmpDir, 'zebra.md'),
      '---\n---\n\nZebra content.',
    )
    await writeFile(
      join(tmpDir, 'apple.md'),
      '---\n---\n\nApple content.',
    )

    const loaded = await loader.load(tmpDir)

    expect(loaded.files[0]).toBe('SKILL.md')
    expect(loaded.files[1]).toBe('apple.md')
    expect(loaded.files[2]).toBe('zebra.md')
  })

  it('recursively loads nested subdirectories', async () => {
    await writeFile(
      join(tmpDir, 'SKILL.md'),
      '---\nname: nested\n---\n\nMain.',
    )
    await mkdir(join(tmpDir, 'refs', 'deep'), { recursive: true })
    await writeFile(
      join(tmpDir, 'refs', 'deep', 'note.md'),
      '---\n---\n\nDeep note.',
    )

    const loaded = await loader.load(tmpDir)

    expect(loaded.files).toContain('refs/deep/note.md')
    expect(loaded.systemPrompt).toContain('--- Reference: refs/deep/note.md ---')
    expect(loaded.systemPrompt).toContain('Deep note.')
  })

  it('handles file without frontmatter', async () => {
    await writeFile(
      join(tmpDir, 'SKILL.md'),
      '# No Frontmatter\n\nJust body.',
    )

    const loaded = await loader.load(tmpDir)

    expect(loaded.name).toBe('unknown')
    expect(loaded.systemPrompt).toContain('# No Frontmatter')
  })

  it('replaces template variables in skill content', async () => {
    await writeFile(
      join(tmpDir, 'SKILL.md'),
      '---\nname: var-skill\n---\n\nHello {{name}}, welcome to {{company}}.',
    )
    await mkdir(join(tmpDir, 'refs'))
    await writeFile(
      join(tmpDir, 'refs', 'guide.md'),
      '---\n---\n\nFor {{name}} at {{company}}.',
    )

    const loaded = await loader.load(tmpDir, { name: 'Alice', company: 'ByteDance' })

    expect(loaded.systemPrompt).toContain('Hello Alice, welcome to ByteDance.')
    expect(loaded.systemPrompt).toContain('For Alice at ByteDance.')
    expect(loaded.systemPrompt).not.toContain('{{name}}')
    expect(loaded.systemPrompt).not.toContain('{{company}}')
  })

  it('preserves unmatched template variables', async () => {
    await writeFile(
      join(tmpDir, 'SKILL.md'),
      '---\nname: partial\n---\n\nHello {{name}}, {{missing}} remains.',
    )

    const loaded = await loader.load(tmpDir, { name: 'Bob' })

    expect(loaded.systemPrompt).toContain('Hello Bob,')
    expect(loaded.systemPrompt).toContain('{{missing}} remains.')
  })

  it('loads multiple skills and merges them', async () => {
    const dirA = join(tmpDir, 'skill-a')
    const dirB = join(tmpDir, 'skill-b')
    await mkdir(dirA)
    await mkdir(dirB)

    await writeFile(
      join(dirA, 'SKILL.md'),
      '---\nname: skill-a\ndescription: Skill A\n---\n\n# Skill A\n\nContent A.',
    )
    await writeFile(
      join(dirB, 'SKILL.md'),
      '---\nname: skill-b\ndescription: Skill B\n---\n\n# Skill B\n\nContent B.',
    )

    const loaded = await loader.load([dirA, dirB])

    expect(loaded.name).toBe('skill-a+skill-b')
    expect(loaded.description).toBe('Skill A; Skill B')
    expect(loaded.systemPrompt).toContain('--- Skill: skill-a ---')
    expect(loaded.systemPrompt).toContain('Content A.')
    expect(loaded.systemPrompt).toContain('--- Combined Skill ---')
    expect(loaded.systemPrompt).toContain('--- Skill: skill-b ---')
    expect(loaded.systemPrompt).toContain('Content B.')
    expect(loaded.files).toContain('skill-a/SKILL.md')
    expect(loaded.files).toContain('skill-b/SKILL.md')
  })
})
