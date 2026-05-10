import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { AgentRuntime } from './runtime.ts'
import type { ChatStreamer, RawStreamChunk } from '../llm/stream.ts'

vi.mock('../llm/kimi.ts', () => ({
  getKimiClient: vi.fn().mockReturnValue({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: '{"score":5}' } }],
        }),
      },
    },
  }),
  KIMI_INSTANT_MODE: { thinking: { type: 'disabled' as const } },
  KIMI_MODEL: 'kimi-k2.6',
  kimiStreamer: { stream: vi.fn() },
}))

describe('AgentRuntime', () => {
  let tmpDir: string

  beforeEach(async () => {
    vi.clearAllMocks()
    tmpDir = await mkdtemp(join(tmpdir(), 'skill-rt-'))
    await writeFile(
      join(tmpDir, 'SKILL.md'),
      '---\nname: mock-skill\ndescription: A mock skill for testing\n---\n\n# Mock Skill\n\nTest content.',
    )
    await mkdir(join(tmpDir, 'refs'))
    await writeFile(
      join(tmpDir, 'refs', 'guide.md'),
      '---\n---\n\n# Guide\n\nReference text.',
    )
  })

  afterEach(async () => {
    const { rm } = await import('node:fs/promises')
    await rm(tmpDir, { recursive: true, force: true })
  })

  const createMockStreamer = (
    chunks: RawStreamChunk[],
  ): ChatStreamer => ({
    stream: vi.fn().mockImplementation(async function* () {
      for (const chunk of chunks) {
        yield chunk
      }
    }),
  })

  it('loads skill and includes system message in chat', async () => {
    const streamer = createMockStreamer([{ delta: 'Hello' }, { done: true }])
    const runtime = new AgentRuntime({
      skillDir: tmpDir,
      streamer,
      model: 'kimi-k2.6',
    })

    await runtime.load()

    expect(runtime.skill).not.toBeNull()
    expect(runtime.skill!.name).toBe('mock-skill')

    const collected: RawStreamChunk[] = []
    for await (const chunk of runtime.chat({ messages: [{ role: 'user', content: 'Hi' }] })) {
      collected.push(chunk)
    }

    expect(collected).toEqual([{ delta: 'Hello' }, { done: true }])

    const streamCall = vi.mocked(streamer.stream).mock.calls[0]?.[0]
    expect(streamCall).toBeDefined()
    expect(streamCall!.messages[0]!.role).toBe('system')
    expect(streamCall!.messages[0]!.content).toContain('--- Skill: mock-skill ---')
    expect(streamCall!.messages[0]!.content).toContain('Reference text.')
    expect(streamCall!.messages[1]).toEqual({ role: 'user', content: 'Hi' })
    expect(streamCall!.model).toBe('kimi-k2.6')
  })

  it('auto-loads skill on first chat', async () => {
    const streamer = createMockStreamer([{ delta: 'OK' }])
    const runtime = new AgentRuntime({
      skillDir: tmpDir,
      streamer,
      model: 'kimi-k2.6',
    })

    expect(runtime.skill).toBeNull()

    const collected: RawStreamChunk[] = []
    for await (const chunk of runtime.chat({ messages: [{ role: 'user', content: 'test' }] })) {
      collected.push(chunk)
    }

    expect(runtime.skill).not.toBeNull()
    expect(runtime.skill!.name).toBe('mock-skill')
  })

  it('passes temperature and signal to streamer', async () => {
    const streamer = createMockStreamer([{ delta: 'done' }])
    const abortCtrl = new AbortController()

    const runtime = new AgentRuntime({
      skillDir: tmpDir,
      streamer,
      model: 'kimi-k2.6',
      temperature: 0.3,
    })

    await runtime.load()
    for await (const _ of runtime.chat({ messages: [{ role: 'user', content: 'x' }], signal: abortCtrl.signal })) {
      void _
    }

    const streamCall = vi.mocked(streamer.stream).mock.calls[0]?.[0]
    expect(streamCall).toBeDefined()
    expect(streamCall!.temperature).toBe(0.3)
    expect(streamCall!.signal).toBe(abortCtrl.signal)
  })

  it('loads multiple skills via skillDirs', async () => {
    const { mkdir: mkDir } = await import('node:fs/promises')
    const dirA = join(tmpDir, 'skill-a')
    const dirB = join(tmpDir, 'skill-b')
    await mkDir(dirA)
    await mkDir(dirB)
    await writeFile(
      join(dirA, 'SKILL.md'),
      '---\nname: skill-a\n---\n\n# Skill A\n\nContent A.',
    )
    await writeFile(
      join(dirB, 'SKILL.md'),
      '---\nname: skill-b\n---\n\n# Skill B\n\nContent B.',
    )

    const streamer = createMockStreamer([{ delta: 'Multi' }])
    const runtime = new AgentRuntime({
      skillDirs: [dirA, dirB],
      streamer,
      model: 'kimi-k2.6',
    })

    await runtime.load()
    expect(runtime.skill!.name).toBe('skill-a+skill-b')

    const collected: RawStreamChunk[] = []
    for await (const chunk of runtime.chat({ messages: [{ role: 'user', content: 'Hi' }] })) {
      collected.push(chunk)
    }

    const streamCall = vi.mocked(streamer.stream).mock.calls[0]?.[0]
    expect(streamCall).toBeDefined()
    expect(streamCall!.messages[0]!.content).toContain('--- Skill: skill-a ---')
    expect(streamCall!.messages[0]!.content).toContain('--- Combined Skill ---')
    expect(streamCall!.messages[0]!.content).toContain('--- Skill: skill-b ---')
  })

  it('applies template variables during load', async () => {
    const { writeFile: wf } = await import('node:fs/promises')
    await wf(
      join(tmpDir, 'SKILL.md'),
      '---\nname: var-skill\n---\n\nHello {{name}}.',
    )

    const streamer = createMockStreamer([{ delta: 'Hi' }])
    const runtime = new AgentRuntime({
      skillDir: tmpDir,
      streamer,
      model: 'kimi-k2.6',
      variables: { name: 'Alice' },
    })

    await runtime.load()
    expect(runtime.skill!.systemPrompt).toContain('Hello Alice.')
    expect(runtime.skill!.systemPrompt).not.toContain('{{name}}')
  })

  it('returns structured JSON via jsonChat', async () => {
    const streamer = createMockStreamer([])
    const runtime = new AgentRuntime({
      skillDir: tmpDir,
      streamer,
      model: 'kimi-k2.6',
    })

    const result = await runtime.jsonChat({
      messages: [{ role: 'user', content: 'Evaluate this' }],
    })

    expect(result.text).toBe('{"score":5}')
    expect(result.data).toEqual({ score: 5 })
  })

  it('jsonChat appends jsonInstruction as user message', async () => {
    const { getKimiClient } = await import('../llm/kimi.ts')
    const streamer = createMockStreamer([])
    const runtime = new AgentRuntime({
      skillDir: tmpDir,
      streamer,
      model: 'kimi-k2.6',
    })

    await runtime.jsonChat({
      messages: [{ role: 'user', content: 'Evaluate' }],
      jsonInstruction: 'Return JSON only',
    })

    const createCall = vi.mocked(getKimiClient().chat.completions.create).mock.calls[0]?.[0]
    expect(createCall).toBeDefined()
    const msgs = createCall!.messages
    expect(msgs[msgs.length - 1]).toEqual({ role: 'user', content: 'Return JSON only' })
  })
})
