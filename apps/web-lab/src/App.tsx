import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { ChatPage } from './pages/ChatPage'
import { TtsPage } from './pages/TtsPage'
import { AsrPage } from './pages/AsrPage'

const navItems: { to: string; label: string }[] = [
  { to: '/', label: '首页' },
  { to: '/chat', label: 'LLM 对话' },
  { to: '/tts', label: '语音合成 TTS' },
  { to: '/asr', label: '语音识别 ASR' },
]

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-6">
          <div className="text-sm font-mono">
            <span className="text-emerald-400">ByteReady</span>
            <span className="text-slate-500"> / </span>
            <span className="text-slate-300">Lab</span>
          </div>
          <nav className="flex gap-1 text-sm">
            {navItems.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.to === '/'}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded transition ${
                    isActive
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`
                }
              >
                {it.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto text-xs text-slate-500 font-mono">
            sandbox · 5174 ↔ 8788
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-6">{children}</main>
    </div>
  )
}

export function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/tts" element={<TtsPage />} />
        <Route path="/asr" element={<AsrPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
