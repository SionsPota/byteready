import { useCallback, useEffect, useRef, useState } from 'react'

interface AsrEvent {
  type: 'partial' | 'final' | 'error' | 'end'
  text?: string
  error?: string
}

export type VolcAsrState = 'idle' | 'recording'

export interface UseVolcAsrOptions {
  sampleRate?: number
  bufferSize?: number
  silenceThreshold?: number
  autoEndMs?: number
  language?: string
  /** 静默自动结束时触发；transcript 是当前已固化文本 */
  onAutoEnd?: (transcript: string) => void
  /** 任何方式停止后触发（手动 or 自动 or 错误），统一回传最终文本 */
  onComplete?: (transcript: string) => void
  onError?: (message: string) => void
}

export interface UseVolcAsrResult {
  state: VolcAsrState
  /** 实时文本：已 final 累积 + 当前 partial 增量 */
  transcript: string
  /** 仅已 final 的累积文本（用户停止后会和 transcript 相等） */
  finalText: string
  /** 音量 0..1 */
  volume: number
  /** 剩余静默秒数；非静默或非录音中为 null */
  countdown: number | null
  /** 自动结束的提示原因（连接报错或静默自动结束） */
  endReason: string | null
  error: string | null
  start: () => Promise<void>
  stop: () => void
}

const DEFAULT_SAMPLE_RATE = 16000
const DEFAULT_BUFFER_SIZE = 4096
const DEFAULT_AUTO_END_MS = 4000
const DEFAULT_LANGUAGE = 'zh-CN'

/**
 * 火山 SAUC 语音识别 hook：
 * - 浏览器麦克风 → AudioWorklet → 16kHz Int16 PCM → /api/voice/asr WebSocket
 * - 以「ASR 是否持续返回新文本」判断用户是否还在说话，autoEndMs 无新文本后自动结束
 * - 计时从「第一个字识别出来」开始，避免 ws 建连到首字之间的空白被误算
 * - 暴露 transcript = 已 final 累积 + 当前 partial 增量
 *
 * 注意：火山下行的 result.text 是「累积文本」，不是新增片段；final 事件直接覆盖
 * 已确认文本，partial 事件做 diff 切出增量展示。
 */
