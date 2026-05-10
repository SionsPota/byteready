import { useEffect, useState } from 'react'

type Format = 'mp3' | 'ogg_opus' | 'pcm'

type SpeakerOption = { value: string; label: string }

const DEFAULT_SPEAKERS: SpeakerOption[] = [
  { value: '', label: '使用环境默认(env)' },
  { value: 'zh_female_xiaohe_uranus_bigtts', label: '小荷(女, env 默认)' },
  { value: 'zh_male_yunzhouxixi_uranus_bigtts', label: '云舟熙熙(男)' },
]

const SAMPLE_RATES = [16000, 24000, 32000, 48000]

const DEFAULT_TEXT = '你好,我是 ByteReady Lab 的语音合成测试。今天天气真不错。'

export function TtsPage() {
  const [text, setText] = useState(DEFAULT_TEXT)
  const [speaker, setSpeaker] = useState('')
  const [customSpeaker, setCustomSpeaker] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [format, setFormat] = useState<Format>('mp3')
  const [sampleRate, setSampleRate] = useState(24000)
  const [speechRate, setSpeechRate] = useState(0)
  const [loudnessRate, setLoudnessRate] = useState(0)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [meta, setMeta] = useState<{ size: number; latencyMs: number } | null>(null)

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  const resolveSpeaker = (): string | undefined => {
    if (useCustom) {
      const v = customSpeaker.trim()
      return v || undefined
    }
    return speaker || undefined
  }

  const synthesize = async () => {
    if (!text.trim() || running) return
    setRunning(true)
    setError(null)
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(null)
    setMeta(null)

    const startedAt = Date.now()
    try {
      const payload: Record<string, unknown> = {
        text,
        format,
        sampleRate,
        speechRate,
        loudnessRate,
      }
      const spk = resolveSpeaker()
      if (spk) payload.speaker = spk

      const res = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        const msg =
          body?.error?.message ?? `HTTP ${res.status}: ${res.statusText}`
        throw new Error(msg)
      }

      const buf = await res.arrayBuffer()
      const mime = format === 'mp3' ? 'audio/mpeg' : format === 'ogg_opus' ? 'audio/ogg' : 'audio/L16'
      const blob = new Blob([buf], { type: mime })
      const url = URL.createObjectURL(blob)
      setAudioUrl(url)
      setMeta({ size: buf.byteLength, latencyMs: Date.now() - startedAt })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRunning(false)
    }
  }

  const downloadName = `tts-${Date.now()}.${format === 'ogg_opus' ? 'ogg' : format === 'pcm' ? 'pcm' : 'mp3'}`

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      <section className="space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
          <label className="block text-sm">
            <div className="text-slate-400 text-xs mb-1">合成文本(最多 1000 字)</div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              maxLength={1000}
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
            <div className="text-right text-xs text-slate-500 mt-1">{text.length} / 1000</div>
          </label>
          <div className="flex justify-end">
            <button
              onClick={() => void synthesize()}
              disabled={running || !text.trim()}
              className="px-4 py-1.5 text-sm rounded bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50"
            >
              {running ? '合成中…' : '合成语音'}
            </button>
          </div>
        </div>

        {audioUrl && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">合成结果</h3>
              <a
                href={audioUrl}
                download={downloadName}
                className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600"
              >
                下载
              </a>
            </div>
            <audio src={audioUrl} controls className="w-full" />
            {meta && (
              <div className="text-xs text-slate-500 font-mono">
                size: {(meta.size / 1024).toFixed(1)} KB · latency: {meta.latencyMs} ms
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="bg-rose-950/40 border border-rose-800 rounded-lg p-3 text-sm text-rose-300 font-mono">
            {error}
          </div>
        )}
      </section>

      <aside className="space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium text-slate-300">参数</h3>

          <Field label="音色">
            {!useCustom ? (
              <select
                value={speaker}
                onChange={(e) => setSpeaker(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs"
              >
                {DEFAULT_SPEAKERS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={customSpeaker}
                onChange={(e) => setCustomSpeaker(e.target.value)}
                placeholder="输入音色 ID,如 zh_female_xiaohe_uranus_bigtts"
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs"
              />
            )}
            <label className="flex items-center gap-2 text-[11px] text-slate-500 cursor-pointer mt-1">
              <input
                type="checkbox"
                checked={useCustom}
                onChange={(e) => setUseCustom(e.target.checked)}
              />
              自定义音色
            </label>
            <div className="text-[11px] text-slate-600 mt-1">
              seed-tts-2.0 请使用 uranus 系列音色。moon 系列音色会报 55000000。
            </div>
          </Field>

          <Field label="格式">
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as Format)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs"
            >
              <option value="mp3">mp3</option>
              <option value="ogg_opus">ogg_opus</option>
              <option value="pcm">pcm(原始)</option>
            </select>
          </Field>

          <Field label="采样率(Hz)">
            <select
              value={sampleRate}
              onChange={(e) => setSampleRate(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs"
            >
              {SAMPLE_RATES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>

          <Field label={`语速(${speechRate >= 0 ? '+' : ''}${speechRate})`}>
            <input
              type="range"
              min={-50}
              max={50}
              step={5}
              value={speechRate}
              onChange={(e) => setSpeechRate(Number(e.target.value))}
              className="w-full"
            />
          </Field>

          <Field label={`音量(${loudnessRate >= 0 ? '+' : ''}${loudnessRate})`}>
            <input
              type="range"
              min={-50}
              max={50}
              step={5}
              value={loudnessRate}
              onChange={(e) => setLoudnessRate(Number(e.target.value))}
              className="w-full"
            />
          </Field>
        </div>
      </aside>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs space-y-1">
      <div className="text-slate-400">{label}</div>
      {children}
    </label>
  )
}
