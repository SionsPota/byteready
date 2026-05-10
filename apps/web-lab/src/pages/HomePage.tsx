import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiJson, ApiError } from '../lib/api'

interface HealthData {
  ok: boolean
  service: string
  kimi: boolean
  volc: boolean
  kimiModel: string
  ttsSpeaker: string
  ttsResource: string
  asrResource: string
}

const cards: { to: string; title: string; desc: string; tag: string }[] = [
  {
    to: '/chat',
    title: 'LLM 对话',
    desc: 'Kimi K2.6 流式 / 非流式对话,支持 thinking 开关、温度调节',
    tag: 'Kimi',
  },
  {
    to: '/tts',
    title: '语音合成',
    desc: '文字转语音,豆包 Seed-TTS 2.0 多音色 / 多格式',
    tag: 'Volcengine TTS',
  },
  {
    to: '/asr',
    title: '语音识别',
    desc: '麦克风实时识别,豆包 SeedASR 流式 partial / final',
    tag: 'Volcengine ASR',
  },
]

export function HomePage() {
  const [health, setHealth] = useState<HealthData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    apiJson<HealthData>('/api/health')
      .then((data) => {
        if (!cancelled) setHealth(data)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        const msg = e instanceof ApiError ? `[${e.code}] ${e.message}` : String(e)
        setError(msg)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold mb-1">能力沙盒</h1>
        <p className="text-slate-400 text-sm">
          独立的 LLM/语音测试环境,与主服务器互不影响。共用仓库根 .env 凭证。
        </p>
      </section>

      <section className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">健康自检</div>
        {loading && <div className="text-slate-400 text-sm">检测中…</div>}
        {error && (
          <div className="text-rose-400 text-sm font-mono">无法连接 server-lab: {error}</div>
        )}
        {health && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <Indicator label="服务" value={health.ok ? '就绪' : '异常'} ok={health.ok} />
            <Indicator label="Kimi 凭证" value={health.kimi ? '已配置' : '缺失'} ok={health.kimi} />
            <Indicator label="火山凭证" value={health.volc ? '已配置' : '缺失'} ok={health.volc} />
            <Indicator label="Kimi 模型" value={health.kimiModel} mono />
            <Indicator label="TTS 音色" value={health.ttsSpeaker} mono />
            <Indicator label="TTS 资源" value={health.ttsResource} mono />
            <Indicator label="ASR 资源" value={health.asrResource} mono />
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="block bg-slate-900 border border-slate-800 hover:border-emerald-700 hover:bg-slate-800/50 rounded-lg p-5 transition group"
          >
            <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-500 mb-2">
              {c.tag}
            </div>
            <div className="text-lg font-medium mb-1 group-hover:text-emerald-300">{c.title}</div>
            <div className="text-sm text-slate-400 leading-relaxed">{c.desc}</div>
          </Link>
        ))}
      </section>
    </div>
  )
}

function Indicator({
  label,
  value,
  ok,
  mono,
}: {
  label: string
  value: string
  ok?: boolean
  mono?: boolean
}) {
  const valueColor =
    ok === undefined ? 'text-slate-200' : ok ? 'text-emerald-400' : 'text-rose-400'
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`${valueColor} ${mono ? 'font-mono text-xs' : 'text-sm'} truncate`}>
        {value}
      </div>
    </div>
  )
}