export function useVolcAsr(options: UseVolcAsrOptions = {}): UseVolcAsrResult {
  const {
    sampleRate = DEFAULT_SAMPLE_RATE,
    bufferSize = DEFAULT_BUFFER_SIZE,
    autoEndMs = DEFAULT_AUTO_END_MS,
    language = DEFAULT_LANGUAGE,
    onAutoEnd,
    onComplete,
    onError,
  } = options

  const [state, setState] = useState<VolcAsrState>('idle')
  const [finalText, setFinalText] = useState('')
  const [partialAddon, setPartialAddon] = useState('')
  const [volume, setVolume] = useState(0)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [endReason, setEndReason] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const mediaRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const workletNodeRef = useRef<AudioWorkletNode | null>(null)

  const finalAccRef = useRef('') // 已固化的完整累积文本
  const partialTextRef = useRef('') // 当前 partial 增量（与 state 同步，供 autoEnd 快照用）
  const stoppedRef = useRef(false) // 防止 stop 二次进入
  const lastTextAtRef = useRef<number | null>(null) // 上次收到 ASR 文本的时间；null = 还没出第一个字
  const autoEndTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const callbacksRef = useRef({ onAutoEnd, onComplete, onError })
  callbacksRef.current = { onAutoEnd, onComplete, onError }

  /** 内部 stop：cleanup + 通知。auto=true 表示静默触发 */
  const stopInternal = useCallback(
    (opts: { auto?: boolean; silent?: boolean; reason?: string } = {}) => {
      if (stoppedRef.current) return
      stoppedRef.current = true

      // 先快照最终文本：setState('idle') 可能触发外部重新渲染并再次 asr.start()，
      // 新录音会重置 finalAccRef，必须在可能的重渲染之前保存。
      // partial 可能没有 final 确认，所以把 partial 增量也拼进来。
      const finalNow = (finalAccRef.current + partialTextRef.current).trim()

      setState('idle')
      setCountdown(null)
      setVolume(0)

      if (autoEndTimerRef.current) {
        clearInterval(autoEndTimerRef.current)
        autoEndTimerRef.current = null
      }

      const ws = wsRef.current
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ type: 'end' }))
        } catch {
          /* noop */
        }
      }

      try {
        workletNodeRef.current?.disconnect()
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

      workletNodeRef.current = null
      sourceRef.current = null
      audioCtxRef.current = null
      mediaRef.current = null

      // 200ms 后再关 ws，给 end 帧 flush 的时间
      setTimeout(() => {
        try {
          wsRef.current?.close(
            1000,
            opts.silent ? 'unmount' : opts.auto ? 'auto_end' : 'user_stop',
          )
        } catch {
          /* noop */
        }
        wsRef.current = null
      }, 200)

      if (opts.silent) return

      const cb = callbacksRef.current
      if (opts.auto) {
        const reason = opts.reason ?? `已自动结束（${autoEndMs / 1000} 秒未检测到新文本）`
        setEndReason(reason)
        cb.onAutoEnd?.(finalNow)
      } else {
        cb.onComplete?.(finalNow)
      }
    },
    [autoEndMs],
  )

  const start = useCallback(async (): Promise<void> => {
    if (!stoppedRef.current && wsRef.current) return // 已经在跑

    stoppedRef.current = false
    setError(null)
    setEndReason(null)
    setFinalText('')
    setPartialAddon('')
    setVolume(0)
    setCountdown(null)
    finalAccRef.current = ''
    partialTextRef.current = ''
    lastTextAtRef.current = null // 等第一个字出来才开始计时

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      const friendly = `无法启动录音：${msg}`
      setError(friendly)
      callbacksRef.current.onError?.(friendly)
      return
    }

    // 用户在等待麦克风权限期间已点停止
    if (stoppedRef.current) {
      stream.getTracks().forEach((t) => t.stop())
      return
    }
    mediaRef.current = stream

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${proto}//${window.location.host}/api/voice/asr`)
    ws.binaryType = 'arraybuffer'
    wsRef.current = ws

    ws.onopen = async () => {
      // ws 建立到 onopen 之间用户也可能已点停止
      if (stoppedRef.current) {
        try {
          ws.close(1000, 'aborted')
        } catch {
          /* noop */
        }
        return
      }
      try {
        ws.send(
          JSON.stringify({
            type: 'config',
            audio: { sample_rate: sampleRate, language },
          }),
        )
      } catch {
        // 配置帧发送失败时直接放弃，让 onerror 兜底
        return
      }

      // 自动结束定时器：按「是否收到新 ASR 文本」判断用户是否还在说话
      // 首次计时从第一个字识别出来才开始
      autoEndTimerRef.current = setInterval(() => {
        if (stoppedRef.current) return
        const lastAt = lastTextAtRef.current
        if (lastAt === null) return // 还没出第一个字，不检查
        const elapsed = Date.now() - lastAt
        const remaining = Math.max(0, Math.ceil((autoEndMs - elapsed) / 1000))
        // 只剩不到一半时间再提示，避免一直干扰
        setCountdown(elapsed > autoEndMs / 2 ? remaining : null)

        if (elapsed >= autoEndMs) {
          if (autoEndTimerRef.current) {
            clearInterval(autoEndTimerRef.current)
            autoEndTimerRef.current = null
          }
          setCountdown(null)
          stopInternal({ auto: true })
        }
      }, 200)

      const WORKLET_CODE = `
class PcmProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super()
    this.bufferSize = options.processorOptions?.bufferSize ?? 4096
    this.buffer = new Float32Array(this.bufferSize)
    this.offset = 0
    this.sumSquares = 0
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0]
    if (!input || input.length === 0) return true

    const channelData = input[0]

    for (let i = 0; i < channelData.length && this.offset < this.bufferSize; i++) {
      const v = channelData[i]
      this.buffer[this.offset] = v
      this.sumSquares += v * v
      this.offset++
    }

    if (this.offset >= this.bufferSize) {
      const pcm = new Int16Array(this.bufferSize)
      for (let i = 0; i < this.bufferSize; i++) {
        const v = this.buffer[i]
        const clamped = v < -1 ? -1 : v > 1 ? 1 : v
        pcm[i] = Math.round(clamped * 0x7fff)
      }

      const rms = Math.sqrt(this.sumSquares / this.bufferSize)

      this.port.postMessage(
        { type: 'audio', pcm: pcm.buffer, rms },
        [pcm.buffer]
      )

      this.offset = 0
      this.sumSquares = 0
    }

    return true
  }
}
registerProcessor('pcm-processor', PcmProcessor)
`

      const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' })
      const workletUrl = URL.createObjectURL(blob)

      const ctx = new AudioContext({ sampleRate })
      audioCtxRef.current = ctx
      try {
        await ctx.audioWorklet.addModule(workletUrl)
      } catch (err) {
        URL.revokeObjectURL(workletUrl)
        const msg = err instanceof Error ? err.message : String(err)
        const friendly = `AudioWorklet 加载失败：${msg}`
        setError(friendly)
        callbacksRef.current.onError?.(friendly)
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      URL.revokeObjectURL(workletUrl)
      if (stoppedRef.current) {
        try {
          void ctx.close()
        } catch {
          /* noop */
        }
        return
      }

      const source = ctx.createMediaStreamSource(stream)
      sourceRef.current = source
      const workletNode = new AudioWorkletNode(ctx, 'pcm-processor', {
        processorOptions: { bufferSize },
      })
      workletNodeRef.current = workletNode

      workletNode.port.onmessage = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return
        if (e.data.type === 'audio') {
          const pcm = new Int16Array(e.data.pcm)
          ws.send(pcm.buffer)
          setVolume(Math.min(e.data.rms * 15, 1))
        }
      }

      source.connect(workletNode)
      workletNode.connect(ctx.destination)
      setState('recording')
    }

    ws.onmessage = (ev) => {
      if (typeof ev.data !== 'string') return
      let payload: AsrEvent
      try {
        payload = JSON.parse(ev.data) as AsrEvent
      } catch {
        return
      }
      if (payload.type === 'partial' && typeof payload.text === 'string') {
        lastTextAtRef.current = Date.now()
        setCountdown(null)
        // partial 是上行端的累积文本，先切掉已固化部分作为「正在写入」的增量
        const acc = finalAccRef.current
        const tail = payload.text.startsWith(acc)
          ? payload.text.slice(acc.length)
          : payload.text
        setPartialAddon(tail)
        partialTextRef.current = tail
      } else if (payload.type === 'final' && typeof payload.text === 'string') {
        lastTextAtRef.current = Date.now()
        setCountdown(null)
        // final 是到目前为止的完整已确认文本，直接覆盖避免 ASR 修正导致重复累加
        if (payload.text !== finalAccRef.current) {
          finalAccRef.current = payload.text
          setFinalText(payload.text)
        }
        setPartialAddon('')
        partialTextRef.current = ''
      } else if (payload.type === 'error') {
        const msg = payload.error ?? 'upstream_error'
        setError(msg)
        callbacksRef.current.onError?.(msg)
        stopInternal({ reason: `识别出错：${msg}` })
      } else if (payload.type === 'end') {
        // 上行 end 不算静默自动结束，按手动停止处理
        stopInternal({})
      }
    }

    ws.onerror = () => {
      const msg = 'WebSocket 连接错误'
      setError(msg)
      callbacksRef.current.onError?.(msg)
      stopInternal({ reason: msg })
    }

    ws.onclose = () => {
      // onclose 可能在 stopInternal 之前触发（服务端主动关），兜底一次
      if (!stoppedRef.current) stopInternal({})
    }
  }, [sampleRate, bufferSize, autoEndMs, language, stopInternal])

  const stop = useCallback(() => {
    stopInternal({})
  }, [stopInternal])

  // 卸载时静默清理（不触发 onComplete/onAutoEnd）
  useEffect(() => {
    return () => {
      if (!stoppedRef.current) {
        stopInternal({ silent: true })
      }
    }
  }, [stopInternal])

  return {
    state,
    transcript: finalText + partialAddon,
    finalText,
    volume,
    countdown,
    endReason,
    error,
    start,
    stop,
  }
}
