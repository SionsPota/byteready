import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="text-center py-16">
      <h1 className="text-4xl font-bold mb-2 text-slate-300">404</h1>
      <p className="text-slate-500 mb-6">页面不存在或已被移动</p>
      <Link
        to="/dashboard"
        className="inline-block px-4 py-2 rounded-md bg-purple-600 text-white text-sm hover:bg-purple-500"
      >
        返回仪表盘
      </Link>
    </div>
  )
}
