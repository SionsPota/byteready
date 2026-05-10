import { serve } from '@hono/node-server'
import { WebSocketServer } from 'ws'
import { createApp } from './app.ts'
import { env } from './env.ts'
import { attachAsrWS } from './lib/volc/asr.ts'
import { importInterviewQa } from './scripts/import-interview-qa.ts'
import { isInterviewQaImported, getInterviewQaCount } from './lib/questions/search.ts'
import { getDb } from './lib/db/client.ts'
import { seedExploreIfEmpty } from './lib/explore/seed.ts'

const app = createApp()

// 启动时检查并自动导入面试大数据集
const checkAndImport = async () => {
  const db = getDb()
  if (!isInterviewQaImported(db)) {
    console.log('[startup] 面试数据集未导入，开始自动导入...')
    try {
      const result = await importInterviewQa()
      console.log(`[startup] 导入结果: ${result.imported} 条, ${(result.duration / 1000).toFixed(1)}s`)
    } catch (err) {
      console.error('[startup] 数据集导入失败:', err)
    }
  } else {
    const count = getInterviewQaCount(db)
    console.log(`[startup] 面试数据集已就绪: ${count} 条`)
  }

  // 探索模块种子数据（公司 / 标签 / 面经 / 行业趋势 / 学习项目）
  try {
    const result = seedExploreIfEmpty(db)
    if (result.seeded) {
      console.log(
        `[startup] 探索数据已 seed: ${result.counts.companies} 公司, ${result.counts.tags} 标签, ${result.counts.experiences} 面经, ${result.counts.trends} 趋势, ${result.counts.projects} 项目`,
      )
    } else {
      console.log(
        `[startup] 探索数据已就绪: ${result.counts.companies} 公司, ${result.counts.experiences} 面经, ${result.counts.trends} 趋势, ${result.counts.projects} 项目`,
      )
    }
  } catch (err) {
    console.error('[startup] 探索数据 seed 失败:', err)
  }
}

checkAndImport().then(() => {
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
})
