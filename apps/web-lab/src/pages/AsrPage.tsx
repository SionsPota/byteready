import { useEffect, useRef, useState } from 'react'

interface AsrEvent {
  type: 'partial' | 'final' | 'error' | 'end'
  text?: string
  error?: string
}

interface Segment {
  id: number
  text: string
  final: boolean
}

const SAMPLE_RATE = 16000
const BUFFER_SIZE = 4096
const SILENCE_THRESHOLD = 0.008 // RMS ~ -42 dB
const AUTO_END_MS = 8000 // 持续静默 8s 自动结束
const VOLUME_UPDATE_EVERY = 4 // 每 4 帧（约 1s）更新一次音量 state，减少重渲染

export function AsrPage() {
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [segments, setSegments] = useState<Segment[]>([])
  const [partialText, setPartialText] = useState('')
  const [stats, setStats] = useState<{ frames: number; bytes: number }>({ frames: 0, bytes: 0 })
  const [volume, setVolume] = useState(0)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [autoEndReason, setAutoEndReason] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const mediaRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const segIdRef = useRef(0)
  const silenceStartRef = useRef<number | null>(null)
  const frameCountRef = useRef(0)

  useEffect(() => {
    return () => {
      stop(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const start = async () => {
    if (running) return
    setError(null)
    setAutoEndReason(null)
    setSegments([])
    setPartialText('')
    setStats({ frames: 0, bytes: 0 })
    setVolume(0)
    setCountdown(null)
    silenceStartRef.current = null
    frameCountRef.current = 0

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })
      mediaRef.current = stream

      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const ws = new WebSocket(`${proto}//${window.location.host}/api/voice/asr`)
      ws.binaryType = 'arraybuffer'
      wsRef.current = ws

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: 'config',
            audio: { sample_rate: SAMPLE_RATE, language: 'zh-CN' },
          }),
        )

        const ctx = new AudioContext({ sampleRate: SAMPLE_RATE })
        audioCtxRef.current = ctx
        const source = ctx.createMediaStreamSource(stream)
        sourceRef.current = source
        const processor = ctx.createScriptProcessor(BUFFER_SIZE, 1, 1)
        processorRef.current = processor

        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return
          const input = e.inputBuffer.getChannelData(0)

          // 计算 RMS 音量
          let sum = 0
          for (let i = 0; i < input.length; i++) {
            const v = input[i] ?? 0
            sum += v * v
          }
          const rms = Math.sqrt(sum / input.length)

          // 降低音量 state 更新频率
          frameCountRef.current++
          if (frameCountRef.current % VOLUME_UPDATE_EVERY === 0) {
            setVolume(Math.min(rms * 15, 1))
          }

          // 静默检测
          if (rms < SILENCE_THRESHOLD) {
            if (silenceStartRef.current === null) {
              silenceStartRef.current = Date.now()
            }
            const elapsed = Date.now() - silenceStartRef.current
            const remaining = Math.max(0, Math.ceil((AUTO_END_MS - elapsed) / 1000))
            setCountdown(remaining)

            if (elapsed >= AUTO_END_MS) {
              setCountdown(null)
              setAutoEndReason(`已自动结束（静默 ${AUTO_END_MS / 1000} 秒未说话）`)
              stop(false, true)
              return
            }
          } else {
            if (silenceStartRef.current !== null) {
              silenceStartRef.current = null
              setCountdown(null)
            }
          }

          // 发送 PCM
          const pcm = new Int16Array(input.length)
          for (let i = 0; i < input.length; i++) {
            const v = input[i] ?? 0
            const clamped = v < -1 ? -1 : v > 1 ? 1 : v
            pcm[i] = Math.round(clamped * 0x7fff)
          }
          ws.send(pcm.buffer)
          setStats((s) => ({ frames: s.frames + 1, bytes: s.bytes + pcm.byteLength }))
        }

        source.connect(processor)
        processor.connect(ctx.destination)
        setRunning(true)
      }

      ws.onmessage = (ev) => {
        if (typeof ev.data !== 'string') return
        let payload: AsrEvent
        try {
          payload = JSON.parse(ev.data) as AsrEvent
        } catch {
          return
        }
        if (payload.type === 'partial' && payload.text) {
          setPartialText(payload.text)
        } else if (payload.type === 'final' && payload.text) {
          setSegments((prev) => {
            const allPrev = prev.map((s) => s.text).join('')
            const newText = payload.text!.startsWith(allPrev)
              ? payload.text!.slice(allPrev.length).trimStart()
              : payload.text!
            if (newText) {
              return [...prev, { id: segIdRef.current++, text: newText, final: true }]
            }
            return prev
          })
          setPartialText('')
        } else if (payload.type === 'error') {
          setError(payload.error ?? 'upstream_error')
          stop()
        } else if (payload.type === 'end') {
          stop()
        }
      }

      ws.onerror = () => {
        setError('WebSocket 连接错误')
        stop()
      }

      ws.onclose = () => {
        if (running) setRunning(false)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(`无法启动录音: ${msg}`)
      stop()
    }
  }

  const stop = (silent = false, auto = false) => {
    setRunning(false)
    setCountdown(null)
    setVolume(0)
    silenceStartRef.current = null

    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ type: 'end' }))
      } catch {
        /* noop */
      }
    }

    try {
      processorRef.current?.disconnect()
    } catch {
      /* noop */
    }
    try {
      sourceRef.current?.disconnect()
    } catch {
      /* noop */
    }
    try {
      void audioCtxRef.current?.close()
    } catch {
      /* noop */
    }
    mediaRef.current?.getTracks().forEach((t) => t.stop())

    processorRef.current = null
    sourceRef.current = null
    audioCtxRef.current = null
    mediaRef.current = null

    setTimeout(() => {
      try {
        wsRef.current?.close(1000, silent ? 'unmount' : auto ? 'auto_end' : 'user_stop')
      } catch {
        /* noop */
      }
      wsRef.current = null
    }, 200)
  }

  const allFinalText = segments.map((s) => s.text).join('')

  const pendingText =
    allFinalText && partialText.startsWith(allFinalText)
      ? partialText.slice(allFinalText.length).trimStart()
      : partialText

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      <section className="space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 min-h-[40vh]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">识别结果</h3>
            <div className="flex items-center gap-2">
              {running && (
                <span className="flex items-center gap-1.5 text-xs text-rose-400">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  录音中
                </span>
              )}
              {!running ? (
                <button
                  onClick={() => void start()}
                  className="px-3 py-1.5 text-sm rounded bg-emerald-700 hover:bg-emerald-600"
                >
                  开始
                </button>
              ) : (
                <button
                  onClick={() => stop()}
                  className="px-3 py-1.5 text-sm rounded bg-rose-700 hover:bg-rose-600"
                >
                  停止
                </button>
              )}
            </div>
          </div>

          {/* 音量条 + 静默倒计时 */}
          {running && (
            <div className="mb-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-150"
                    style={{
                      width: `${Math.round(volume * 100)}%`,
                      backgroundColor:
                        volume < 0.1 ? '#ef4444' : volume < 0.3 ? '#eab308' : '#22c55e',
                    }}
                  />
                </div>
                <span className="text-[10px] text-slate-500 font-mono w-8 text-right">
                  {Math.round(volume * 100)}%
                </span>
              </div>
              {countdown !== null && countdown > 0 && (
                <div className="text-xs text-amber-400 animate-pulse">
                  未检测到声音，{countdown} 秒后自动结束…
                </div>
              )}
              {countdown === 0 && (
                <div className="text-xs text-rose-400">正在结束…</div>
              )}
            </div>
          )}

          {autoEndReason && (
            <div className="mb-3 text-xs text-amber-400 bg-amber-950/30 border border-amber-900/50 rounded px-2 py-1">
              {autoEndReason}
            </div>
          )}

          {segments.length === 0 && !pendingText && !running && (
            <div className="text-slate-500 text-sm py-12 text-center">
              点击"开始"，允许麦克风权限，开始说话。
              <br />
              <span className="text-xs text-slate-600">
                静默 {AUTO_END_MS / 1000} 秒将自动结束并返回结果
              </span>
            </div>
          )}

          <div className="space-y-2 text-sm leading-relaxed">
            {segments.map((s) => (
              <div key={s.id} className="text-slate-200">
                {s.text}
              </div>
            ))}
            {pendingText && (
              <div className="text-slate-400 italic">
                <span className="text-amber-400">▶ </span>
                {pendingText}
              </div>
            )}
          </div>
        </div>

        {allFinalText && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">完整文本</h3>
              <button
                onClick={() => void navigator.clipboard.writeText(allFinalText)}
                className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600"
              >
                复制
              </button>
            </div>
            <div className="text-sm text-slate-200 whitespace-pre-wrap">{allFinalText}</div>
          </div>
        )}

        {error && (
          <div className="bg-rose-950/40 border border-rose-800 rounded-lg p-3 text-sm text-rose-300 font-mono">
            {error}
          </div>
        )}
      </section>

      <aside className="space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-2">
          <h3 className="text-sm font-medium text-slate-300">协议参数</h3>
          <Row label="采样率" value={`${SAMPLE_RATE} Hz`} />
          <Row label="通道" value="单声道" />
          <Row label="编码" value="Int16 PCM" />
          <Row label="语言" value="zh-CN" />
          <Row label="静默阈值" value={`${SILENCE_THRESHOLD} (RMS)`} />
          <Row label="自动结束" value={`${AUTO_END_MS / 1000}s 静默`} />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-2 text-xs font-mono">
          <h3 className="text-sm font-medium text-slate-300 font-sans">实时统计</h3>
          <Row label="已发送帧" value={String(stats.frames)} />
          <Row label="已发送字节" value={`${(stats.bytes / 1024).toFixed(1)} KB`} />
          <Row label="终态分段" value={String(segments.length)} />
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-3 text-[11px] text-slate-500 leading-relaxed">
          浏览器先发 <code className="text-slate-400">{'{"type":"config"}'}</code>，
          再持续发送二进制 PCM 帧。
          <br />
          实时检测音量：低于阈值持续 {AUTO_END_MS / 1000}s 自动发{' '}
          <code className="text-slate-400">{'{"type":"end"}'}</code> 结束识别。
        </div>
      </aside>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-200">{value}</span>
    </div>
  )
}
