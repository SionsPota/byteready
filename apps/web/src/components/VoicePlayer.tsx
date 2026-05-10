import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2 } from 'lucide-react'

interface VoicePlayerProps {
  audioUrl?: string
  autoPlay?: boolean
}

export function VoicePlayer({ audioUrl, autoPlay }: VoicePlayerProps) {
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (audioUrl && autoPlay) {
      const audio = new Audio(audioUrl)
      audioRef.current = audio
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
      audio.onended = () => setPlaying(false)
    }
  }, [audioUrl, autoPlay])

  const toggle = () => {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      audioRef.current.play().then(() => setPlaying(true))
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggle}
        className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
      >
        {playing ? <Pause size={12} /> : <Play size={12} />}
        {playing ? '暂停' : '播放'}
      </button>
      {playing && <Volume2 size={14} className="text-emerald-400 animate-pulse" />}
    </div>
  )
}
