import OpenAI from 'openai'
import { env } from '../../env.ts'
import { createKimiStreamer, type ChatStreamer } from './stream.ts'

// 模块扩充：Kimi K2.6 支持 `thinking` 字段控制是否走深度推理模式
// 关闭后 30s -> 5s。OpenAI SDK 自带类型不含此字段，扩充以避免业务调用点写 cast
declare module 'openai/resources/chat/completions' {
  interface ChatCompletionCreateParamsNonStreaming {
    thinking?: { type: 'enabled' | 'disabled' }
  }
  interface ChatCompletionCreateParamsStreaming {
    thinking?: { type: 'enabled' | 'disabled' }
  }
}

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

/**
 * Kimi K2.6 关闭推理模式的请求体片段。
 * 用法：spread 进 chat.completions.create 的参数
 *   await client.chat.completions.create({ model, messages, ...KIMI_INSTANT_MODE })
 *
 * 实测：32s -> 5s，响应质量在大多数业务场景下保持不变。
 * 复盘报告等深度分析场景如想保留 reasoning，省略本字段即可。
 */
export const KIMI_INSTANT_MODE = {
  thinking: { type: 'disabled' as const },
}

let cachedStreamer: ChatStreamer | null = null

const getKimiStreamer = (): ChatStreamer => {
  if (cachedStreamer) return cachedStreamer
  cachedStreamer = createKimiStreamer(getKimiClient())
  return cachedStreamer
}

export const kimiStreamer: ChatStreamer = {
  stream: (args) => getKimiStreamer().stream(args),
}
