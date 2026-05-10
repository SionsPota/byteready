import type { DatabaseSync } from 'node:sqlite'

// ========== V2+V3 Schema (幂等，IF NOT EXISTS) ==========

const SCHEMA_LATEST = `
-- 保留：对话表
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

-- 保留：KV
CREATE TABLE IF NOT EXISTS kv (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 保留：用户
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- V2+V3：简历（扩展结构化字段）
CREATE TABLE IF NOT EXISTS resumes (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  parsed_at INTEGER,
  source_format TEXT CHECK (source_format IN ('pdf','docx','paste')),
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  contact_location TEXT,
  summary TEXT,
  educations TEXT,
  experiences TEXT,
  skills TEXT,
  project_ids TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_resumes_owner ON resumes (owner_id);

-- V2+V3：项目（独立表，替代 resume_projects）
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  period TEXT,
  role TEXT,
  summary TEXT,
  keywords TEXT,
  source TEXT,
  source_resume_id TEXT REFERENCES resumes(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects (owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_resume ON projects (source_resume_id);

-- V2+V3：题库（移除 level，category 增加 scene）
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  position TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('bagua','project','algorithm','scene')),
  main_text TEXT NOT NULL,
  expected_points TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_questions_filter ON questions (position, category);

-- V3：训练会话（扩展 job_description/persona/context/parent/phase）
CREATE TABLE IF NOT EXISTS training_sessions (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'full' CHECK (type IN ('full','self_intro','project_qa','random_qa')),
  position TEXT NOT NULL,
  target_company TEXT,
  job_description TEXT,
  persona_id TEXT,
  resume_id TEXT REFERENCES resumes(id) ON DELETE SET NULL,
  project_ids TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','ended')),
  current_state TEXT,
  current_phase TEXT,
  context_summary TEXT,
  parent_session_id TEXT,
  projects_discussed TEXT,
  topics_covered TEXT,
  current_project_id TEXT,
  current_topic TEXT,
  started_at INTEGER,
  ended_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_training_sessions_owner ON training_sessions (owner_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_parent ON training_sessions (parent_session_id);

-- V2+V3：训练回合（替代 turns）
CREATE TABLE IF NOT EXISTS training_turns (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  "index" INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('interviewer_main','interviewer_followup','candidate','system')),
  text TEXT NOT NULL,
  audio_meta TEXT,
  phase TEXT,
  state TEXT,
  project_id TEXT,
  project_ids TEXT,
  topic TEXT,
  question_id TEXT REFERENCES questions(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_training_turns_session ON training_turns (session_id, "index");

-- V2+V3：复盘报告（泛化：type + target_id）
CREATE TABLE IF NOT EXISTS review_reports (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'interview' CHECK (type IN ('interview','project','custom')),
  target_id TEXT NOT NULL,
  overall_text TEXT NOT NULL,
  generated_at INTEGER NOT NULL,
  llm_meta TEXT,
  created_at INTEGER NOT NULL
);

-- 保留：评分
CREATE TABLE IF NOT EXISTS scores (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES review_reports(id) ON DELETE CASCADE,
  axis TEXT NOT NULL CHECK (axis IN ('专业知识深度','项目复述质量','表达与结构','逻辑与问题解决','沟通自然度')),
  value REAL NOT NULL CHECK (value >= 0 AND value <= 5),
  evidence TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_scores_report ON scores (report_id);

-- V3：阶段复盘
CREATE TABLE IF NOT EXISTS phase_reviews (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  phase_type TEXT NOT NULL CHECK (phase_type IN ('self_intro','project_qa','random_qa')),
  phase_index INTEGER NOT NULL,
  scores TEXT,
  total_score REAL,
  evaluation TEXT NOT NULL,
  interviewer_reflection TEXT NOT NULL,
  improvement_suggestions TEXT,
  rubric_version TEXT,
  coach_version TEXT,
  generated_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_phase_reviews_session ON phase_reviews (session_id, phase_index);

-- V3：整面复盘
CREATE TABLE IF NOT EXISTS full_reviews (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  phase_review_ids TEXT,
  phase_scores_summary TEXT,
  coherence_score REAL,
  jd_match_score REAL,
  overall_persona TEXT,
  consolidated_improvements TEXT,
  overall_evaluation TEXT NOT NULL,
  overall_score REAL,
  generated_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_full_reviews_session ON full_reviews (session_id);

-- V2+V3：趋势快照（兼容旧数据，后续通过 V3 双轨扩展）
CREATE TABLE IF NOT EXISTS trend_snapshots (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  axis TEXT NOT NULL,
  value REAL NOT NULL,
  session_id TEXT REFERENCES training_sessions(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_trend_snapshots_owner ON trend_snapshots (owner_id, created_at);

-- V3：阶段级趋势快照
CREATE TABLE IF NOT EXISTS phase_trend_snapshots (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phase_type TEXT NOT NULL,
  dimension TEXT NOT NULL,
  score REAL NOT NULL,
  session_id TEXT REFERENCES training_sessions(id) ON DELETE CASCADE,
  phase_review_id TEXT REFERENCES phase_reviews(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_phase_trend_owner ON phase_trend_snapshots (owner_id, phase_type, dimension, created_at);

-- V3：整面级趋势快照
CREATE TABLE IF NOT EXISTS full_trend_snapshots (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  metric TEXT NOT NULL,
  value REAL NOT NULL,
  session_id TEXT REFERENCES training_sessions(id) ON DELETE CASCADE,
  full_review_id TEXT REFERENCES full_reviews(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_full_trend_owner ON full_trend_snapshots (owner_id, metric, created_at);

-- 探索：公司画像（含 logo/industry/color）
CREATE TABLE IF NOT EXISTS company_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  interview_style TEXT,
  positions TEXT,
  tags TEXT,
  logo TEXT,
  industry TEXT,
  color TEXT,
  updated_at INTEGER NOT NULL
);

-- 探索：面经（兼容"题目库式"+"经历式"两种数据）
CREATE TABLE IF NOT EXISTS experiences (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES company_profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  company TEXT,
  position TEXT,
  content TEXT,
  source TEXT,
  source_url TEXT,
  difficulty INTEGER,
  result TEXT CHECK (result IS NULL OR result IN ('passed','failed','pending','ghosted')),
  interview_date INTEGER,
  view_count INTEGER NOT NULL DEFAULT 0,
  -- 题目库式扩展字段
  interview_round TEXT,
  interview_type TEXT,
  answer_key_points TEXT,
  related_trend_ids TEXT,
  related_project_ids TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_experiences_company ON experiences (company_id);

-- 探索：标签
CREATE TABLE IF NOT EXISTS explore_tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT,
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('tech','process','role','other')),
  created_at INTEGER NOT NULL
);

-- 探索：面经-标签关联（M:N）
CREATE TABLE IF NOT EXISTS experience_tags (
  experience_id TEXT NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES explore_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (experience_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_experience_tags_tag ON experience_tags (tag_id);

-- 探索：行业趋势（独立条目，按角色推荐）
-- 字段名向外部数据源对齐：category（原 domain）/ description（原 summary）
CREATE TABLE IF NOT EXISTS industry_trends (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  key_points TEXT,
  learning_advice TEXT,
  source_url TEXT,
  source_title TEXT,
  related_skills TEXT,
  related_role TEXT,
  relevance_base INTEGER NOT NULL DEFAULT 7,
  related_project_ids TEXT,
  -- 外部数据源扩展字段
  market_impact TEXT,
  interview_hotspots TEXT,
  year TEXT,
  tags TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_industry_trends_role ON industry_trends (related_role);
CREATE INDEX IF NOT EXISTS idx_industry_trends_category ON industry_trends (category);

-- 探索：学习项目（兼容"GitHub 推荐式"+"项目模板式"两种数据）
CREATE TABLE IF NOT EXISTS learning_projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  project_type TEXT CHECK (project_type IS NULL OR project_type IN ('quick_win','weekend_build','deep_dive')),
  difficulty TEXT CHECK (difficulty IS NULL OR difficulty IN ('beginner','intermediate','advanced')),
  time_estimate TEXT,
  tech_stack TEXT,
  gap_addressed TEXT,
  description TEXT NOT NULL,
  core_features TEXT,
  tech_highlights TEXT,
  implementation_steps TEXT,
  resume_template TEXT,
  impact_score INTEGER NOT NULL DEFAULT 7,
  source_url TEXT,
  related_role TEXT,
  related_skills TEXT,
  related_trend_ids TEXT,
  -- GitHub 推荐式扩展字段
  github_url TEXT,
  stars INTEGER,
  forks INTEGER,
  language TEXT,
  category TEXT,
  learning_path TEXT,
  is_interview_related INTEGER,
  tags TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_learning_projects_role ON learning_projects (related_role, project_type);
CREATE INDEX IF NOT EXISTS idx_learning_projects_category ON learning_projects (category);
CREATE INDEX IF NOT EXISTS idx_learning_projects_language ON learning_projects (language);

-- 面试大数据集（Chinese_interview_large.json）
CREATE TABLE IF NOT EXISTS interview_qa (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  source TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_interview_qa_question ON interview_qa (question);

-- FTS5 全文搜索虚拟表（中文支持）
CREATE VIRTUAL TABLE IF NOT EXISTS interview_qa_fts USING fts5(
  question,
  answer,
  content='interview_qa',
  content_rowid='id'
);

-- FTS5 同步触发器
CREATE TRIGGER IF NOT EXISTS interview_qa_fts_insert AFTER INSERT ON interview_qa BEGIN
  INSERT INTO interview_qa_fts(rowid, question, answer)
  VALUES (new.id, new.question, new.answer);
END;

CREATE TRIGGER IF NOT EXISTS interview_qa_fts_delete AFTER DELETE ON interview_qa BEGIN
  INSERT INTO interview_qa_fts(interview_qa_fts, rowid, question, answer)
  VALUES ('delete', old.id, old.question, old.answer);
END;
`

