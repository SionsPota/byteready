import { useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import {
  FileText,
  Building2,
  Tag,
  Eye,
  TrendingUp,
  Clock,
  ArrowRight,
  Search,
  Zap,
} from "lucide-react";
import Layout from "@/components/Layout";

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof FileText;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="glass rounded-xl p-4 hover:border-white/15 transition-all duration-300 group">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div>
          <p className="text-xs text-[#94A3B8] font-medium">{label}</p>
          <p className="text-xl font-bold mt-0.5">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: stats } = trpc.interview.stats.useQuery();
  const { data: companies } = trpc.company.list.useQuery();
  const { data: allTags } = trpc.tag.list.useQuery();
  const { data: recentInterviews } = trpc.interview.list.useQuery({
    limit: 6,
    offset: 0,
  });

  const resultColors: Record<string, string> = {
    passed: "#22C55E",
    failed: "#EF4444",
    pending: "#EAB308",
    ghosted: "#6B7280",
  };

  const resultLabels: Record<string, string> = {
    passed: "通过",
    failed: "未通过",
    pending: "等待中",
    ghosted: "无回应",
  };

  return (
    <Layout>
      {/* Hero Section */}
      <div className="mt-8 mb-10 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
          <span className="aurora-text">面经捕手</span>
        </h1>
        <p className="text-sm text-[#94A3B8] max-w-lg mx-auto leading-relaxed">
          自动收集、智能分类、深度管理你的面试经历，让每一次面试都成为成长的阶梯
        </p>
      </div>

      {/* Quick Capture */}
      <div className="max-w-2xl mx-auto mb-12">
        <div className="glass rounded-2xl p-1.5 flex items-center gap-2 group focus-within:border-purple-500/30 transition-all duration-300">
          <Search className="w-4 h-4 text-[#94A3B8] ml-3 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchQuery.trim()) {
                window.location.href = `/interviews?search=${encodeURIComponent(searchQuery)}`;
              }
            }}
            placeholder="搜索面经标题、内容、公司或岗位..."
            className="flex-1 bg-transparent text-sm text-[#F8FAFC] placeholder:text-[#475569] outline-none py-2.5"
          />
          <Link
            to={searchQuery.trim() ? `/interviews?search=${encodeURIComponent(searchQuery)}` : "/interviews"}
            className="aurora-gradient text-white text-xs font-medium px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity shrink-0 flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5" />
            搜索
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard
          icon={FileText}
          label="面经总数"
          value={stats?.total || 0}
          color="#A855F7"
        />
        <StatCard
          icon={Building2}
          label="覆盖公司"
          value={companies?.length || 0}
          color="#6366F1"
        />
        <StatCard
          icon={Tag}
          label="标签数量"
          value={allTags?.length || 0}
          color="#EC4899"
        />
        <StatCard
          icon={Eye}
          label="总浏览量"
          value={stats?.totalViews?.toLocaleString() || 0}
          color="#06B6D4"
        />
      </div>

      {/* Result Distribution */}
      {stats?.byResult && (
        <div className="glass rounded-xl p-5 mb-10">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-[#A855F7]" />
            <h2 className="text-sm font-semibold">面试结果分布</h2>
          </div>
          <div className="flex gap-4 flex-wrap">
            {Object.entries(stats.byResult).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: resultColors[key] || "#94A3B8" }}
                />
                <span className="text-xs text-[#94A3B8]">
                  {resultLabels[key] || key}
                </span>
                <span className="text-xs font-semibold">{value}</span>
              </div>
            ))}
            {stats.avgDifficulty && (
              <div className="flex items-center gap-2 ml-auto">
                <Clock className="w-3.5 h-3.5 text-[#EAB308]" />
                <span className="text-xs text-[#94A3B8]">平均难度</span>
                <span className="text-xs font-semibold">
                  {"★".repeat(Math.round(stats.avgDifficulty))}
                  {"☆".repeat(5 - Math.round(stats.avgDifficulty))}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Tags */}
      {allTags && allTags.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-4 h-4 text-[#A855F7]" />
            <h2 className="text-sm font-semibold">热门标签</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {allTags.slice(0, 20).map((tag) => (
              <Link
                key={tag.id}
                to={`/interviews?tagId=${tag.id}`}
                className="font-mono-tag text-xs px-3 py-1.5 rounded-full border border-white/8 hover:border-white/20 transition-all duration-200 hover:scale-105"
                style={{
                  backgroundColor: `${tag.color || "#A855F7"}10`,
                  color: tag.color || "#A855F7",
                  borderColor: `${tag.color || "#A855F7"}20`,
                }}
              >
                {tag.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Interviews */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#A855F7]" />
            <h2 className="text-sm font-semibold">最新面经</h2>
          </div>
          <Link
            to="/interviews"
            className="text-xs text-[#94A3B8] hover:text-[#A855F7] transition-colors flex items-center gap-1"
          >
            查看全部
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid gap-3">
          {recentInterviews?.map((interview) => (
            <Link
              key={interview.id}
              to={`/interviews/${interview.id}`}
              className="glass rounded-xl p-4 hover:border-white/15 transition-all duration-300 group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="font-mono-tag text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{
                        backgroundColor: `${interview.companyColor || "#6366F1"}15`,
                        color: interview.companyColor || "#6366F1",
                      }}
                    >
                      {interview.companyName}
                    </span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${resultColors[interview.result || "pending"]}15`,
                        color: resultColors[interview.result || "pending"],
                      }}
                    >
                      {resultLabels[interview.result || "pending"]}
                    </span>
                    {interview.difficulty && (
                      <span className="text-[10px] text-[#EAB308]">
                        {"★".repeat(interview.difficulty)}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-medium text-[#F8FAFC] group-hover:text-[#A855F7] transition-colors truncate">
                    {interview.title}
                  </h3>
                  {interview.position && (
                    <p className="text-xs text-[#94A3B8] mt-0.5">{interview.position}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[#94A3B8] shrink-0">
                  <Eye className="w-3 h-3" />
                  <span className="text-[10px]">{interview.views}</span>
                </div>
              </div>
              {interview.tags && interview.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {interview.tags.slice(0, 5).map((tag) => (
                    <span
                      key={tag.id}
                      className="font-mono-tag text-[10px] px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${tag.color || "#A855F7"}10`,
                        color: tag.color || "#A855F7",
                      }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}
