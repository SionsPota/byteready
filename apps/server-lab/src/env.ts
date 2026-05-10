import { config as dotenv } from 'dotenv'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// 共用仓库根 .env(与主 server 同一份凭证)
const here = dirname(fileURLToPath(import.meta.url))
const rootEnv = resolve(here, '../../../.env')

if (existsSync(rootEnv)) {
  dotenv({ path: rootEnv })
}

const optionalEnv = (name: string, fallback: string): string => process.env[name] ?? fallback

const numberEnv = (name: string, fallback: number): number => {
  const value = process.env[name]
  if (value === undefined || value === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const labEnv = {
  PORT: numberEnv('LAB_SERVER_PORT', 8788),
  NODE_ENV: optionalEnv('NODE_ENV', 'development'),
  isDev: (process.env.NODE_ENV ?? 'development') === 'development',
}
