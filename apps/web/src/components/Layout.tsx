import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LogOut, Home, FileText, Dumbbell, TrendingUp, Compass, FolderGit2, ClipboardList } from 'lucide-react'

const navItems = [
  { path: '/dashboard', label: '仪表盘', icon: Home },
  { path: '/resumes', label: '简历', icon: FileText },
  { path: '/projects', label: '项目', icon: FolderGit2 },
  { path: '/training', label: '训练', icon: Dumbbell },
  { path: '/reviews', label: '复盘', icon: ClipboardList },
  { path: '/trends', label: '趋势', icon: TrendingUp },
  { path: '/explore', label: '探索', icon: Compass },
]

export function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()

  if (!user) return <Outlet />

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-tight">ByteReady</h1>
          <p className="text-xs text-slate-500 mt-1">AI 面试训练平台 V2</p>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const active = location.pathname.startsWith(item.path)
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  active ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-400 truncate max-w-[140px]">
              {user.name || user.email}
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-md text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title="登出"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