// ========== V1 → V2 迁移 ==========

const v1Tables = ['interview_sessions', 'turns', 'resume_projects']

const hasTable = (db: DatabaseSync, name: string): boolean => {
  try {
    const row = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name = ?"
    ).get(name) as { name: string } | undefined
    return row !== undefined
  } catch {
    return false
  }
}

const needsV1Migration = (db: DatabaseSync): boolean =>
  v1Tables.some((t) => hasTable(db, t))

const migrateV1ToV2 = (db: DatabaseSync): void => {
  db.exec('PRAGMA foreign_keys = OFF')
  try {
    // 1. 重建 review_reports
    if (hasTable(db, 'review_reports')) {
      db.exec(`DROP TABLE IF EXISTS _backup_review_reports`)
      db.exec(`CREATE TABLE _backup_review_reports AS SELECT * FROM review_reports`)
      db.exec(`DROP TABLE review_reports`)
      db.exec(`
        CREATE TABLE review_reports (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL DEFAULT 'interview' CHECK (type IN ('interview','project','custom')),
          target_id TEXT NOT NULL,
          overall_text TEXT NOT NULL,
          generated_at INTEGER NOT NULL,
          llm_meta TEXT,
          created_at INTEGER NOT NULL
        )
      `)
      db.exec(`
        INSERT INTO review_reports (id, type, target_id, overall_text, generated_at, llm_meta, created_at)
        SELECT id, 'interview', session_id, overall_text, generated_at, llm_meta, created_at
        FROM _backup_review_reports
      `)
    }

    // 2. 重建 questions
    if (hasTable(db, 'questions')) {
      db.exec(`DROP TABLE IF EXISTS _backup_questions`)
      db.exec(`CREATE TABLE _backup_questions AS SELECT * FROM questions`)
      db.exec(`DROP TABLE questions`)
      db.exec(`
        CREATE TABLE questions (
          id TEXT PRIMARY KEY,
          position TEXT NOT NULL,
          category TEXT NOT NULL CHECK (category IN ('bagua','project','algorithm','scene')),
          main_text TEXT NOT NULL,
          expected_points TEXT,
          created_at INTEGER NOT NULL
        )
      `)
      db.exec(`CREATE INDEX idx_questions_filter ON questions (position, category)`)
      db.exec(`
        INSERT INTO questions (id, position, category, main_text, expected_points, created_at)
        SELECT id, position, category, main_text, expected_points, created_at
        FROM _backup_questions
      `)
    }

    // 3. 备份旧表
    if (hasTable(db, 'turns')) {
      db.exec(`DROP TABLE IF EXISTS _backup_turns`)
      db.exec(`CREATE TABLE _backup_turns AS SELECT * FROM turns`)
    }
    if (hasTable(db, 'interview_sessions')) {
      db.exec(`DROP TABLE IF EXISTS _backup_interview_sessions`)
      db.exec(`CREATE TABLE _backup_interview_sessions AS SELECT * FROM interview_sessions`)
    }
    if (hasTable(db, 'trend_snapshots')) {
      db.exec(`DROP TABLE IF EXISTS _backup_trend_snapshots`)
      db.exec(`CREATE TABLE _backup_trend_snapshots AS SELECT * FROM trend_snapshots`)
    }

    // 4-5. 删除旧表
    db.exec(`DROP TABLE IF EXISTS interview_sessions`)
    db.exec(`DROP TABLE IF EXISTS turns`)

    // 6. 创建 training_sessions（V3 扩展字段已在 SCHEMA_LATEST 中定义，这里用 V2 兼容版本）
    db.exec(`
      CREATE TABLE training_sessions (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL DEFAULT 'interview' CHECK (type IN ('interview','project_drill','custom')),
        position TEXT NOT NULL,
        target_company TEXT,
        resume_id TEXT REFERENCES resumes(id) ON DELETE SET NULL,
        project_ids TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','ended')),
        current_state TEXT,
        projects_discussed TEXT,
        topics_covered TEXT,
        current_project_id TEXT,
        current_topic TEXT,
        started_at INTEGER,
        ended_at INTEGER,
        created_at INTEGER NOT NULL
      )
    `)
    db.exec(`CREATE INDEX idx_training_sessions_owner ON training_sessions (owner_id)`)

    // 7. 导入 interview_sessions 数据
    if (hasTable(db, '_backup_interview_sessions')) {
      db.exec(`
        INSERT INTO training_sessions (id, owner_id, type, position, target_company, resume_id, project_ids, status, current_state, projects_discussed, topics_covered, current_project_id, current_topic, started_at, ended_at, created_at)
        SELECT id, owner_id, 'interview', position, target_company, resume_id, NULL, status, NULL, NULL, NULL, NULL, NULL, started_at, ended_at, created_at
        FROM _backup_interview_sessions
      `)
    }

    // 8. 创建 training_turns
    db.exec(`
      CREATE TABLE training_turns (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
        "index" INTEGER NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('interviewer_main','interviewer_followup','candidate','system')),
        text TEXT NOT NULL,
        audio_meta TEXT,
        phase TEXT,
        state TEXT,
        project_id TEXT,
        project_ids TEXT,
        topic TEXT,
        question_id TEXT REFERENCES questions(id) ON DELETE SET NULL,
        created_at INTEGER NOT NULL
      )
    `)
    db.exec(`CREATE INDEX idx_training_turns_session ON training_turns (session_id, "index")`)

    // 9. 导入 turns 数据
    if (hasTable(db, '_backup_turns')) {
      db.exec(`
        INSERT INTO training_turns (id, session_id, "index", kind, text, audio_meta, phase, state, project_id, project_ids, topic, question_id, created_at)
        SELECT id, session_id, "index", kind, text, audio_meta, NULL, NULL, NULL, NULL, NULL, question_id, created_at
        FROM _backup_turns
      `)
    }

    // 10. 重建 trend_snapshots
    if (hasTable(db, '_backup_trend_snapshots')) {
      db.exec(`DROP TABLE IF EXISTS trend_snapshots`)
      db.exec(`
        CREATE TABLE trend_snapshots (
          id TEXT PRIMARY KEY,
          owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          axis TEXT NOT NULL,
          value REAL NOT NULL,
          session_id TEXT REFERENCES training_sessions(id) ON DELETE CASCADE,
          created_at INTEGER NOT NULL
        )
      `)
      db.exec(`CREATE INDEX idx_trend_snapshots_owner ON trend_snapshots (owner_id, created_at)`)
      db.exec(`
        INSERT INTO trend_snapshots (id, owner_id, axis, value, session_id, created_at)
        SELECT id, owner_id, axis, value, session_id, created_at
        FROM _backup_trend_snapshots
      `)
    }

    // 11. 为 resumes 添加新列
    const resumeCols = ['contact_name', 'contact_email', 'contact_phone', 'contact_location', 'summary', 'educations', 'experiences', 'skills', 'project_ids']
    for (const col of resumeCols) {
      try {
        db.exec(`ALTER TABLE resumes ADD COLUMN ${col} TEXT`)
      } catch {
        // 列已存在或表不存在，忽略
      }
    }

    // 12. 从 resume_projects 迁移到 projects
    if (hasTable(db, 'resume_projects')) {
      db.exec(`
        INSERT OR IGNORE INTO projects (id, owner_id, name, period, role, summary, keywords, source, source_resume_id, created_at, updated_at)
        SELECT rp.id, r.owner_id, rp.name, rp.period, rp.role, rp.summary, rp.keywords, 'resume', rp.resume_id, rp.created_at, rp.created_at
        FROM resume_projects rp
        JOIN resumes r ON rp.resume_id = r.id
      `)
      db.exec(`
        UPDATE resumes SET project_ids = (
          SELECT json_group_array(p.id)
          FROM projects p
          WHERE p.source_resume_id = resumes.id
          ORDER BY p.created_at
        )
        WHERE project_ids IS NULL
      `)
      db.exec(`DROP TABLE resume_projects`)
    }

    // 13. 清理备份表
    db.exec(`
      DROP TABLE IF EXISTS _backup_turns;
      DROP TABLE IF EXISTS _backup_interview_sessions;
      DROP TABLE IF EXISTS _backup_review_reports;
      DROP TABLE IF EXISTS _backup_trend_snapshots;
      DROP TABLE IF EXISTS _backup_questions;
    `)
  } finally {
    db.exec('PRAGMA foreign_keys = ON')
  }
}

