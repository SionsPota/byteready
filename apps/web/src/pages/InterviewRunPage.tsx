import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Send, Square, SkipForward, Mic, Volume2, VolumeX, Radio, Play } from 'lucide-react'
import { useVolcAsr } from '../hooks/useVolcAsr.ts'

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

const STATE_COLORS: Record<string, string> = {
  IDLE: 'bg-slate-800 text-slate-400 border-slate-700',
  SELF_INTRO: 'bg-sky-950/50 text-sky-400 border-sky-800/50',
  PROJECT_SINGLE_1: 'bg-purple-950/50 text-purple-400 border-purple-800/50',
  PROJECT_SINGLE_2: 'bg-purple-950/50 text-purple-400 border-purple-800/50',
  PROJECT_CROSS: 'bg-purple-950/50 text-purple-400 border-purple-800/50',
  QNA_TECH: 'bg-amber-950/50 text-amber-400 border-amber-800/50',
  QNA_ALGO: 'bg-amber-950/50 text-amber-400 border-amber-800/50',
  QNA_SCENE: 'bg-amber-950/50 text-amber-400 border-amber-800/50',
  END: 'bg-slate-800 text-slate-500 border-slate-700',
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
  // 语音偏好：上一次交互是语音输入则下次自动进入录音
  const [voicePreferred, setVoicePreferred] = useState(false)
  // 乐观更新：用户提交后立即把候选人/面试官气泡塞进列表，避免等服务器/语音回来时界面"卡住"
  const [optimisticTurns, setOptimisticTurns] = useState<Turn[]>([])
  // 流式渲染：把 audio.currentTime / audio.duration 映射成渐进显示的字符百分比
  const [streamingTurnId, setStreamingTurnId] = useState<string | null>(null)
  const [streamingProgress, setStreamingProgress] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const submitAnswerRef = useRef<(text?: string) => void>(() => {})
  const wasIdleRef = useRef(true)

  // 麦克风可用性：getUserMedia 只在 https / localhost 下可用
  const hasMic =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function'

  const asr = useVolcAsr({
    onAutoEnd: (text) => {
      // 自动结束：直接提交，跳过确认
      const trimmed = text.trim()
      if (trimmed) {
        void submitAnswerRef.current(trimmed)
      } else {
        // 没识别到内容，取消语音偏好，避免无限自动录音
        setVoicePreferred(false)
        setVoiceState('idle')
      }
    },
    onComplete: (text) => {
      // 手动停止：进入确认状态
      const trimmed = text.trim()
      if (trimmed) {
        setAnswer(trimmed)
        setVoiceState('confirming')
      } else {
        setVoiceState('idle')
      }
    },
    onError: (msg) => {
      setVoiceError(msg)
      setVoiceState('idle')
    },
  })

  const fetchSession = useCallback(async (): Promise<TrainingDetail | null> => {
    if (!id) return null
    try {
      const res = await fetch(`/api/training/${id}`, { credentials: 'include' })
      const json = await res.json()
      if (json.success) {
        setSession(json.data)
        if (json.data.status === 'running') setStarted(true)
        return json.data as TrainingDetail
      }
    } catch {
      // 静默：上层 UI 通过 session 为 null 表示"加载中"
    }
    return null
  }, [id])

  useEffect(() => {
    void fetchSession()
  }, [fetchSession])

  // 卸载时停止音频，避免离开页面后还在念
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  // 真正展示给用户的 turns = 服务器 turns + 还没被服务器确认的乐观 turns
  // 去重：当服务器存在 createdAt 不早于乐观时间且 kind+text 一致的回合时，认为已落地，丢掉乐观
  // 用 createdAt 而不是直接 kind+text，避免用户连续提交两次同样内容时第二条被错杀
  const displayedTurns = useMemo<Turn[]>(() => {
    const serverTurns = session?.turns ?? []
    const extras = optimisticTurns.filter(
      (opt) =>
        !serverTurns.some(
          (s) => s.createdAt >= opt.createdAt && s.kind === opt.kind && s.text === opt.text,
        ),
    )
    return [...serverTurns, ...extras]
  }, [session?.turns, optimisticTurns])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [displayedTurns, loading, voiceState, streamingProgress])

  // 面试官回复结束（voiceState 回到 idle）后，把光标自动落到输入框，
  // 让用户能立刻继续作答；进入页面但还没"开始面试"时不抢焦点。
  useEffect(() => {
    if (
      voiceState === 'idle' &&
      started &&
      !loading &&
      session?.status !== 'ended'
    ) {
      inputRef.current?.focus()
    }
  }, [voiceState, started, loading, session?.status])

  // TTS 提速：火山 speech_rate 单位为 1%，正数加速。15 ≈ 比标准快 15%
  const TTS_SPEECH_RATE = 15

  // 调 TTS 拿到音频后，把 audio.currentTime / audio.duration 同步到 streamingProgress，
  // 让对应 turn 的文字按音频进度渐进显示。失败时 fallback 为直接显示完整文本。
  const playTtsWithStreaming = useCallback(
    async (turnId: string, text: string): Promise<void> => {
      if (!text) return

      const finishWithFullText = () => {
        setStreamingProgress(1)
        setStreamingTurnId(null)
        setVoiceState('idle')
      }

      setStreamingTurnId(turnId)
      setStreamingProgress(0)
      setVoiceState('playing')

      try {
        const res = await fetch('/api/voice/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ text, speechRate: TTS_SPEECH_RATE }),
        })
        if (!res.ok) {
          finishWithFullText()
          return
        }
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)

        await new Promise<void>((resolve) => {
          const audio = new Audio(url)
          audioRef.current = audio

          let settled = false
          const cleanup = () => {
            if (settled) return
            settled = true
            URL.revokeObjectURL(url)
            if (audioRef.current === audio) audioRef.current = null
            finishWithFullText()
            resolve()
          }

          audio.ontimeupdate = () => {
            const dur = audio.duration
            if (dur && Number.isFinite(dur) && dur > 0) {
              const p = Math.min(1, audio.currentTime / dur)
              setStreamingProgress(p)
            }
          }
          audio.onended = cleanup
          audio.onerror = cleanup
          audio.onplay = () => {
            // 一开始至少露出一个字，避免出现空气泡
            setStreamingProgress((prev) => (prev < 0.02 ? 0.02 : prev))
          }
          void audio.play().catch(cleanup)
        })
      } catch {
        finishWithFullText()
      }
    },
    [],
  )

  const handleStart = async () => {
    if (!id) return
    const res = await fetch(`/api/training/${id}/start`, {
      method: 'POST',
      credentials: 'include',
    })
    const json = await res.json()
    if (!json.success) return
    setStarted(true)

    // 先把会话拉回来，让开场白气泡立刻出现在 UI 上
    const detail = await fetchSession()
    if (!detail || !ttsEnabled) return

    // 找到第一句"interviewer_main"开场白，念出来 + 渐进显示
    const introTurn = detail.turns.find((t) => t.kind === 'interviewer_main')
    if (introTurn?.text) {
      await playTtsWithStreaming(introTurn.id, introTurn.text)
    }
  }

  const handleAnswer = async (textOverride?: string, viaVoice = false) => {
    if (!id) return
    const text = (textOverride ?? answer).trim()
    if (!text || loading) return

    setVoicePreferred(viaVoice)

    // 1. 立即把用户回答塞进列表，输入框清空（解决"回车后界面什么都看不到"）
    const userTurnId = `optimistic-user-${Date.now()}`
    setOptimisticTurns((prev) => [
      ...prev,
      {
        id: userTurnId,
        index: Number.MAX_SAFE_INTEGER,
        kind: 'candidate',
        text,
        createdAt: Date.now(),
      },
    ])
    setAnswer('')
    setLoading(true)
    setVoiceState('processing')

    type AnswerResponse = {
      success: boolean
      data?: { reply?: string; decision?: string; state?: string }
    }
    let json: AnswerResponse | null = null
    try {
      const res = await fetch(`/api/training/${id}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text }),
      })
      json = (await res.json()) as AnswerResponse
    } catch {
      json = null
    }
    setLoading(false)

    if (!json?.success || !json.data) {
      setVoiceState('idle')
      // 失败时清掉乐观气泡，从服务器拉真实状态
      setOptimisticTurns([])
      await fetchSession()
      return
    }

    const replyText = json.data.reply ?? ''
    const decision = json.data.decision
    const state = json.data.state

    // 2. 立即把面试官气泡塞进列表（先显示对话框，再随 TTS 渐进显示文字）
    const interviewerTurnId = `optimistic-interviewer-${Date.now()}`
    setOptimisticTurns((prev) => [
      ...prev,
      {
        id: interviewerTurnId,
        index: Number.MAX_SAFE_INTEGER,
        kind: 'interviewer_main',
        text: replyText,
        state,
        createdAt: Date.now(),
      },
    ])

    // 3. 播放 TTS + 渐进显示文字（end 状态不念，跟旧行为保持一致）
    if (ttsEnabled && decision !== 'end' && replyText) {
      await playTtsWithStreaming(interviewerTurnId, replyText)
    } else {
      setVoiceState('idle')
    }

    // 4. 同步服务器 turns，再清掉乐观气泡（dedup 已经保证了不闪）
    await fetchSession()
    setOptimisticTurns([])
  }
  submitAnswerRef.current = (text) => void handleAnswer(text, true)

  const startRecording = async () => {
    if (!hasMic) {
      setVoiceError('当前环境无法访问麦克风（需要 https 或 localhost）')
      return
    }
    setVoiceError(null)
    setAnswer('')
    setVoiceState('recording')
    await asr.start()
  }

  const stopRecording = () => {
    asr.stop()
  }

  const handleEnd = async () => {
    if (!confirm('确定结束模拟？结束后将生成复盘报告。')) return
    if (!id) return
    await fetch(`/api/training/${id}/end`, {
      method: 'POST',
      credentials: 'include',
    })
    navigate(`/reviews/${id}`)
  }

  const handleSkipQuestion = async () => {
    if (!id || !session) return
    // 发送跳过指令
    await handleAnswer('（跳过当前问题，请继续下一题）')
  }

  if (!session) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-slate-700 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  )

  const isEnded = session.status === 'ended'
  const canAnswer = started && !isEnded && !loading && voiceState !== 'playing'
  const stateLabel = session.currentState ? STATE_LABELS[session.currentState] || session.currentState : ''
  const stateColorClass = session.currentState ? STATE_COLORS[session.currentState] || STATE_COLORS.IDLE : STATE_COLORS.IDLE

  // 语音偏好：上次用语音则面试官回复结束后自动开始录音
  const asrStartRef = useRef(() => Promise.resolve())
  asrStartRef.current = asr.start
  useEffect(() => {
    const wasIdle = wasIdleRef.current
    wasIdleRef.current = voiceState === 'idle'
    if (
      voiceState === 'idle' &&
      !wasIdle &&
      voicePreferred &&
      started &&
      !loading &&
      !isEnded &&
      hasMic
    ) {
      setVoiceError(null)
      setAnswer('')
      setVoiceState('recording')
      void asrStartRef.current()
    }
  }, [voiceState, voicePreferred, started, loading, isEnded, hasMic])

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] lg:h-[calc(100vh-4rem)] animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-4 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center ring-1 ring-white/5">
            <Play size={18} className="text-slate-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-100">{TYPE_LABELS[session.type] || session.type}</h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {stateLabel && (
                <span className={`px-2 py-0.5 rounded-md text-xs border ${stateColorClass}`}>
                  {stateLabel}
                </span>
              )}
              {voiceState === 'recording' && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-red-950/60 text-red-400 border border-red-900/50">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  录音中
                </span>
              )}
              {voiceState === 'playing' && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-emerald-950/60 text-emerald-400 border border-emerald-900/50">
                  <Volume2 size={10} />
                  播放中
                </span>
              )}
              {voiceState === 'processing' && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-slate-800 text-slate-400 border border-slate-700">
                  <Radio size={10} className="animate-pulse" />
                  处理中
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* TTS 开关 */}
          {started && !isEnded && (
            <button
              onClick={() => setTtsEnabled(!ttsEnabled)}
              className={`p-2 rounded-lg text-sm transition-colors ${
                ttsEnabled ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30' : 'text-slate-600 hover:text-slate-400 hover:bg-slate-800/50'
              }`}
              title={ttsEnabled ? '关闭语音播报' : '开启语音播报'}
            >
              {ttsEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          )}
          {!started && !isEnded && (
            <button
              onClick={handleStart}
              className="btn-primary"
            >
              <Mic size={16} />
              开始面试
            </button>
          )}
          {started && !isEnded && (
            <>
              <button
                onClick={handleSkipQuestion}
                disabled={loading || voiceState === 'playing'}
                className="btn-secondary text-xs"
              >
                <SkipForward size={14} />
                跳过
              </button>
              <button
                onClick={handleEnd}
                className="btn-secondary text-xs border-red-900/40 hover:border-red-800/60 hover:text-red-400 hover:bg-red-950/20"
              >
                <Square size={14} />
                结束
              </button>
            </>
          )}
        </div>
      </div>

      {/* Transcript */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-2">
        {displayedTurns.map((turn) => {
          const isCandidate = turn.kind === 'candidate'
          const isSystem = turn.kind === 'system'
          const isStreaming = turn.id === streamingTurnId
          // 流式显示：按 streamingProgress 截取文字。max(1) 保证有 TTS 在播时至少出 1 个字
          const visibleText = isStreaming
            ? turn.text.slice(0, Math.max(1, Math.ceil(turn.text.length * streamingProgress)))
            : turn.text
          return (
            <div
              key={turn.id}
              className={`flex ${isCandidate ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-xl text-sm leading-relaxed ${
                  isSystem
                    ? 'bubble-system text-xs'
                    : isCandidate
                      ? 'bubble-candidate rounded-br-md'
                      : 'bubble-interviewer rounded-bl-md'
                }`}
              >
                {!isSystem && (
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-xs font-medium ${isCandidate ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {isCandidate ? '你' : '面试官'}
                    </span>
                    {turn.state && (
                      <span className="text-[10px] text-slate-600">
                        {STATE_LABELS[turn.state] || turn.state}
                      </span>
                    )}
                  </div>
                )}
                <p className="whitespace-pre-wrap">
                  {visibleText}
                  {isStreaming && streamingProgress < 1 && (
                    <span className="inline-block w-[2px] h-4 ml-1 bg-current align-middle animate-pulse rounded-full" />
                  )}
                </p>
              </div>
            </div>
          )
        })}
        {loading && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-xl bubble-interviewer rounded-bl-md">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Voice Error */}
      {voiceError && (
        <div className="mt-3 px-4 py-2.5 rounded-lg bg-red-950/40 border border-red-900/50 text-red-400 text-sm flex items-center gap-2">
          <Radio size={14} />
          {voiceError}
        </div>
      )}

      {/* Input Area */}
      {canAnswer && (
        <div className="mt-4 pt-4 border-t border-slate-800/60">
          {voiceState === 'recording' ? (
            /* 录音中：音量条 + 静默倒计时 + 实时识别预览 */
            <div className="space-y-3 py-3">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                <span className="text-sm text-red-400 font-medium flex-shrink-0">正在聆听</span>
                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden min-w-[80px]">
                  <div
                    className="h-full rounded-full transition-all duration-150"
                    style={{
                      width: `${Math.round(asr.volume * 100)}%`,
                      backgroundColor:
                        asr.volume < 0.1 ? '#ef4444' : asr.volume < 0.3 ? '#eab308' : '#22c55e',
                    }}
                  />
                </div>
                <span className="text-[10px] text-slate-500 font-mono w-8 text-right flex-shrink-0">
                  {Math.round(asr.volume * 100)}%
                </span>
                <button onClick={stopRecording} className="btn-secondary text-sm flex-shrink-0">
                  停止
                </button>
              </div>
              {asr.countdown !== null && asr.countdown > 0 && (
                <div className="text-xs text-amber-400 animate-pulse">
                  未检测到声音，{asr.countdown} 秒后自动结束…
                </div>
              )}
              {asr.transcript && (
                <div className="px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-800 text-sm leading-relaxed">
                  <span className="text-slate-200">{asr.finalText}</span>
                  <span className="text-slate-500 italic">
                    {asr.transcript.slice(asr.finalText.length)}
                  </span>
                </div>
              )}
              {!asr.transcript && (
                <div className="text-xs text-slate-500">
                  开始说话，识别结果会实时显示在这里。静默 8 秒将自动结束。
                </div>
              )}
            </div>
          ) : voiceState === 'confirming' ? (
            /* 确认识别结果状态 */
            <div className="space-y-3">
              {asr.endReason && (
                <div className="text-xs text-amber-400 bg-amber-950/30 border border-amber-900/50 rounded px-2 py-1">
                  {asr.endReason}
                </div>
              )}
              <p className="text-xs text-slate-500">语音识别结果（可编辑确认）：</p>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={2}
                className="input-field w-full px-3 py-2.5 resize-none text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleAnswer(undefined, true)}
                  disabled={!answer.trim()}
                  className="btn-primary flex-1"
                >
                  确认提交
                </button>
                <button
                  onClick={() => { setVoicePreferred(false); setVoiceState('idle'); setAnswer('') }}
                  className="btn-secondary"
                >
                  重新录音
                </button>
              </div>
            </div>
          ) : (
            /* 正常输入状态 */
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAnswer(undefined, false)}
                placeholder="输入你的回答，或点击麦克风语音输入..."
                className="input-field flex-1 px-4 py-2.5"
              />
              {hasMic && (
                <button
                  onClick={() => void startRecording()}
                  className="p-2.5 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-emerald-400 transition-colors border border-slate-700/50"
                  title="语音输入"
                >
                  <Mic size={20} />
                </button>
              )}
              <button
                onClick={() => handleAnswer(undefined, false)}
                disabled={!answer.trim() || loading}
                className="btn-primary px-4"
              >
                <Send size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* 已结束状态 */}
      {isEnded && (
        <div className="mt-4 pt-4 border-t border-slate-800/60 flex justify-center">
          <button
            onClick={() => navigate(`/reviews/${session.id}`)}
            className="btn-primary"
          >
            查看复盘报告
          </button>
        </div>
      )}
    </div>
  )
}
