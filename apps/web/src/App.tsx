import { useEffect, useState } from 'react'
import type { ApiResponse } from '@byteready/shared'

interface HealthData {
  status: string
  uptime: number
  timestamp: string
}

export function App() {
  const [health, setHealth] = useState<HealthData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/health')
      .then((r) => r.json() as Promise<ApiResponse<HealthData>>)
      .then((res) => {
        if (cancelled) return
        if (res.success) setHealth(res.data)
        else setError(res.error.message)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Unknown error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <h1 className="text-4xl font-bold mb-2">ByteReady</h1>
        <p className="text-slate-400 mb-8">TypeScript 全栈骨架 · Vite + React + Hono</p>

        <section className="rounded-lg border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold mb-3">服务端健康检查</h2>
          {error && <p className="text-red-400">错误：{error}</p>}
          {!error && !health && <p className="text-slate-500">加载中...</p>}
          {health && (
            <pre className="text-sm text-emerald-300 overflow-auto">
              {JSON.stringify(health, null, 2)}
            </pre>
          )}
        </section>
      </div>
    </main>
  )
}
