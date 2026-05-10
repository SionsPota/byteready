import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function LoginPage() {
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const ok = isRegister
        ? await register(email, password, name || undefined)
        : await login(email, password)
      if (ok) {
        navigate('/dashboard')
      } else {
        setError(isRegister ? '注册失败，邮箱可能已存在' : '邮箱或密码错误')
      }
    } catch {
      setError('网络错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">ByteReady</h1>
          <p className="text-slate-400">AI 面试模拟平台</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-sm text-slate-400 mb-1">姓名</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-slate-600"
                placeholder="可选"
              />
            </div>
          )}
          <div>
            <label className="block text-sm text-slate-400 mb-1">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-slate-600"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-slate-600"
              required
              minLength={6}
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-md bg-slate-100 text-slate-950 font-medium hover:bg-slate-200 disabled:opacity-50 transition-colors"
          >
            {loading ? '请稍候...' : isRegister ? '注册' : '登录'}
          </button>
        </form>

        {!isRegister && (
          <div className="mt-6 pt-6 border-t border-slate-800">
            <p className="text-center text-xs text-slate-500 mb-3">快速体验 Demo 账号</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setEmail('demo-frontend@byteready.com'); setPassword('demo123'); }}
                className="px-3 py-2 rounded-md border border-slate-700 text-xs text-slate-300 hover:border-emerald-500 hover:text-emerald-400 transition-colors"
              >
                前端工程师
              </button>
              <button
                onClick={() => { setEmail('demo-ai-agent@byteready.com'); setPassword('demo123'); }}
                className="px-3 py-2 rounded-md border border-slate-700 text-xs text-slate-300 hover:border-emerald-500 hover:text-emerald-400 transition-colors"
              >
                AI Agent工程师
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-sm text-slate-500 mt-6">
          {isRegister ? '已有账号？' : '还没有账号？'}
          <button
            onClick={() => { setIsRegister(!isRegister); setError('') }}
            className="text-slate-300 hover:text-slate-100 ml-1"
          >
            {isRegister ? '去登录' : '去注册'}
          </button>
        </p>
      </div>
    </div>
  )
}
