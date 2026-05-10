import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Send, Square, SkipForward, Mic, Volume2, VolumeX, Radio } from 'lucide-react'

// SpeechRecognition API 类型声明（浏览器内置）
interface SpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  onstart: (() => void) | null
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

interface Turn {
  id: string
  index: number
  kind: string
  text: string
  phase?: string
  state?: string
  createdAt: number
}

interface TrainingDetail {
  id: string
  type: string
  position: string
  targetCompany?: string
  jobDescription?: string
  personaId?: string
  status: string
  currentState?: string
  turns: Turn[]
}

type VoiceState = 'idle' | 'recording' | 'confirming' | 'processing' | 'playing'

const STATE_LABELS: Record<string, string> = {
  IDLE: '准备中',
  SELF_INTRO: '自我介绍',
  PROJECT_SINGLE_1: '项目深挖 1',
  PROJECT_SINGLE_2: '项目深挖 2',
  PROJECT_CROSS: '项目交叉',
  QNA_TECH: '技术问答',
  QNA_ALGO: '算法',
  QNA_SCENE: '场景设计',
  END: '已结束',
}

const TYPE_LABELS: Record<string, string> = {
  full: '整面',
  self_intro: '自我介绍',
  project_qa: '项目问答',
  random_qa: '随机问答',
}

