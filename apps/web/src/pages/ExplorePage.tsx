import { Link } from 'react-router-dom'
import { Compass, BookOpen, Map, TrendingUp, Award, Rocket } from 'lucide-react'

interface ModuleItem {
  icon: typeof Compass
  title: string
  desc: string
  status: string
  to?: string
  active?: boolean
  iconColor: string
}

const modules: ModuleItem[] = [
  { icon: BookOpen, title: '面经浏览', desc: '真实面试经历，按公司画像与标签筛选', status: '可用', to: '/explore/experiences', active: true, iconColor: 'text-purple-400' },
  { icon: TrendingUp, title: '行业趋势', desc: '前沿技术资讯，按简历推荐', status: '可用', to: '/explore/trends', active: true, iconColor: 'text-emerald-400' },
  { icon: Rocket, title: '学习项目', desc: '可复刻的项目库，丰富简历', status: '可用', to: '/explore/projects', active: true, iconColor: 'text-amber-400' },
  { icon: Award, title: '题库搜索', desc: '15万+面试题关键词搜索', status: '可用', to: '/explore/questions', active: true, iconColor: 'text-rose-400' },
  { icon: Map, title: '岗位图谱', desc: '技能树与成长路径', status: '规划中', iconColor: 'text-slate-500' },
]

export function ExplorePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">探索</h1>
      <p className="text-slate-500 mb-6">面试情报站，知己知彼，扩展认知边界</p>

      <div className="grid grid-cols-2 gap-4">
        {modules.map((m) => {
          const Icon = m.icon
          if (m.to && m.active) {
            return (
              <Link
                key={m.title}
                to={m.to}
                className="p-6 rounded-lg border border-slate-800 bg-slate-900 hover:border-slate-600 transition-colors cursor-pointer"
              >
                <Icon className={`mb-3 ${m.iconColor}`} size={24} />
                <h3 className="font-medium">{m.title}</h3>
                <p className="text-sm text-slate-500 mt-1">{m.desc}</p>
                <span className="inline-block mt-3 px-2 py-0.5 rounded text-xs bg-emerald-950 text-emerald-400">
                  {m.status}
                </span>
              </Link>
            )
          }
          return (
            <div
              key={m.title}
              className="p-6 rounded-lg border border-slate-800 bg-slate-900 opacity-60 cursor-not-allowed"
            >
              <Icon className={`mb-3 ${m.iconColor}`} size={24} />
              <h3 className="font-medium">{m.title}</h3>
              <p className="text-sm text-slate-500 mt-1">{m.desc}</p>
              <span className="inline-block mt-3 px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-400">
                {m.status}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
