import { useRef, useState } from 'react'
import { apiJson, ApiError } from '../lib/api'

type Role = 'system' | 'user' | 'assistant'

interface ChatMessage {
  role: Role
  content: string
  reasoning?: string
}

interface ChatResult {
  content: string
  model: string
  usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null
  finishReason: string | null
  latencyMs: number
}

const DEFAULT_SYSTEM = '你是一个简洁、准确的 AI 助手。'

export function ChatPage() {
  const [system, setSystem] = useState(DEFAULT_SYSTEM)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [temperature, setTemperature] = useState(0.7)
  const [thinking, setThinking] = useState(false)
  const [streaming, setStreaming] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [meta, setMeta] = useState<ChatResult | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const buildPayload = (history: ChatMessage[]) => ({
    messages: [
      ...(system.trim() ? [{ role: 'system' as const, content: system }] : []),
      ...history.map((m) => ({ role: m.role, content: m.content })),
    ],
    temperature,
    thinking,
  })

  const send = async () => {
    const text = input.trim()
    if (!text || running) return
    setError(null)
    setMeta(null)
    const userMsg: ChatMessage = { role: 'user', content: text }
    const baseHistory = [...messages, userMsg]
    setMessages(baseHistory)
    setInput('')
    setRunning(true)

    if (streaming) {
      await runStream(baseHistory)
    } else {
      await runOnce(baseHistory)
    }
    setRunning(false)
  }

  const runOnce = async (history: ChatMessage[]) => {
    try {
      const result = await apiJson<ChatResult>('/api/llm/chat', {
        method: 'POST',
        body: JSON.stringify(buildPayload(history)),
      })
      setMessages([...history, { role: 'assistant', content: result.content }])
      setMeta(result)
    } catch (e) {
      const msg = e instanceof ApiError ? `[${e.code}] ${e.message}` : String(e)
      setError(msg)
    }
  }

  const runStream = async (history: ChatMessage[]) => {
    const controller = new AbortController()
    abortRef.current = controller
    const startedAt = Date.now()

    try {
      const res = await fetch('/api/llm/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(history)),
        signal: controller.signal,
      })
      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => '')
        throw new Error(`HTTP ${res.status}: ${text || 'no body'}`)
      }

      // 占位的 assistant 消息,后续 chunk 累加
      const assistantIndex = history.length
      let assistantContent = ''
      let assistantReasoning = ''
      setMessages([...history, { role: 'assistant', content: '', reasoning: '' }])

      const reader = res.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''
      let done = false

      while (!done) {
        const { value, done: streamDone } = await reader.read()
        if (streamDone) break
        buffer += decoder.decode(value, { stream: true })

        // 按 SSE 双 \n\n 切块
        let sepIndex
        while ((sepIndex = buffer.indexOf('\n\n')) !== -1) {
          const rawEvent = buffer.slice(0, sepIndex)
          buffer = buffer.slice(sepIndex + 2)
          const parsed = parseSSE(rawEvent)
          if (!parsed) continue
          if (parsed.event === 'delta' && parsed.data.delta) {
            assistantContent += parsed.data.delta
          } else if (parsed.event === 'reasoning' && parsed.data.reasoning) {
            assistantReasoning += parsed.data.reasoning
          } else if (parsed.event === 'error') {
            throw new Error(parsed.data.message ?? 'stream_error')
          } else if (parsed.event === 'done') {
            done = true
          }
          setMessages((prev) => {
            const next = prev.slice()
            next[assistantIndex] = {
              role: 'assistant',
              content: assistantContent,
              reasoning: assistantReasoning,
            }
            return next
          })
        }
      }
      setMeta({
        content: assistantContent,
        model: '(stream)',
        usage: null,
        finishReason: 'stop',
        latencyMs: Date.now() - startedAt,
      })
    } catch (e) {
      if (controller.signal.aborted) {
        setError('已中止')
      } else {
        const msg = e instanceof Error ? e.message : String(e)
        setError(msg)
      }
    } finally {
      abortRef.current = null
    }
  }

  const stop = () => {
    abortRef.current?.abort()
  }

  const clear = () => {
    setMessages([])
    setMeta(null)
    setError(null)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      <section className="space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {messages.length === 0 && (
            <div className="text-slate-500 text-sm py-12 text-center">
              在下方输入框开始对话。
            </div>
          )}
          {messages.map((m, i) => (
            <MessageBubble key={i} msg={m} />
          ))}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                void send()
              }
            }}
            disabled={running}
            placeholder="输入消息(Cmd/Ctrl + Enter 发送)…"
            rows={3}
            className="w-full bg-transparent resize-y outline-none text-sm placeholder:text-slate-600"
          />
          <div className="flex items-center justify-between pt-2 border-t border-slate-800 mt-2">
            <div className="text-xs text-slate-500">
              {running ? '生成中…' : `${messages.length} 条对话`}
            </div>
            <div className="flex gap-2">
              {running ? (
                <button
                  onClick={stop}
                  className="px-3 py-1.5 text-sm rounded bg-rose-700 hover:bg-rose-600"
                >
                  停止
                </button>
              ) : (
                <>
                  <button
                    onClick={clear}
                    disabled={messages.length === 0}
                    className="px-3 py-1.5 text-sm rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50"
                  >
                    清空
                  </button>
                  <button
                    onClick={() => void send()}
                    disabled={!input.trim()}
                    className="px-3 py-1.5 text-sm rounded bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50"
                  >
                    发送
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-rose-950/40 border border-rose-800 rounded-lg p-3 text-sm text-rose-300 font-mono">
            {error}
          </div>
        )}
      </section>

      <aside className="space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4">
          <h3 className="text-sm font-medium text-slate-300">参数</h3>

          <label className="block text-xs space-y-1">
            <div className="text-slate-400">System Prompt</div>
            <textarea
              value={system}
              onChange={(e) => setSystem(e.target.value)}
              rows={3}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs"
            />
          </label>

          <label className="block text-xs space-y-1">
            <div className="text-slate-400 flex justify-between">
              <span>Temperature</span>
              <span className="font-mono">{temperature.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              className="w-full"
            />
          </label>

          <Toggle
            label="深度思考(thinking)"
            hint="关闭后 K2.6 32s → 5s,质量略降"
            checked={thinking}
            onChange={setThinking}
          />

          <Toggle
            label="流式输出"
            hint="关闭走 /chat,返回 usage / finishReason"
            checked={streaming}
            onChange={setStreaming}
          />
        </div>

        {meta && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-1 text-xs font-mono text-slate-400">
            <div>model: <span className="text-slate-200">{meta.model}</span></div>
            <div>finish: <span className="text-slate-200">{meta.finishReason ?? '-'}</span></div>
            <div>latency: <span className="text-slate-200">{meta.latencyMs} ms</span></div>
            {meta.usage && (
              <div>
                tokens:{' '}
                <span className="text-slate-200">
                  in {meta.usage.prompt_tokens ?? '?'} + out {meta.usage.completion_tokens ?? '?'}{' '}
                  = {meta.usage.total_tokens ?? '?'}
                </span>
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  )
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const [showReasoning, setShowReasoning] = useState(false)
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
          isUser
            ? 'bg-emerald-700/30 border border-emerald-700/50'
            : 'bg-slate-800 border border-slate-700'
        }`}
      >
        <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{msg.role}</div>
        {msg.reasoning && (
          <div className="mb-2">
            <button
              onClick={() => setShowReasoning((v) => !v)}
              className="text-xs text-amber-400 hover:text-amber-300"
            >
              {showReasoning ? '▼' : '▶'} reasoning ({msg.reasoning.length} chars)
            </button>
            {showReasoning && (
              <div className="mt-1 text-xs text-amber-200/70 bg-slate-950 rounded p-2 whitespace-pre-wrap font-mono leading-relaxed">
                {msg.reasoning}
              </div>
            )}
          </div>
        )}
        <div>{msg.content || (msg.role === 'assistant' ? '⋯' : '')}</div>
      </div>
    </div>
  )
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer text-xs">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5"
      />
      <div>
        <div className="text-slate-300">{label}</div>
        {hint && <div className="text-slate-500">{hint}</div>}
      </div>
    </label>
  )
}

interface SSEEvent {
  event: string
  data: { delta?: string; reasoning?: string; message?: string; done?: boolean }
}

const parseSSE = (raw: string): SSEEvent | null => {
  const lines = raw.split('\n')
  let event = 'message'
  let dataStr = ''
  for (const line of lines) {
    if (line.startsWith('event:')) event = line.slice(6).trim()
    else if (line.startsWith('data:')) dataStr += line.slice(5).trim()
  }
  if (!dataStr) return null
  try {
    return { event, data: JSON.parse(dataStr) as SSEEvent['data'] }
  } catch {
    return null
  }
}