export function InterviewRunPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState<TrainingDetail | null>(null)
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [started, setStarted] = useState(false)
  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const [ttsEnabled, setTtsEnabled] = useState(true)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // 检查浏览器是否支持语音识别
  const hasSpeechRecognition = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window

  const fetchSession = useCallback(() => {
    if (!id) return
    fetch(`/api/training/${id}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setSession(res.data)
          if (res.data.status === 'running') setStarted(true)
        }
      })
  }, [id])

  useEffect(() => {
    fetchSession()
  }, [fetchSession])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [session?.turns, loading, voiceState])

  const handleStart = async () => {
    if (!id) return
    const res = await fetch(`/api/training/${id}/start`, {
      method: 'POST',
      credentials: 'include',
    })
    const json = await res.json()
    if (json.success) {
      setStarted(true)
      fetchSession()
    }
  }

  const handleAnswer = async (textOverride?: string) => {
    if (!id) return
    const text = (textOverride ?? answer).trim()
    if (!text || loading) return

    setLoading(true)
    setVoiceState('processing')
    const res = await fetch(`/api/training/${id}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ text }),
    })
    const json = await res.json()
    setLoading(false)
    setAnswer('')

    if (json.success) {
      // 如果 TTS 开启且不是结束状态，播放面试官回复
      if (ttsEnabled && json.data.decision !== 'end' && json.data.reply) {
        await playTts(json.data.reply)
      }
      fetchSession()
      if (json.data.decision === 'end') {
        setVoiceState('idle')
      } else {
        setVoiceState('idle')
      }
    } else {
      setVoiceState('idle')
    }
  }

  const playTts = async (text: string): Promise<void> => {
    try {
      setVoiceState('playing')
      const res = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text }),
      })
      if (!res.ok) {
        setVoiceState('idle')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)

      return new Promise((resolve) => {
        const audio = new Audio(url)
        audioRef.current = audio
        audio.onended = () => {
          URL.revokeObjectURL(url)
          setVoiceState('idle')
          resolve()
        }
        audio.onerror = () => {
          URL.revokeObjectURL(url)
          setVoiceState('idle')
          resolve()
        }
        audio.play()
      })
    } catch {
      setVoiceState('idle')
    }
  }

  const startRecording = () => {
    if (!hasSpeechRecognition) {
      setVoiceError('当前浏览器不支持语音识别，请使用文本输入')
      return
    }
    setVoiceError(null)

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognitionAPI()
    recognition.lang = 'zh-CN'
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onstart = () => {
      setVoiceState('recording')
      setAnswer('')
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = ''
      let interimTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results.item(i)
        if (!result || result.length === 0) continue
        const item = result.item(0)
        if (!item) continue
        const transcript = item.transcript
        if (result.isFinal) {
          finalTranscript += transcript
        } else {
          interimTranscript += transcript
        }
      }
      if (finalTranscript) {
        setAnswer((prev) => prev + finalTranscript)
      } else if (interimTranscript) {
        setAnswer((prev) => {
          // 替换之前的 interim 结果
          const base = prev.replace(/…$/, '')
          return base + interimTranscript + '…'
        })
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== 'aborted') {
        setVoiceError(`语音识别错误: ${event.error}`)
      }
      setVoiceState('idle')
    }

    recognition.onend = () => {
      setVoiceState('confirming')
      // 清理末尾的省略号
      setAnswer((prev) => prev.replace(/…$/, '').trim())
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  const stopRecording = () => {
    recognitionRef.current?.stop()
  }

  const handleEnd = async () => {
    if (!confirm('确定结束训练？结束后将生成复盘报告。')) return
    if (!id) return
    await fetch(`/api/training/${id}/end`, {
      method: 'POST',
      credentials: 'include',
    })
    navigate('/training')
  }

  const handleSkipQuestion = async () => {
    if (!id || !session) return
    // 发送跳过指令
    await handleAnswer('（跳过当前问题，请继续下一题）')
  }

  if (!session) return <p className="text-slate-500">加载中...</p>

  const isEnded = session.status === 'ended'
  const canAnswer = started && !isEnded && !loading && voiceState !== 'playing'
  const stateLabel = session.currentState ? STATE_LABELS[session.currentState] || session.currentState : ''

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{session.position}</h1>
            <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-400">
              {TYPE_LABELS[session.type] || session.type}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-slate-500">
              {isEnded ? '已结束' : started ? '进行中' : '待开始'}
            </p>
            {stateLabel && (
              <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-400">
                {stateLabel}
              </span>
            )}
            {voiceState === 'recording' && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-red-950 text-red-400 animate-pulse">
                <Radio size={10} />
                录音中
              </span>
            )}
            {voiceState === 'playing' && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-emerald-950 text-emerald-400">
                <Volume2 size={10} />
                播放中
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* TTS 开关 */}
          {started && !isEnded && (
            <button
              onClick={() => setTtsEnabled(!ttsEnabled)}
              className={`p-2 rounded-md text-sm transition-colors ${
                ttsEnabled ? 'text-emerald-400 hover:text-emerald-300' : 'text-slate-600 hover:text-slate-400'
              }`}
              title={ttsEnabled ? '关闭语音播报' : '开启语音播报'}
            >
              {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          )}
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
                onClick={handleSkipQuestion}
                disabled={loading || voiceState === 'playing'}
                className="flex items-center gap-1 px-3 py-2 rounded-md border border-slate-700 text-slate-400 text-sm hover:text-slate-200 disabled:opacity-50"
              >
                <SkipForward size={14} />
                跳过
              </button>
              <button
                onClick={handleEnd}
                className="flex items-center gap-1 px-3 py-2 rounded-md border border-slate-700 text-slate-400 text-sm hover:text-slate-200"
              >
                <Square size={14} />
                结束
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
                    {turn.state && (
                      <span className="ml-1 text-slate-600">· {STATE_LABELS[turn.state] || turn.state}</span>
                    )}
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

      {/* Voice Error */}
      {voiceError && (
        <div className="mt-2 px-3 py-2 rounded-md bg-red-950/50 border border-red-900 text-red-400 text-sm">
          {voiceError}
        </div>
      )}

      {/* Input Area */}
      {canAnswer && (
        <div className="mt-4 pt-4 border-t border-slate-800">
          {voiceState === 'recording' ? (
            /* 录音中状态 */
            <div className="flex items-center justify-center gap-3 py-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-950 border border-red-800 animate-pulse">
                <Radio size={16} className="text-red-400" />
                <span className="text-sm text-red-400">正在聆听...</span>
              </div>
              <button
                onClick={stopRecording}
                className="px-4 py-2 rounded-md bg-slate-800 text-slate-300 text-sm hover:bg-slate-700"
              >
                停止录音
              </button>
            </div>
          ) : voiceState === 'confirming' ? (
            /* 确认识别结果状态 */
            <div className="space-y-2">
              <div className="text-xs text-slate-500 mb-1">语音识别结果（可编辑确认）：</div>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-slate-600 resize-none text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleAnswer()}
                  disabled={!answer.trim()}
                  className="flex-1 px-4 py-2 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                >
                  确认提交
                </button>
                <button
                  onClick={() => { setVoiceState('idle'); setAnswer('') }}
                  className="px-4 py-2 rounded-md bg-slate-800 text-slate-300 text-sm hover:bg-slate-700"
                >
                  重新录音
                </button>
              </div>
            </div>
          ) : (
            /* 正常输入状态 */
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAnswer()}
                  placeholder="输入你的回答，或点击麦克风语音输入..."
                  className="flex-1 px-3 py-2 rounded-md bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-slate-600"
                />
                {hasSpeechRecognition && (
                  <button
                    onClick={startRecording}
                    className="px-3 py-2 rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-emerald-400 transition-colors"
                    title="语音输入"
                  >
                    <Mic size={18} />
                  </button>
                )}
                <button
                  onClick={() => handleAnswer()}
                  disabled={!answer.trim() || loading}
                  className="px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 已结束状态 */}
      {isEnded && (
        <div className="mt-4 pt-4 border-t border-slate-800 flex justify-center">
          <button
            onClick={() => navigate(`/reviews/${session.id}`)}
            className="px-6 py-2 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-500"
          >
            查看复盘报告
          </button>
        </div>
      )}
    </div>
  )
}
