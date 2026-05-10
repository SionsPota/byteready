import { serve } from '@hono/node-server'
import { WebSocketServer } from 'ws'
import { createApp } from './app.ts'
import { env } from './env.ts'
import { attachAsrWS } from './lib/volc/asr.ts'

const app = createApp()

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`[server] running at http://localhost:${info.port}`)
})

// ASR WebSocket
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const wssAsr = new WebSocketServer({ server: server as any, path: '/api/voice/asr' })
wssAsr.on('connection', (client) => {
  attachAsrWS(client)
})

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `\n[server] 端口 ${env.PORT} 已被占用。请先释放：\n` +
        `  Windows: netstat -ano | findstr :${env.PORT} && taskkill /PID <pid> /F\n` +
        `  Linux/Mac: lsof -ti:${env.PORT} | xargs kill\n` +
        `或在仓库根 .env 里改 SERVER_PORT 后重启 pnpm dev。\n`,
    )
    process.exit(1)
  }
  console.error('[server] listen error:', error)
  process.exit(1)
})
