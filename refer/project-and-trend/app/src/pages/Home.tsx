import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import {
  Sparkles,
  TrendingUp,
  FolderKanban,
  Zap,
  Brain,
  Search,
  ArrowRight,
  FileText,
  Target,
  Rocket,
} from "lucide-react";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-slate-950 to-slate-950" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-24">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-950/50 border border-emerald-800/50 text-emerald-300 text-sm mb-8">
              <Sparkles className="h-4 w-4" />
              AI 驱动的职业发展引擎
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              让简历{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                开口说话
              </span>
            </h1>
            <p className="text-xl text-slate-400 mb-10 leading-relaxed">
              基于你的技术栈与职业经历，智能推荐前沿技术趋势与可复刻项目，
              助力你在互联网职场持续进化。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => navigate("/dashboard")}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 text-base h-12"
              >
                <FileText className="h-5 w-5 mr-2" />
                上传简历，开始分析
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">双引擎驱动职业成长</h2>
            <p className="text-slate-400 text-lg">
              算法快速实现 + Agent 智能分析，双重保障推荐质量
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Tech Trends Card */}
            <div className="group relative rounded-2xl border border-slate-800 bg-slate-900/50 p-8 hover:border-emerald-800/50 transition-all duration-300">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-emerald-950/50 border border-emerald-800/30 flex items-center justify-center mb-6">
                  <TrendingUp className="h-6 w-6 text-emerald-400" />
                </div>
                <h3 className="text-xl font-semibold mb-3">技术趋势推荐</h3>
                <p className="text-slate-400 mb-6 leading-relaxed">
                  根据你的技术栈，自动匹配最前沿的技术趋势和行业动态。
                  覆盖前端、后端、AI/ML、数据工程等全领域。
                </p>
                <div className="flex gap-3">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Zap className="h-4 w-4 text-amber-400" />
                    算法快速推荐
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Brain className="h-4 w-4 text-purple-400" />
                    Agent 深度分析
                  </div>
                </div>
              </div>
            </div>

            {/* Project Recommendation Card */}
            <div className="group relative rounded-2xl border border-slate-800 bg-slate-900/50 p-8 hover:border-cyan-800/50 transition-all duration-300">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-cyan-950/50 border border-cyan-800/30 flex items-center justify-center mb-6">
                  <FolderKanban className="h-6 w-6 text-cyan-400" />
                </div>
                <h3 className="text-xl font-semibold mb-3">项目推荐</h3>
                <p className="text-slate-400 mb-6 leading-relaxed">
                  识别你的技能缺口，推荐从Quick Win到Deep Dive的多层次项目。
                  每个项目附带完整的技术方案和简历描述模板。
                </p>
                <div className="flex gap-3">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Target className="h-4 w-4 text-emerald-400" />
                    精准技能缺口分析
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Rocket className="h-4 w-4 text-orange-400" />
                    快速可复刻
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative py-24 border-t border-slate-800/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">三步开启智能推荐</h2>
            <p className="text-slate-400 text-lg">
              简洁高效的流程，让技术成长路径清晰可见
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "上传简历",
                desc: "粘贴简历文本或填写技能标签，系统智能解析技术栈与目标岗位。",
                icon: FileText,
              },
              {
                step: "02",
                title: "智能分析",
                desc: "算法引擎 + Agent 双重分析，生成技术趋势报告和项目推荐清单。",
                icon: Search,
              },
              {
                step: "03",
                title: "开始学习",
                desc: "根据推荐结果制定学习计划，复刻项目丰富简历，把握行业前沿。",
                icon: Rocket,
              },
            ].map((item) => (
              <div key={item.step} className="relative text-center">
                <div className="text-6xl font-bold text-slate-800 mb-4">{item.step}</div>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-800 border border-slate-700 mb-4">
                  <item.icon className="h-5 w-5 text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center text-slate-500 text-sm">
          CareerPulse - 简历驱动的信息与项目推荐系统
        </div>
      </footer>
    </div>
  );
}
