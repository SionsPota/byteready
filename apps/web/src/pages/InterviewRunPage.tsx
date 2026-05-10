import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Send, Square, SkipForward, Mic } from 'lucide-react'

interface Turn {
  id: string
  index: number
  kind: string
  text: string
  createdAt: number
}

interface InterviewDetail {
  id: string
  position: string
  level: string
  status: string
  turns: Turn[]
}

export function InterviewRunPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState<InterviewDetail | null>(null)
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [started, setStarted] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const fetchSession = () => {
    fetch(`/api/interviews/${id}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setSession(res.data)
      })
  }

  useEffect(() => {
    fetchSession()
  }, [id])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [session?.turns])

  const handleStart = async () => {
    const res = await fetch(`/api/interviews/${id}/start`, {
      method: 'POST',
      credentials: 'include',
    })
    const json = await res.json()
    if (json.success) {
      setStarted(true)
      fetchSession()
    }
  }

  const handleAnswer = async () => {
    if (!answer.trim() || loading) return
    setLoading(true)
    const res = await fetch(`/api/interviews/${id}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ text: answer.trim() }),
    })
    const json = await res.json()
    setLoading(false)
    setAnswer('')
    if (json.success) {
      fetchSession()
    }
  }

  const handleEnd = async () => {
    if (!confirm('确定结束面试？结束后将生成复盘报告。')) return
    await fetch(`/api/interviews/${id}/end`, {
      method: 'POST',
      credentials: 'include',
    })
    navigate('/dashboard')
  }

  if (!session) return <p className="text-slate-500">加载中...</p>

  const isEnded = session.status === 'ended'
  const canAnswer = started && !isEnded && !loading

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold">
            {session.position} · {session.level}
          </h1>
          <p className="text-sm text-slate-500">
            {isEnded ? '已结束' : started ? '进行中' : '待开始'}
          </p>
        </div>
        <div className="flex gap-2">
          {!started && !isEnded && (
            <button
              onClick={handleStart}
              className="flex items-center gap-1 px-4 py-2 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-500"
            >
              <Mic size={14} />
              开始面试
            </button>
          )}
          {started && !isEnded && (
            <>
              <button
                onClick={handleEnd}
                className="flex items-center gap-1 px-3 py-2 rounded-md border border-slate-700 text-slate-400 text-sm hover:text-slate-200"
              >
                <Square size={14} />
                结束
              </button>
              <button className="flex items-center gap-1 px-3 py-2 rounded-md border border-slate-700 text-slate-400 text-sm hover:text-slate-200">
                <SkipForward size={14} />
                下一题
              </button>
            </>
          )}
        </div>
      </div>

      {/* Transcript */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-2">
        {session.turns.map((turn) => {
          const isCandidate = turn.kind === 'candidate'
          const isSystem = turn.kind === 'system'
          return (
            <div
              key={turn.id}
              className={`flex ${isCandidate ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-lg text-sm ${
                  isSystem
                    ? 'bg-slate-900 border border-slate-800 text-slate-400 text-xs'
                    : isCandidate
                      ? 'bg-emerald-950 text-emerald-100'
                      : 'bg-slate-800 text-slate-100'
                }`}
              >
                {!isSystem && (
                  <p className="text-xs text-slate-500 mb-1">
                    {isCandidate ? '你' : '面试官'}
                  </p>
                )}
                <p className="whitespace-pre-wrap">{turn.text}</p>
              </div>
            </div>
          )
        })}
        {loading && (
          <div className="flex justify-start">
            <div className="px-4 py-2.5 rounded-lg bg-slate-800 text-sm text-slate-400">
              面试官思考中...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      {canAnswer && (
        <div className="mt-4 pt-4 border-t border-slate-800">
          <div className="flex gap-2">
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAnswer()}
              placeholder="输入你的回答..."
              className="flex-1 px-3 py-2 rounded-md bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-slate-600"
            />
            <button
              onClick={handleAnswer}
              disabled={!answer.trim() || loading}
              className="px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
