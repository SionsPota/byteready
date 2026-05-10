import { useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import Layout from "@/components/Layout";
import {
  Tag,
  Plus,
  Trash2,
  Palette,
  X,
  Save,
  Loader2,
  Layers,
} from "lucide-react";

const categoryLabels: Record<string, string> = {
  tech: "技术",
  process: "流程",
  company: "公司",
  role: "岗位",
  other: "其他",
};

const categoryColors: Record<string, string> = {
  tech: "#3B82F6",
  process: "#EC4899",
  company: "#8B5CF6",
  role: "#22C55E",
  other: "#94A3B8",
};

export default function Tags() {
  const { data: tags, refetch } = trpc.tag.list.useQuery();
  const createMutation = trpc.tag.create.useMutation({ onSuccess: () => refetch() });
  const deleteMutation = trpc.tag.delete.useMutation({ onSuccess: () => refetch() });
  const { data: tagStats } = trpc.tag.stats.useQuery();

  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    color: "#A855F7",
    category: "other" as "tech" | "process" | "company" | "role" | "other",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    createMutation.mutate(formData, {
      onSuccess: () => {
        setFormData({ name: "", color: "#A855F7", category: "other" });
        setShowAdd(false);
      },
    });
  };

  const presetColors = [
    "#EF4444", "#F97316", "#EAB308", "#22C55E", "#06B6D4",
    "#3B82F6", "#6366F1", "#8B5CF6", "#A855F7", "#D946EF",
    "#EC4899", "#F43F5E", "#14B8A6", "#10B981", "#84CC16",
  ];

  const groupedTags = tags?.reduce(
    (acc, tag) => {
      const cat = tag.category || "other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(tag);
      return acc;
    },
    {} as Record<string, typeof tags>
  );

  return (
    <Layout>
      <div className="mt-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">标签管理</h1>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="aurora-gradient text-white text-xs font-medium px-4 py-2 rounded-xl hover:opacity-90 transition-opacity flex items-center gap-1.5"
          >
            {showAdd ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showAdd ? "取消" : "添加标签"}
          </button>
        </div>

        {/* Stats */}
        {tagStats && (
          <div className="glass rounded-xl p-4 mb-6 flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#A855F7]" />
              <span className="text-xs text-[#94A3B8]">总标签数</span>
              <span className="text-sm font-bold">{tagStats.total}</span>
            </div>
            {Object.entries(tagStats.byCategory || {}).map(([cat, count]) => (
              <div key={cat} className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: categoryColors[cat] }}
                />
                <span className="text-xs text-[#94A3B8]">{categoryLabels[cat]}</span>
                <span className="text-sm font-bold">{count}</span>
              </div>
            ))}
          </div>
        )}

        {/* Add Form */}
        {showAdd && (
          <form onSubmit={handleSubmit} className="glass rounded-xl p-5 mb-6">
            <h3 className="text-sm font-medium mb-4">添加新标签</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-xs text-[#94A3B8] mb-1.5 block">标签名称 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  required
                  placeholder="例如：算法"
                  className="w-full bg-[#030305] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-[#F8FAFC] placeholder:text-[#475569] outline-none focus:border-purple-500/30"
                />
              </div>
              <div>
                <label className="text-xs text-[#94A3B8] mb-1.5 block">分类</label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      category: e.target.value as typeof formData.category,
                    }))
                  }
                  className="w-full bg-[#030305] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-[#F8FAFC] outline-none focus:border-purple-500/30"
                >
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs text-[#94A3B8] mb-2">
                  <Palette className="w-3.5 h-3.5" />
                  颜色
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {presetColors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, color: c }))}
                      className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${
                        formData.color === c ? "ring-2 ring-white/50 scale-110" : ""
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="aurora-gradient text-white text-xs font-medium px-5 py-2 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              保存
            </button>
          </form>
        )}

        {/* Tags by Category */}
        <div className="space-y-6">
          {groupedTags &&
            Object.entries(groupedTags).map(([category, catTags]) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: categoryColors[category] }}
                  />
                  <h3 className="text-sm font-medium text-[#94A3B8]">
                    {categoryLabels[category]}
                  </h3>
                  <span className="text-xs text-[#475569]">({catTags.length})</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {catTags.map((tag) => (
                    <div
                      key={tag.id}
                      className="group relative inline-flex items-center gap-1.5"
                    >
                      <Link
                        to={`/interviews?tagId=${tag.id}`}
                        className="font-mono-tag text-xs px-3 py-1.5 rounded-full border transition-all hover:scale-105"
                        style={{
                          backgroundColor: `${tag.color || "#A855F7"}10`,
                          color: tag.color || "#A855F7",
                          borderColor: `${tag.color}25`,
                        }}
                      >
                        {tag.name}
                      </Link>
                      <button
                        onClick={() => {
                          if (confirm(`确定删除标签 "${tag.name}" 吗？`)) {
                            deleteMutation.mutate({ id: tag.id });
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/5 text-[#475569] hover:text-[#EF4444] transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>

        {tags?.length === 0 && (
          <div className="glass rounded-xl p-12 text-center">
            <Tag className="w-8 h-8 text-[#475569] mx-auto mb-2" />
            <p className="text-sm text-[#94A3B8]">暂无标签数据</p>
            <button
              onClick={() => setShowAdd(true)}
              className="text-xs text-[#A855F7] hover:underline mt-2"
            >
              添加第一个标签
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
