import { Link, useLocation } from "react-router";
import { Button } from "@/components/ui/button";
import { FileText, TrendingUp, FolderKanban, Home, Sparkles } from "lucide-react";

export function Navbar() {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-emerald-400" />
            <Link to="/" className="text-xl font-bold text-white tracking-tight">
              Career<span className="text-emerald-400">Pulse</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-1">
            <Link to="/">
              <Button
                variant={isActive("/") ? "secondary" : "ghost"}
                size="sm"
                className={isActive("/") ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"}
              >
                <Home className="h-4 w-4 mr-2" />
                首页
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button
                variant={isActive("/dashboard") ? "secondary" : "ghost"}
                size="sm"
                className={isActive("/dashboard") ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"}
              >
                <FileText className="h-4 w-4 mr-2" />
                简历管理
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              系统就绪
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