// ========== V2 → V3 迁移 ==========

const needsV2ToV3Migration = (db: DatabaseSync): boolean => {
  // 检查 training_sessions 是否有 V3 新列
  try {
    const cols = db.prepare(`PRAGMA table_info(training_sessions)`).all() as { name: string }[]
    return !cols.some((c) => c.name === 'job_description')
  } catch {
    return false
  }
}

const migrateV2ToV3 = (db: DatabaseSync): void => {
  db.exec('PRAGMA foreign_keys = OFF')
  try {
    // 1. 备份 training_sessions 数据
    if (hasTable(db, 'training_sessions')) {
      db.exec(`DROP TABLE IF EXISTS _backup_training_sessions`)
      db.exec(`CREATE TABLE _backup_training_sessions AS SELECT * FROM training_sessions`)
      db.exec(`DROP TABLE training_sessions`)
    }

    // 2. 创建新的 training_sessions 表（带 V3 约束）
    db.exec(`
      CREATE TABLE training_sessions (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL DEFAULT 'full' CHECK (type IN ('full','self_intro','project_qa','random_qa')),
        position TEXT NOT NULL,
        target_company TEXT,
        job_description TEXT,
        persona_id TEXT,
        resume_id TEXT REFERENCES resumes(id) ON DELETE SET NULL,
        project_ids TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','ended')),
        current_state TEXT,
        current_phase TEXT,
        context_summary TEXT,
        parent_session_id TEXT,
        projects_discussed TEXT,
        topics_covered TEXT,
        current_project_id TEXT,
        current_topic TEXT,
        started_at INTEGER,
        ended_at INTEGER,
        created_at INTEGER NOT NULL
      )
    `)
    db.exec(`CREATE INDEX idx_training_sessions_owner ON training_sessions (owner_id)`)
    db.exec(`CREATE INDEX idx_training_sessions_parent ON training_sessions (parent_session_id)`)

    // 3. 恢复数据（type 映射）
    if (hasTable(db, '_backup_training_sessions')) {
      db.exec(`
        INSERT INTO training_sessions (
          id, owner_id, type, position, target_company, job_description, persona_id,
          resume_id, project_ids, status, current_state, current_phase, context_summary,
          parent_session_id, projects_discussed, topics_covered, current_project_id,
          current_topic, started_at, ended_at, created_at
        )
        SELECT
          id, owner_id,
          CASE type
            WHEN 'interview' THEN 'full'
            WHEN 'project_drill' THEN 'project_qa'
            WHEN 'custom' THEN 'random_qa'
            ELSE type
          END,
          position, target_company, NULL, NULL,
          resume_id, project_ids, status, current_state, NULL, NULL,
          NULL, projects_discussed, topics_covered, current_project_id,
          current_topic, started_at, ended_at, created_at
        FROM _backup_training_sessions
      `)
      db.exec(`DROP TABLE _backup_training_sessions`)
    }
  } finally {
    db.exec('PRAGMA foreign_keys = ON')
  }
}

