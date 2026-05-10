import { describe, it, expect, beforeEach } from 'vitest'
import { openDbInMemory } from '../db/client.ts'
import { createResumeRepository } from './repository.ts'
import { randomUUID } from 'node:crypto'

describe('resume repository', () => {
  let repo: ReturnType<typeof createResumeRepository>
  let db: ReturnType<typeof openDbInMemory>

  beforeEach(() => {
    db = openDbInMemory()
    db.prepare('INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)')
      .run('user-1', 'test@test.com', 'Test', 'hash', Date.now())
    db.prepare('INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)')
      .run('user-a', 'a@test.com', 'A', 'hash', Date.now())
    db.prepare('INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)')
      .run('user-b', 'b@test.com', 'B', 'hash', Date.now())
    db.prepare('INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)')
      .run('u1', 'u1@test.com', 'U1', 'hash', Date.now())
    repo = createResumeRepository(db)
  })

  it('should create resume with projects', () => {
    const resume = repo.create({
      ownerId: 'user-1',
      title: 'My Resume',
      rawText: 'resume text',
      sourceFormat: 'pdf',
    }, [
      { name: 'Project A', period: '2023-2024', role: 'Dev', summary: 'desc', keywords: ['TS'] },
    ])

    expect(resume.id).toBeDefined()
    expect(resume.title).toBe('My Resume')

    const detail = repo.getById(resume.id)
    expect(detail).not.toBeNull()
    expect(detail!.projects).toHaveLength(1)
    expect(detail!.projects[0]!.name).toBe('Project A')
  })

  it('should list by owner', () => {
    repo.create({ ownerId: 'user-a', title: 'A', rawText: 'a', sourceFormat: 'paste' }, [])
    repo.create({ ownerId: 'user-b', title: 'B', rawText: 'b', sourceFormat: 'paste' }, [])

    const list = repo.listByOwner('user-a')
    expect(list).toHaveLength(1)
    expect(list[0]!.title).toBe('A')
  })

  it('should update project', () => {
    const resume = repo.create({ ownerId: 'u1', title: 'T', rawText: 'r', sourceFormat: 'paste' }, [
      { name: 'Old', period: '2023', role: 'Dev', summary: 'desc', keywords: ['JS'] },
    ])

    const project = repo.getById(resume.id)!.projects[0]!
    const updated = repo.updateProject(project.id, { name: 'New', summary: 'new desc' })
    expect(updated).toBe(true)

    const after = repo.getProject(project.id)
    expect(after!.name).toBe('New')
    expect(after!.summary).toBe('new desc')
  })

  it('should delete resume', () => {
    const resume = repo.create({ ownerId: 'u1', title: 'T', rawText: 'r', sourceFormat: 'paste' }, [])
    expect(repo.getById(resume.id)).not.toBeNull()

    repo.delete(resume.id)
    expect(repo.getById(resume.id)).toBeNull()
  })

  it('should return null for non-existent resume', () => {
    expect(repo.getById(randomUUID())).toBeNull()
  })
})
