import { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  LogOut,
  Home,
  FileText,
  Dumbbell,
  Compass,
  ClipboardList,
  Menu,
  X,
  Sparkles,
} from 'lucide-react'

const navItems = [
  { path: '/dashboard', label: '仪表盘', icon: Home, accent: 'text-sky-400' },
  { path: '/resumes', label: '简历', icon: FileText, accent: 'text-blue-400' },
  { path: '/training', label: '模拟', icon: Dumbbell, accent: 'text-emerald-400' },
  { path: '/reviews', label: '复盘', icon: ClipboardList, accent: 'text-amber-400' },
  { path: '/explore', label: '探索', icon: Compass, accent: 'text-purple-400' },
]

export function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  if (!user) return <Outlet />

  const sidebarContent = (
    <>
      {/* Brand */}
      <div className="p-5">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-900/30">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-100">ByteReady</h1>
            <p className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">AI 面试模拟平台</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map((item) => {
          const active = location.pathname.startsWith(item.path)
          const Icon = item.icon
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative ${
                active
                  ? 'bg-slate-800/80 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              {/* Active indicator */}
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gradient-to-b from-emerald-400 to-emerald-600 rounded-r-full" />
              )}
              <Icon
                size={18}
                className={`transition-colors duration-200 ${active ? item.accent : 'text-slate-500 group-hover:text-slate-300'}`}
              />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="p-3 mx-3 mb-3 rounded-lg bg-slate-800/30 border border-slate-800/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-slate-300">
                {(user.name || user.email || '?').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm text-slate-300 truncate font-medium">{user.name || user.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-colors shrink-0"
            title="登出"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 text-slate-100 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 glass-sidebar flex-col fixed inset-y-0 left-0 z-40">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 w-64 glass-sidebar flex-col z-50 transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700">
              <Sparkles size={16} className="text-white" />
            </div>
            <h1 className="text-base font-bold text-slate-100">ByteReady</h1>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        {sidebarContent}
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 overflow-auto min-h-screen">
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-gradient-to-br from-emerald-500 to-emerald-700">
              <Sparkles size={14} className="text-white" />
            </div>
            <span className="font-semibold text-slate-100 text-sm">ByteReady</span>
          </div>
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <Menu size={20} />
          </button>
        </div>

        <div className="max-w-6xl mx-auto p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
