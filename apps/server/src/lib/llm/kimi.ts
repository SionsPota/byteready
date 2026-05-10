import OpenAI from 'openai'
import { env } from '../../env.ts'
import { createKimiStreamer, type ChatStreamer } from './stream.ts'

let cachedClient: OpenAI | null = null

export const getKimiClient = (): OpenAI => {
  if (cachedClient) return cachedClient
  if (!env.KIMI_API_KEY) {
    throw new Error('KIMI_API_KEY is not configured')
  }
  cachedClient = new OpenAI({
    apiKey: env.KIMI_API_KEY,
    baseURL: env.KIMI_BASE_URL,
    defaultHeaders: {
      'User-Agent': 'claude-code/1.0.0',
    },
  })
  return cachedClient
}

export const KIMI_MODEL: string = env.KIMI_MODEL

let cachedStreamer: ChatStreamer | null = null

const getKimiStreamer = (): ChatStreamer => {
  if (cachedStreamer) return cachedStreamer
  cachedStreamer = createKimiStreamer(getKimiClient())
  return cachedStreamer
}

export const kimiStreamer: ChatStreamer = {
  stream: (args) => getKimiStreamer().stream(args),
}
