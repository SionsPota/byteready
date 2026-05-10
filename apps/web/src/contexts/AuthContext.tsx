import { createContext, useContext, useState, useEffect, useCallback } from 'react'

interface User {
  id: string
  email: string
  name: string | null
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<boolean>
  register: (email: string, password: string, name?: string) => Promise<boolean>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

const STORAGE_KEY = 'br_user'

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as User
    if (parsed.id && parsed.email) return parsed
  } catch {
    localStorage.removeItem(STORAGE_KEY)
  }
  return null
}

function writeStoredUser(user: User | null): void {
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(readStoredUser)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          const u: User = { id: res.data.id, email: res.data.email, name: res.data.name }
          setUser(u)
          writeStoredUser(u)
        } else {
          setUser(null)
          writeStoredUser(null)
        }
      })
      .catch(() => {
        // 网络失败时保留 localStorage 中的缓存数据，不做清除
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    })
    const json = await res.json()
    if (json.success) {
      const u: User = { id: json.data.id, email: json.data.email, name: json.data.name }
      setUser(u)
      writeStoredUser(u)
      return true
    }
    return false
  }, [])

  const register = useCallback(async (email: string, password: string, name?: string): Promise<boolean> => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, name }),
    })
    const json = await res.json()
    if (json.success) {
      const u: User = { id: json.data.id, email: json.data.email, name: json.data.name }
      setUser(u)
      writeStoredUser(u)
      return true
    }
    return false
  }, [])

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    setUser(null)
    writeStoredUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
