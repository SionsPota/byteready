import { useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import Layout from "@/components/Layout";
import {
  Building2,
  Plus,
  Trash2,
  Pencil,
  Briefcase,
  Palette,
  X,
  Save,
  Loader2,
} from "lucide-react";

export default function Companies() {
  const { data: companies, refetch } = trpc.company.list.useQuery();
  const createMutation = trpc.company.create.useMutation({ onSuccess: () => refetch() });
  const deleteMutation = trpc.company.delete.useMutation({ onSuccess: () => refetch() });

  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    industry: "",
    description: "",
    color: "#6366F1",
  });
  const [_editingId] = useState<number | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (_editingId) {
      // Update would go here
    } else {
      createMutation.mutate(formData, {
        onSuccess: () => {
          setFormData({ name: "", industry: "", description: "", color: "#6366F1" });
          setShowAdd(false);
        },
      });
    }
  };

  const presetColors = [
    "#6366F1", "#A855F7", "#EC4899", "#EF4444", "#F97316",
    "#EAB308", "#22C55E", "#06B6D4", "#3B82F6", "#8B5CF6",
    "#00C9A7", "#0052D9", "#FF6A00", "#FFD100", "#CF0A2C",
  ];

  return (
    <Layout>
      <div className="mt-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">公司管理</h1>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="aurora-gradient text-white text-xs font-medium px-4 py-2 rounded-xl hover:opacity-90 transition-opacity flex items-center gap-1.5"
          >
            {showAdd ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showAdd ? "取消" : "添加公司"}
          </button>
        </div>

        {/* Add Form */}
        {showAdd && (
          <form onSubmit={handleSubmit} className="glass rounded-xl p-5 mb-6">
            <h3 className="text-sm font-medium mb-4">添加新公司</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-[#94A3B8] mb-1.5 block">公司名称 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  required
                  placeholder="例如：字节跳动"
                  className="w-full bg-[#030305] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-[#F8FAFC] placeholder:text-[#475569] outline-none focus:border-purple-500/30"
                />
              </div>
              <div>
                <label className="text-xs text-[#94A3B8] mb-1.5 block">行业</label>
                <input
                  type="text"
                  value={formData.industry}
                  onChange={(e) => setFormData((prev) => ({ ...prev, industry: e.target.value }))}
                  placeholder="例如：互联网"
                  className="w-full bg-[#030305] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-[#F8FAFC] placeholder:text-[#475569] outline-none focus:border-purple-500/30"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="text-xs text-[#94A3B8] mb-1.5 block">描述</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="公司简介..."
                className="w-full bg-[#030305] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-[#F8FAFC] placeholder:text-[#475569] outline-none focus:border-purple-500/30"
              />
            </div>
            <div className="mb-4">
              <label className="flex items-center gap-1.5 text-xs text-[#94A3B8] mb-2">
                <Palette className="w-3.5 h-3.5" />
                主题色
              </label>
              <div className="flex flex-wrap gap-2">
                {presetColors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, color: c }))}
                    className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${
                      formData.color === c ? "ring-2 ring-white/50 scale-110" : ""
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
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

        {/* Company Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies?.map((company) => (
            <div
              key={company.id}
              className="glass rounded-xl p-4 hover:border-white/15 transition-all duration-300 group relative overflow-hidden"
            >
              {/* Color accent line */}
              <div
                className="absolute top-0 left-0 right-0 h-0.5"
                style={{ backgroundColor: company.color || "#6366F1" }}
              />

              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                  style={{ backgroundColor: `${company.color || "#6366F1"}20`, color: company.color || "#6366F1" }}
                >
                  {company.name.charAt(0)}
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1.5 rounded-lg hover:bg-white/5 text-[#94A3B8] hover:text-[#A855F7] transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`确定删除 ${company.name} 吗？`)) {
                        deleteMutation.mutate({ id: company.id });
                      }
                    }}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-[#94A3B8] hover:text-[#EF4444] transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h3 className="text-sm font-semibold mb-1">{company.name}</h3>
              {company.industry && (
                <p className="text-xs text-[#94A3B8] mb-2">{company.industry}</p>
              )}
              {company.description && (
                <p className="text-xs text-[#475569] line-clamp-2 mb-3">{company.description}</p>
              )}

              <div className="flex items-center justify-between">
                <Link
                  to={`/interviews?companyId=${company.id}`}
                  className="text-xs text-[#94A3B8] hover:text-[#A855F7] transition-colors flex items-center gap-1"
                >
                  <Briefcase className="w-3 h-3" />
                  查看面经
                </Link>
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: company.color || "#6366F1" }}
                />
              </div>
            </div>
          ))}
        </div>

        {companies?.length === 0 && (
          <div className="glass rounded-xl p-12 text-center">
            <Building2 className="w-8 h-8 text-[#475569] mx-auto mb-2" />
            <p className="text-sm text-[#94A3B8]">暂无公司数据</p>
            <button
              onClick={() => setShowAdd(true)}
              className="text-xs text-[#A855F7] hover:underline mt-2"
            >
              添加第一家公司
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
