import { serve } from '@hono/node-server'
import { createApp } from './app.ts'
import { env } from './env.ts'

const app = createApp()

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`[server] running at http://localhost:${info.port}`)
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
