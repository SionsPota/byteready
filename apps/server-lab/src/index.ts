import { serve } from '@hono/node-server'
import { WebSocketServer } from 'ws'
import { createLabApp } from './app.ts'
import { labEnv } from './env.ts'
import { attachAsrWS } from '../../server/src/lib/volc/asr.ts'

const app = createLabApp()

const server = serve({ fetch: app.fetch, port: labEnv.PORT }, (info) => {
  console.log(`[server-lab] running at http://localhost:${info.port}`)
  console.log(`[server-lab]   GET  /api/health`)
  console.log(`[server-lab]   POST /api/llm/chat`)
  console.log(`[server-lab]   POST /api/llm/chat/stream  (SSE)`)
  console.log(`[server-lab]   POST /api/voice/tts`)
  console.log(`[server-lab]   WS   /api/voice/asr`)
})

// ASR WebSocket -- 复用主 server 的 attachAsrWS,协议完全一致
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const wssAsr = new WebSocketServer({ server: server as any, path: '/api/voice/asr' })
wssAsr.on('connection', (client) => {
  attachAsrWS(client)
})

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `\n[server-lab] 端口 ${labEnv.PORT} 已被占用。请先释放:\n` +
        `  Windows: netstat -ano | findstr :${labEnv.PORT} && taskkill /PID <pid> /F\n` +
        `  Linux/Mac: lsof -ti:${labEnv.PORT} | xargs kill\n` +
        `或在仓库根 .env 里改 LAB_SERVER_PORT 后重启。\n`,
    )
    process.exit(1)
  }
  console.error('[server-lab] listen error:', error)
  process.exit(1)
})
