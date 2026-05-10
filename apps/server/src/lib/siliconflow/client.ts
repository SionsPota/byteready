import { env } from '../../env.ts'

export const siliconflowFetch = async <T>(
  pathname: `/${string}`,
  body: unknown,
  init?: RequestInit,
): Promise<T> => {
  if (!env.SILICONFLOW_API_KEY) {
    throw new Error('SILICONFLOW_API_KEY is not configured')
  }
  const res = await fetch(`${env.SILICONFLOW_BASE_URL}${pathname}`, {
    method: 'POST',
    ...init,
    headers: {
      Authorization: `Bearer ${env.SILICONFLOW_API_KEY}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`siliconflow ${pathname} ${res.status}: ${text}`)
  }
  return (await res.json()) as T
}

export interface SfImageResponse {
  images: { url: string }[]
  timings?: { inference: number }
  seed?: number
}

export interface SfEmbeddingResponse {
  object: 'list'
  data: { object: 'embedding'; embedding: number[]; index: number }[]
  model: string
  usage: { total_tokens: number; prompt_tokens?: number }
}

export interface SfRerankResponse {
  id: string
  results: { index: number; document?: { text: string } | null; relevance_score: number }[]
  meta?: { tokens: { input_tokens: number; output_tokens: number } }
}
