import { setTimeout as delay } from 'node:timers/promises'
import { getKimiClient, KIMI_MODEL } from '../src/lib/llm/kimi.ts'
import { generateImage } from '../src/lib/siliconflow/image.ts'
import { embedTexts } from '../src/lib/siliconflow/embedding.ts'
import { rerankDocs } from '../src/lib/siliconflow/rerank.ts'
import { synthesize } from '../src/lib/volc/tts.ts'
import { WebSocket } from 'ws'
import {
  packMessage,
  unpackMessage,
  MSG_FULL_CLIENT,
  MSG_ERROR,
  FLAG_SEQ,
  COMPRESS_GZIP,
  SERIALIZE_JSON,
} from '../src/lib/volc/binary.ts'
import { env } from '../src/env.ts'
import { randomUUID } from 'node:crypto'

interface Result {
  name: string
  ok: boolean
  ms: number
  detail: string
}

const withTimeout = async <T>(p: Promise<T>, ms: number, label: string): Promise<T> => {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    return await Promise.race([
      p,
      new Promise<T>((_, reject) => {
        ctrl.signal.addEventListener('abort', () => reject(new Error(`${label} timeout after ${ms}ms`)))
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

const time = async (name: string, fn: () => Promise<string>): Promise<Result> => {
  const start = Date.now()
  try {
    const detail = await fn()
    return { name, ok: true, ms: Date.now() - start, detail }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return { name, ok: false, ms: Date.now() - start, detail }
  }
}

const checkKimi = (): Promise<Result> =>
  time('Kimi LLM', async () => {
    const c = getKimiClient()
    const r = await withTimeout(
      c.chat.completions.create({
        model: KIMI_MODEL,
        messages: [{ role: 'user', content: '用一个字回答：hi' }],
        stream: false,
      }) as Promise<{ choices: Array<{ message: { content: string | null } }> }>,
      30000,
      'Kimi',
    )
    const content = r.choices[0]?.message?.content?.trim() ?? ''
    if (!content) throw new Error('empty content')
    return `model=${KIMI_MODEL} → "${content.slice(0, 30)}"`
  })

const checkImage = (): Promise<Result> =>
  time('SF Image', async () => {
    const r = await withTimeout(
      generateImage({ prompt: '一只橘色的猫坐在阳台上', size: '512x512', steps: 4 }),
      45000,
      'image',
    )
    if (!r.url.startsWith('http')) throw new Error('no url')
    return `${r.size} ${r.url.slice(0, 60)}...`
  })

const checkEmbedding = (): Promise<Result> =>
  time('SF Embedding', async () => {
    const r = await withTimeout(embedTexts(['你好世界', '谢谢']), 20000, 'embed')
    if (r.vectors.length !== 2) throw new Error(`expected 2 vectors, got ${r.vectors.length}`)
    if (r.dim < 100) throw new Error(`suspiciously small dim ${r.dim}`)
    return `dim=${r.dim} model=${r.model} tokens=${r.usage.total_tokens}`
  })

const checkRerank = (): Promise<Result> =>
  time('SF Rerank', async () => {
    const docs = [
      'TypeScript 是 JavaScript 的超集，加了静态类型',
      '今天天气真好，适合出门散步',
      '建议从基础类型开始学习 TypeScript',
      '北京大学计算机学院',
    ]
    const r = await withTimeout(rerankDocs('如何学习 TypeScript', docs, { topN: 2 }), 20000, 'rerank')
    if (r.results.length === 0) throw new Error('no results')
    const top = r.results[0]
    if (!top) throw new Error('top result missing')
    return `top=${top.score.toFixed(3)} "${top.text.slice(0, 30)}"`
  })

const checkTts = (): Promise<Result> =>
  time('Volc TTS', async () => {
    const r = await withTimeout(synthesize('你好世界，欢迎使用 ByteReady'), 30000, 'tts')
    if (r.audio.length < 1000) throw new Error(`suspiciously small audio ${r.audio.length} bytes`)
    return `${r.audio.length}B ${r.format} ${r.sampleRate}Hz`
  })

const checkAsr = (): Promise<Result> =>
  time('Volc ASR', async () => {
    if (!env.VOLCENGINE_API_KEY) throw new Error('VOLCENGINE_API_KEY not configured')
    const ws = new WebSocket('wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_async', {
      headers: {
        'X-Api-Key': env.VOLCENGINE_API_KEY,
        'X-Api-Resource-Id': env.VOLCENGINE_ASR_RESOURCE_ID,
        'X-Api-Request-Id': randomUUID(),
        'X-Api-Sequence': '-1',
      },
    })
    let resolveDone: (s: string) => void
    let rejectDone: (e: Error) => void
    const done = new Promise<string>((res, rej) => {
      resolveDone = res
      rejectDone = rej
    })
    const timer = setTimeout(() => rejectDone(new Error('ASR open timeout 15s')), 15000)
    ws.on('open', () => {
      const config = {
        user: { uid: 'verify' },
        audio: {
          format: 'pcm',
          codec: 'raw',
          rate: env.VOLCENGINE_ASR_SAMPLE_RATE,
          bits: 16,
          channel: 1,
          language: env.VOLCENGINE_ASR_LANGUAGE,
        },
        request: {
          model_name: 'bigmodel',
          enable_itn: true,
          enable_punc: true,
        },
      }
      ws.send(
        packMessage({
          msgType: MSG_FULL_CLIENT,
          flags: FLAG_SEQ,
          sequence: 1,
          serialize: SERIALIZE_JSON,
          compress: COMPRESS_GZIP,
          payload: Buffer.from(JSON.stringify(config), 'utf-8'),
        }),
      )
    })
    ws.on('message', (data) => {
      try {
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer)
        const frame = unpackMessage(buf)
        if (frame.msgType === MSG_ERROR || frame.error) {
          rejectDone(new Error(`upstream error ${frame.error?.code}: ${frame.error?.message}`))
          return
        }
        // 任意非错误帧返回 = 协议层 + 鉴权通过
        clearTimeout(timer)
        resolveDone(`upstream ack msgType=0b${frame.msgType.toString(2).padStart(4, '0')}`)
      } catch (err) {
        rejectDone(err instanceof Error ? err : new Error(String(err)))
      }
    })
    ws.on('error', (err) => rejectDone(err instanceof Error ? err : new Error(String(err))))
    ws.on('close', (code, reason) => {
      // 没收到任何 message 就关 = 鉴权失败或不配
      clearTimeout(timer)
      if (resolveDone) {
        rejectDone(new Error(`closed early ${code} ${reason.toString()}`))
      }
    })
    try {
      const detail = await done
      ws.close()
      return detail
    } catch (e) {
      try { ws.close() } catch { /* noop */ }
      throw e
    }
  })

const main = async (): Promise<void> => {
  console.log('开始验证 LLM 基建能力（真调外部 API）...\n')

  const results = await Promise.all([
    checkKimi(),
    checkImage(),
    checkEmbedding(),
    checkRerank(),
    checkTts(),
    checkAsr(),
  ])

  console.log('═'.repeat(80))
  for (const r of results) {
    const icon = r.ok ? '✓' : '✗'
    const ms = String(r.ms).padStart(6) + 'ms'
    console.log(`${icon}  ${r.name.padEnd(15)} ${ms}  ${r.detail}`)
  }
  console.log('═'.repeat(80))

  const failed = results.filter((r) => !r.ok)
  if (failed.length > 0) {
    console.log(`\n${failed.length}/${results.length} 失败`)
    process.exit(1)
  } else {
    console.log(`\n${results.length}/${results.length} 全部通过`)
  }

  await delay(100)
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
