import { config as dotenv } from 'dotenv'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const rootEnv = resolve(here, '../../../.env')

if (existsSync(rootEnv)) {
  dotenv({ path: rootEnv })
}

export const requireEnv = (name: string): string => {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return value
}

const optionalEnv = (name: string, fallback: string): string => process.env[name] ?? fallback

const numberEnv = (name: string, fallback: number): number => {
  const value = process.env[name]
  if (value === undefined || value === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const defaultDbPath = resolve(here, '../data/byteready.db')

export const env = {
  PORT: numberEnv('SERVER_PORT', 8787),
  NODE_ENV: optionalEnv('NODE_ENV', 'development'),
  isDev: (process.env.NODE_ENV ?? 'development') === 'development',

  KIMI_API_KEY: optionalEnv('KIMI_API_KEY', ''),
  KIMI_BASE_URL: optionalEnv('KIMI_BASE_URL', 'https://api.kimi.com/coding/v1'),
  KIMI_MODEL: optionalEnv('KIMI_MODEL', 'kimi-k2.6'),

  SILICONFLOW_API_KEY: optionalEnv('SILICONFLOW_API_KEY', ''),
  SILICONFLOW_BASE_URL: optionalEnv('SILICONFLOW_BASE_URL', 'https://api.siliconflow.cn/v1'),
  SILICONFLOW_IMAGE_MODEL: optionalEnv('SILICONFLOW_IMAGE_MODEL', 'Tongyi-MAI/Z-Image-Turbo'),
  SILICONFLOW_EMBEDDING_MODEL: optionalEnv('SILICONFLOW_EMBEDDING_MODEL', 'BAAI/bge-large-zh-v1.5'),
  SILICONFLOW_RERANK_MODEL: optionalEnv('SILICONFLOW_RERANK_MODEL', 'BAAI/bge-reranker-v2-m3'),

  VOLCENGINE_API_KEY: optionalEnv('VOLCENGINE_API_KEY', ''),
  VOLCENGINE_TTS_RESOURCE_ID: optionalEnv('VOLCENGINE_TTS_RESOURCE_ID', 'seed-tts-2.0'),
  VOLCENGINE_TTS_SPEAKER: optionalEnv(
    'VOLCENGINE_TTS_SPEAKER',
    'zh_female_shuangkuaisisi_moon_bigtts',
  ),
  VOLCENGINE_TTS_AUDIO_FORMAT: optionalEnv('VOLCENGINE_TTS_AUDIO_FORMAT', 'mp3'),
  VOLCENGINE_TTS_SAMPLE_RATE: numberEnv('VOLCENGINE_TTS_SAMPLE_RATE', 24000),
  VOLCENGINE_TTS_SPEECH_RATE: numberEnv('VOLCENGINE_TTS_SPEECH_RATE', 0),
  VOLCENGINE_TTS_LOUDNESS_RATE: numberEnv('VOLCENGINE_TTS_LOUDNESS_RATE', 0),
  VOLCENGINE_ASR_RESOURCE_ID: optionalEnv('VOLCENGINE_ASR_RESOURCE_ID', 'volc.seedasr.sauc.duration'),
  VOLCENGINE_ASR_LANGUAGE: optionalEnv('VOLCENGINE_ASR_LANGUAGE', 'zh-CN'),
  VOLCENGINE_ASR_SAMPLE_RATE: numberEnv('VOLCENGINE_ASR_SAMPLE_RATE', 16000),

  BYTEREADY_DB_PATH: optionalEnv('BYTEREADY_DB_PATH', defaultDbPath),
  BYTEREADY_DEMO_SEED: optionalEnv('BYTEREADY_DEMO_SEED', 'false') === 'true',
}
