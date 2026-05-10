import { Hono } from 'hono'
import { err, ok } from '@byteready/shared'
import {
  getKimiClient,
  KIMI_MODEL,
  KIMI_INSTANT_MODE,
  kimiStreamer,
} from '../../../server/src/lib/llm/kimi.ts'
import type { ChatMessage } from '../../../server/src/lib/llm/stream.ts'

export const llmRoute = new Hono()

interface ChatBody {
  messages?: ChatMessage[]
  temperature?: number
  thinking?: boolean
  model?: string
}

const validateBody = (raw: unknown): ChatBody | string => {
  if (!raw || typeof raw !== 'object') return '请求体必须是 JSON 对象'
  const body = raw as ChatBody
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return 'messages 必填,且至少有一条'
  }
  for (const m of body.messages) {
    if (!m || typeof m !== 'object') return 'messages[] 元素必须是对象'
    if (m.role !== 'system' && m.role !== 'user' && m.role !== 'assistant') {
      return `非法 role: ${m.role}`
    }
    if (typeof m.content !== 'string') return 'messages[].content 必须是字符串'
  }
  if (
    body.temperature !== undefined &&
    (typeof body.temperature !== 'number' || body.temperature < 0 || body.temperature > 2)
  ) {
    return 'temperature 必须是 0-2 之间的数字'
  }
  return body
}

llmRoute.post('/chat', async (c) => {
  let raw: unknown
  try {
    raw = await c.req.json()
  } catch {
    return c.json(err('VALIDATION', '请求体必须是合法 JSON'), 400)
  }
  const validated = validateBody(raw)
  if (typeof validated === 'string') return c.json(err('VALIDATION', validated), 400)

  const client = getKimiClient()
  const start = Date.now()
  try {
    const response = await client.chat.completions.create({
      model: validated.model ?? KIMI_MODEL,
      messages: validated.messages!,
      temperature: validated.temperature ?? 0.7,
      ...(validated.thinking === false ? KIMI_INSTANT_MODE : {}),
    })
    const choice = response.choices[0]
    return c.json(
      ok({
        content: choice?.message?.content ?? '',
        model: response.model,
        usage: response.usage ?? null,
        finishReason: choice?.finish_reason ?? null,
        latencyMs: Date.now() - start,
      }),
    )
  } catch (e) {
    const message = e instanceof Error ? e.message : 'kimi_chat_failed'
    console.error('[lab/llm/chat]', e)
    return c.json(err('LLM_ERROR', message), 500)
  }
})

llmRoute.post('/chat/stream', async (c) => {
  let raw: unknown
  try {
    raw = await c.req.json()
  } catch {
    return c.json(err('VALIDATION', '请求体必须是合法 JSON'), 400)
  }
  const validated = validateBody(raw)
  if (typeof validated === 'string') return c.json(err('VALIDATION', validated), 400)

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown): void => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        )
      }
      try {
        for await (const chunk of kimiStreamer.stream({
          messages: validated.messages!,
          model: validated.model ?? KIMI_MODEL,
          temperature: validated.temperature ?? 0.7,
        })) {
          if (chunk.reasoning) send('reasoning', { reasoning: chunk.reasoning })
          if (chunk.delta) send('delta', { delta: chunk.delta })
          if (chunk.done) {
            send('done', { done: true })
            break
          }
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : 'stream_failed'
        send('error', { message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
})
