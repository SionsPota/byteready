import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { trpc } from "@/providers/trpc";
import Layout from "@/components/Layout";
import {
  Search,
  Plus,
  Filter,
  X,
  Eye,
  Star,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Pencil,
} from "lucide-react";

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

export default function Interviews() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [selectedCompany, setSelectedCompany] = useState<number | undefined>(
    searchParams.get("companyId") ? Number(searchParams.get("companyId")) : undefined
  );
  const [selectedResult, setSelectedResult] = useState<string | undefined>(
    searchParams.get("result") || undefined
  );
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const { data: interviews, refetch } = trpc.interview.list.useQuery({
    search: searchQuery || undefined,
    companyId: selectedCompany,
    result: selectedResult as "passed" | "failed" | "pending" | "ghosted" | undefined,
    limit: pageSize,
    offset: page * pageSize,
  });

  const { data: companies } = trpc.company.list.useQuery();
  const deleteMutation = trpc.interview.delete.useMutation({
    onSuccess: () => refetch(),
  });

  const handleSearch = () => {
    setPage(0);
    refetch();
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCompany(undefined);
    setSelectedResult(undefined);
    setPage(0);
    setSearchParams({});
  };

  const hasFilters = searchQuery || selectedCompany || selectedResult;

  return (
    <Layout>
      {/* Header */}
      <div className="mt-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">我的面经</h1>
          <Link
            to="/interviews/new"
            className="aurora-gradient text-white text-xs font-medium px-4 py-2 rounded-xl hover:opacity-90 transition-opacity flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            添加面经
          </Link>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 glass rounded-xl p-1 flex items-center gap-2">
            <Search className="w-4 h-4 text-[#94A3B8] ml-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="搜索标题、内容、岗位..."
              className="flex-1 bg-transparent text-sm text-[#F8FAFC] placeholder:text-[#475569] outline-none py-2"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`glass rounded-xl px-3 py-2 flex items-center gap-1.5 text-xs transition-all ${
              showFilters ? "border-purple-500/30 text-[#A855F7]" : "text-[#94A3B8]"
            }`}
          >
            <Filter className="w-4 h-4" />
            筛选
          </button>
          <button
            onClick={handleSearch}
            className="aurora-gradient text-white text-xs font-medium px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
          >
            搜索
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="glass rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-[#94A3B8]">筛选条件</span>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-[#94A3B8] hover:text-[#EF4444] transition-colors flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  清除
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[#94A3B8] mb-1.5 block">公司</label>
                <select
                  value={selectedCompany || ""}
                  onChange={(e) => setSelectedCompany(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full bg-[#030305] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F8FAFC] outline-none focus:border-purple-500/30"
                >
                  <option value="">全部公司</option>
                  {companies?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-[#94A3B8] mb-1.5 block">面试结果</label>
                <select
                  value={selectedResult || ""}
                  onChange={(e) => setSelectedResult(e.target.value || undefined)}
                  className="w-full bg-[#030305] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F8FAFC] outline-none focus:border-purple-500/30"
                >
                  <option value="">全部结果</option>
                  <option value="passed">通过</option>
                  <option value="failed">未通过</option>
                  <option value="pending">等待中</option>
                  <option value="ghosted">无回应</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interview List */}
      <div className="space-y-3 mb-8">
        {interviews?.length === 0 && (
          <div className="glass rounded-xl p-12 text-center">
            <p className="text-sm text-[#94A3B8]">暂无面经数据</p>
            <Link
              to="/interviews/new"
              className="text-xs text-[#A855F7] hover:underline mt-2 inline-block"
            >
              添加第一条面经
            </Link>
          </div>
        )}

        {interviews?.map((interview) => (
          <div
            key={interview.id}
            className="glass rounded-xl p-4 hover:border-white/15 transition-all duration-300 group"
          >
            <div className="flex items-start justify-between gap-4">
              <Link
                to={`/interviews/${interview.id}`}
                className="flex-1 min-w-0"
              >
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
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
                  {interview.position && (
                    <span className="text-[10px] text-[#94A3B8]">
                      {interview.position}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-medium text-[#F8FAFC] group-hover:text-[#A855F7] transition-colors">
                  {interview.title}
                </h3>
                <p className="text-xs text-[#94A3B8] mt-1 line-clamp-2 leading-relaxed">
                  {interview.content?.slice(0, 200)}...
                </p>
                {interview.tags && interview.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {interview.tags.slice(0, 6).map((tag) => (
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
                <div className="flex items-center gap-3 mt-2 text-[10px] text-[#475569]">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {interview.views} 浏览
                  </span>
                  {interview.difficulty && (
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-[#EAB308]" />
                      {"★".repeat(interview.difficulty)}
                    </span>
                  )}
                </div>
              </Link>
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link
                  to={`/interviews/${interview.id}/edit`}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-[#94A3B8] hover:text-[#A855F7] transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={() => {
                    if (confirm("确定删除这条面经吗？")) {
                      deleteMutation.mutate({ id: interview.id });
                    }
                  }}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-[#94A3B8] hover:text-[#EF4444] transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {interviews && interviews.length > 0 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="p-2 rounded-lg glass text-[#94A3B8] hover:text-[#F8FAFC] disabled:opacity-30 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-[#94A3B8] px-3">第 {page + 1} 页</span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={!interviews || interviews.length < pageSize}
            className="p-2 rounded-lg glass text-[#94A3B8] hover:text-[#F8FAFC] disabled:opacity-30 transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </Layout>
  );
}
