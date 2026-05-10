import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { env } from '../../env.ts'
import { migrate } from './migrations.ts'

let cached: DatabaseSync | null = null
let exitHandlerRegistered = false

const registerExitHandler = (): void => {
  if (exitHandlerRegistered) return
  exitHandlerRegistered = true
  process.once('beforeExit', () => closeDb())
}

export const getDb = (): DatabaseSync => {
  if (cached) return cached
  mkdirSync(dirname(env.BYTEREADY_DB_PATH), { recursive: true })
  const db = new DatabaseSync(env.BYTEREADY_DB_PATH)
  db.exec('PRAGMA journal_mode = WAL')
  db.exec('PRAGMA foreign_keys = ON')
  migrate(db)
  cached = db
  registerExitHandler()
  return db
}

export const openDbInMemory = (): DatabaseSync => {
  const db = new DatabaseSync(':memory:')
  db.exec('PRAGMA foreign_keys = ON')
  migrate(db)
  return db
}

export const closeDb = (): void => {
  if (!cached) return
  try {
    cached.close()
  } catch {
    // 关闭失败不阻塞退出流程
  }
  cached = null
}

export const overrideDb = (db: DatabaseSync): void => {
  if (cached) {
    try {
      cached.close()
    } catch {
      // noop
    }
  }
  cached = db
}