// ========== 探索模块 schema 迁移 ==========
// 探索表（experiences/company_profiles/industry_trends/learning_projects）只承载 seed 数据，
// 没有真实业务数据；schema 演进时直接 DROP + 重建，由后续 SCHEMA_LATEST + seedExploreIfEmpty 重新填充。

const needsExploreSchemaMigration = (db: DatabaseSync): boolean => {
  if (!hasTable(db, 'experiences')) return false
  try {
    // V2→V2.1：experiences.company_id 列缺失
    const expCols = db.prepare(`PRAGMA table_info(experiences)`).all() as { name: string }[]
    if (!expCols.some((c) => c.name === 'company_id')) return true
    // V2.1→V2.2：experiences 缺题目库式列
    if (!expCols.some((c) => c.name === 'answer_key_points')) return true

    // V2.1→V2.2：industry_trends 字段重命名（domain → category）
    if (hasTable(db, 'industry_trends')) {
      const trendCols = db
        .prepare(`PRAGMA table_info(industry_trends)`)
        .all() as { name: string }[]
      if (!trendCols.some((c) => c.name === 'category')) return true
      if (!trendCols.some((c) => c.name === 'interview_hotspots')) return true
    }

    // V2.1→V2.2：learning_projects 缺 GitHub 推荐式列
    if (hasTable(db, 'learning_projects')) {
      const projCols = db
        .prepare(`PRAGMA table_info(learning_projects)`)
        .all() as { name: string }[]
      if (!projCols.some((c) => c.name === 'github_url')) return true
    }

    return false
  } catch {
    return false
  }
}

