import { Link, useLocation } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  FileText,
  Building2,
  Tag,
  LogIn,
  LogOut,
  Sparkles,
  Bug,
} from "lucide-react";

const navItems = [
  { path: "/", label: "主控台", icon: LayoutDashboard },
  { path: "/interviews", label: "我的面经", icon: FileText },
  { path: "/crawler", label: "爬虫", icon: Bug },
  { path: "/companies", label: "公司", icon: Building2 },
  { path: "/tags", label: "标签", icon: Tag },
];

export default function Nav() {
  const location = useLocation();
  const { user, logout, isLoading } = useAuth();

  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-5xl">
      <div className="glass rounded-full px-4 sm:px-6 py-2.5 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg aurora-gradient flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-semibold tracking-tight hidden sm:block">
            面经捕手
          </span>
        </Link>

        {/* Nav Items */}
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                  isActive
                    ? "text-white"
                    : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/5"
                }`}
              >
                {isActive && (
                  <span className="absolute inset-0 rounded-full aurora-gradient opacity-20" />
                )}
                <Icon className="w-3.5 h-3.5 relative z-10" />
                <span className="relative z-10 hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Auth */}
        <div className="flex items-center gap-2 shrink-0">
          {!isLoading && (
            <>
              {user ? (
                <button
                  onClick={logout}
                  className="flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
                >
                  <img
                    src={user.avatar || "/avatar-default.png"}
                    alt={user.name || "User"}
                    className="w-6 h-6 rounded-full border border-white/10"
                  />
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-[#F8FAFC] transition-colors px-3 py-1.5 rounded-full hover:bg-white/5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">登录</span>
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
