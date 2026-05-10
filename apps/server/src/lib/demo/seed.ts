import type { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'
import { env } from '../../env.ts'
import { getDb, closeDb } from '../db/client.ts'
import { hashPassword } from '../auth/password.ts'

// ====== Types ======

export interface DemoUser {
  id: string
  email: string
  name: string
  password: string
}

export interface DemoResume {
  id: string
  title: string
  rawText: string
  sourceFormat: 'pdf' | 'docx' | 'paste'
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
  contactLocation: string | null
  summary: string | null
  educations: unknown
  experiences: unknown
  skills: unknown
}

export interface DemoProject {
  id: string
  name: string
  period: string
  role: string
  summary: string
  keywords: string[]
}

export interface DemoTurn {
  kind: 'interviewer_main' | 'interviewer_followup' | 'candidate' | 'system'
  text: string
  phase?: string
  state?: string
  projectId?: string
  topic?: string
}

export interface DemoPhaseReview {
  phaseType: 'self_intro' | 'project_qa' | 'random_qa'
  phaseIndex: number
  scores: Array<{ dimension: string; score: number; weight: number; weighted: number }>
  totalScore: number
  evaluation: string
  interviewerReflection: string
  improvementSuggestions: Array<{ priority: 'high' | 'medium' | 'low'; suggestion: string }>
}

export interface DemoFullReview {
  phaseScoresSummary: Array<{ phaseType: string; score: number; duration: number }>
  coherenceScore: number
  jdMatchScore: number
  overallPersona: string
  consolidatedImprovements: Array<{ priority: 'high' | 'medium' | 'low'; sourcePhases: string[]; suggestion: string }>
  overallEvaluation: string
  overallScore: number
}

export interface DemoSession {
  id: string
  type: 'full' | 'self_intro' | 'project_qa' | 'random_qa'
  position: string
  targetCompany: string | null
  jobDescription: string | null
  status: 'ended'
  currentState: string
  startedAt: number
  endedAt: number
  createdAt: number
  turns: DemoTurn[]
  phaseReviews: DemoPhaseReview[]
  fullReview: DemoFullReview | null
}

export interface DemoAccount {
  user: DemoUser
  resume: DemoResume
  projects: DemoProject[]
  sessions: DemoSession[]
}

// ====== Seed Logic ======

function ensureEnv(): void {
  // env.ts loads .env automatically; just verify db path
  if (!env.BYTEREADY_DB_PATH) {
    throw new Error('BYTEREADY_DB_PATH not configured')
  }
}

function seedUser(db: DatabaseSync, user: DemoUser): void {
  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(user.id) as { id: string } | undefined
  if (existing) {
    console.log(`[seed] User ${user.email} already exists, skipping`)
    return
  }
  db.prepare(
    'INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(user.id, user.email, user.name, hashPassword(user.password), Date.now())
  console.log(`[seed] Created user: ${user.email}`)
}

function seedResume(db: DatabaseSync, userId: string, resume: DemoResume, projectIds: string[]): void {
  const existing = db.prepare('SELECT id FROM resumes WHERE id = ?').get(resume.id) as { id: string } | undefined
  if (existing) {
    console.log(`[seed] Resume ${resume.id} already exists, skipping`)
    return
  }
  const now = Date.now()
  db.prepare(
    `INSERT INTO resumes (
      id, owner_id, title, raw_text, parsed_at, source_format,
      contact_name, contact_email, contact_phone, contact_location,
      summary, educations, experiences, skills, project_ids, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    resume.id, userId, resume.title, resume.rawText, now, resume.sourceFormat,
    resume.contactName, resume.contactEmail, resume.contactPhone, resume.contactLocation,
    resume.summary,
    resume.educations ? JSON.stringify(resume.educations) : null,
    resume.experiences ? JSON.stringify(resume.experiences) : null,
    resume.skills ? JSON.stringify(resume.skills) : null,
    projectIds.length > 0 ? JSON.stringify(projectIds) : null,
    now
  )
  console.log(`[seed] Created resume: ${resume.title}`)
}

function seedProjects(db: DatabaseSync, userId: string, projects: DemoProject[]): void {
  const now = Date.now()
  for (const p of projects) {
    const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(p.id) as { id: string } | undefined
    if (existing) {
      console.log(`[seed] Project ${p.id} already exists, skipping`)
      continue
    }
    db.prepare(
      `INSERT INTO projects (id, owner_id, name, period, role, summary, keywords, source, source_resume_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      p.id, userId, p.name, p.period, p.role, p.summary,
      JSON.stringify(p.keywords), 'resume', null, now, now
    )
    console.log(`[seed] Created project: ${p.name}`)
  }
}

function seedSession(db: DatabaseSync, userId: string, session: DemoSession, resumeId: string, projectIds: string[]): void {
  const existing = db.prepare('SELECT id FROM training_sessions WHERE id = ?').get(session.id) as { id: string } | undefined
  if (existing) {
    console.log(`[seed] Session ${session.id} already exists, skipping`)
    return
  }

  const projectsDiscussed: string[] = []
  const topicsCovered: string[] = []
  let currentProjectId: string | null = null

  // 分析turns推导 projects_discussed / topics_covered / current_project_id
  for (const turn of session.turns) {
    if (turn.projectId && !projectsDiscussed.includes(turn.projectId)) {
      projectsDiscussed.push(turn.projectId)
      currentProjectId = turn.projectId
    }
    if (turn.topic && !topicsCovered.includes(turn.topic)) {
      topicsCovered.push(turn.topic)
    }
  }

  db.prepare(
    `INSERT INTO training_sessions (
      id, owner_id, type, position, target_company, job_description,
      resume_id, project_ids, status, current_state, current_phase, context_summary,
      parent_session_id, projects_discussed, topics_covered, current_project_id, current_topic,
      started_at, ended_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    session.id, userId, session.type, session.position,
    session.targetCompany, session.jobDescription,
    resumeId, projectIds.length > 0 ? JSON.stringify(projectIds) : null,
    session.status, session.currentState, null, null,
    null,
    projectsDiscussed.length > 0 ? JSON.stringify(projectsDiscussed) : null,
    topicsCovered.length > 0 ? JSON.stringify(topicsCovered) : null,
    currentProjectId, null,
    session.startedAt, session.endedAt, session.createdAt
  )

  // Insert turns
  for (const [i, t] of session.turns.entries()) {
    db.prepare(
      `INSERT INTO training_turns (
        id, session_id, "index", kind, text, audio_meta, phase, state, project_id, project_ids, topic, question_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      randomUUID(), session.id, i, t.kind, t.text, null,
      t.phase ?? null, t.state ?? null, t.projectId ?? null,
      null, t.topic ?? null, null,
      session.startedAt + i * 60000 // 每分钟一个turn
    )
  }

  console.log(`[seed] Created session: ${session.id} (${session.type}, ${session.turns.length} turns)`)

  // Insert phase reviews
  for (const pr of session.phaseReviews) {
    db.prepare(
      `INSERT INTO phase_reviews (
        id, session_id, phase_type, phase_index, scores, total_score,
        evaluation, interviewer_reflection, improvement_suggestions,
        rubric_version, coach_version, generated_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      randomUUID(), session.id, pr.phaseType, pr.phaseIndex,
      JSON.stringify(pr.scores), pr.totalScore,
      pr.evaluation, pr.interviewerReflection,
      JSON.stringify(pr.improvementSuggestions),
      'v3-phase',
      pr.phaseType === 'self_intro' ? 'introduction-coach' : 'interview-coach',
      session.endedAt, session.endedAt
    )
  }

  // Insert full review
  if (session.fullReview) {
    db.prepare(
      `INSERT INTO full_reviews (
        id, session_id, phase_review_ids, phase_scores_summary,
        coherence_score, jd_match_score, overall_persona,
        consolidated_improvements, overall_evaluation, overall_score,
        generated_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      randomUUID(), session.id,
      JSON.stringify(session.phaseReviews.map((_, i) => `pr-${i}`)),
      JSON.stringify(session.fullReview.phaseScoresSummary),
      session.fullReview.coherenceScore,
      session.fullReview.jdMatchScore,
      session.fullReview.overallPersona,
      JSON.stringify(session.fullReview.consolidatedImprovements),
      session.fullReview.overallEvaluation,
      session.fullReview.overallScore,
      session.endedAt, session.endedAt
    )
  }
}

export function seedAccount(db: DatabaseSync, account: DemoAccount): void {
  seedUser(db, account.user)
  const projectIds = account.projects.map((p) => p.id)
  seedProjects(db, account.user.id, account.projects)
  seedResume(db, account.user.id, account.resume, projectIds)

  for (const session of account.sessions) {
    seedSession(db, account.user.id, session, account.resume.id, projectIds)
  }
}

export function seedAll(accounts: DemoAccount[]): void {
  ensureEnv()
  const db = getDb()
  try {
    for (const account of accounts) {
      seedAccount(db, account)
    }
    console.log('[seed] Demo data seeded successfully')
  } catch (e) {
    console.error('[seed] Failed:', e)
    throw e
  } finally {
    closeDb()
  }
}
