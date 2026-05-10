import type { DatabaseSync } from 'node:sqlite'

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  title TEXT,
  model TEXT,
  system_prompt TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('system','user','assistant')),
  content TEXT NOT NULL DEFAULT '',
  reasoning_content TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending','completed','aborted','error')),
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages (conversation_id, created_at);

CREATE TABLE IF NOT EXISTS kv (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS resumes (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  parsed_at INTEGER,
  source_format TEXT CHECK (source_format IN ('pdf','docx','paste')),
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_resumes_owner ON resumes (owner_id);

CREATE TABLE IF NOT EXISTS resume_projects (
  id TEXT PRIMARY KEY,
  resume_id TEXT NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  period TEXT,
  role TEXT,
  summary TEXT,
  keywords TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_resume_projects_resume ON resume_projects (resume_id);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  position TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('junior','mid','senior','expert')),
  category TEXT NOT NULL CHECK (category IN ('bagua','project','algorithm')),
  main_text TEXT NOT NULL,
  expected_points TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_questions_filter ON questions (position, level, category);

CREATE TABLE IF NOT EXISTS interview_sessions (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  position TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('junior','mid','senior','expert')),
  target_company TEXT,
  resume_id TEXT REFERENCES resumes(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','ended')),
  started_at INTEGER,
  ended_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_interview_sessions_owner ON interview_sessions (owner_id);

CREATE TABLE IF NOT EXISTS turns (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  "index" INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('interviewer_main','interviewer_followup','candidate','system')),
  question_id TEXT REFERENCES questions(id) ON DELETE SET NULL,
  text TEXT NOT NULL,
  audio_meta TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_turns_session ON turns (session_id, "index");

CREATE TABLE IF NOT EXISTS review_reports (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE REFERENCES interview_sessions(id) ON DELETE CASCADE,
  overall_text TEXT NOT NULL,
  generated_at INTEGER NOT NULL,
  llm_meta TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS scores (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES review_reports(id) ON DELETE CASCADE,
  axis TEXT NOT NULL CHECK (axis IN ('专业知识深度','项目复述质量','表达与结构','逻辑与问题解决','沟通自然度')),
  value REAL NOT NULL CHECK (value >= 0 AND value <= 5),
  evidence TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scores_report ON scores (report_id);

CREATE TABLE IF NOT EXISTS trend_snapshots (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  axis TEXT NOT NULL,
  value REAL NOT NULL,
  session_id TEXT NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trend_snapshots_owner ON trend_snapshots (owner_id, created_at);
`

export const migrate = (db: DatabaseSync): void => {
  db.exec(SCHEMA_SQL)
}