const migrateExploreSchema = (db: DatabaseSync): void => {
  db.exec('PRAGMA foreign_keys = OFF')
  try {
    // 旧表无真实数据，直接重建（依赖后续 SCHEMA_LATEST 执行 IF NOT EXISTS 创建新表）
    db.exec(`DROP TABLE IF EXISTS experience_tags`)
    db.exec(`DROP TABLE IF EXISTS experiences`)
    db.exec(`DROP TABLE IF EXISTS company_profiles`)
    db.exec(`DROP TABLE IF EXISTS industry_trends`)
    db.exec(`DROP TABLE IF EXISTS learning_projects`)
    db.exec(`DROP TABLE IF EXISTS explore_tags`)
  } finally {
    db.exec('PRAGMA foreign_keys = ON')
  }
}

export const migrate = (db: DatabaseSync): void => {
  if (needsV1Migration(db)) {
    migrateV1ToV2(db)
  }
  // 在执行最新 schema 前，先清理需要重建的旧探索表（含旧 tags 列）
  if (needsExploreSchemaMigration(db)) {
    migrateExploreSchema(db)
  }
  // 执行最新 schema（新表会被创建，已存在的表会被 IF NOT EXISTS 跳过）
  db.exec(SCHEMA_LATEST)
  // 再执行 V2→V3 列迁移
  if (needsV2ToV3Migration(db)) {
    migrateV2ToV3(db)
  }
}
