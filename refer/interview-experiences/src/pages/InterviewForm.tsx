import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { trpc } from "@/providers/trpc";
import Layout from "@/components/Layout";
import {
  Save,
  ArrowLeft,
  Building2,
  Tag,
  Star,
  Loader2,
  Globe,
  Briefcase,
  Calendar,
  FileText,
  AlignLeft,
  X,
  Plus,
} from "lucide-react";

const categoryLabels: Record<string, string> = {
  tech: "技术",
  process: "流程",
  company: "公司",
  role: "岗位",
  other: "其他",
};

export default function InterviewForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;
  const interviewId = isEditing ? Number(id) : 0;

  const { data: existingInterview } = trpc.interview.getById.useQuery(
    { id: interviewId },
    { enabled: isEditing && !isNaN(interviewId) }
  );

  const { data: companies } = trpc.company.list.useQuery();
  const { data: allTags } = trpc.tag.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.interview.create.useMutation({
    onSuccess: () => {
      utils.interview.list.invalidate();
      navigate("/interviews");
    },
  });

  const updateMutation = trpc.interview.update.useMutation({
    onSuccess: () => {
      utils.interview.list.invalidate();
      navigate(`/interviews/${interviewId}`);
    },
  });

  const [formData, setFormData] = useState({
    companyId: 0,
    title: "",
    content: "",
    sourceUrl: "",
    position: "",
    interviewDate: "",
    result: "pending" as "passed" | "failed" | "pending" | "ghosted",
    difficulty: 3,
    tagIds: [] as number[],
  });

  useEffect(() => {
    if (existingInterview) {
      setFormData({
        companyId: existingInterview.companyId,
        title: existingInterview.title,
        content: existingInterview.content || "",
        sourceUrl: existingInterview.sourceUrl || "",
        position: existingInterview.position || "",
        interviewDate: existingInterview.interviewDate
          ? new Date(existingInterview.interviewDate).toISOString().split("T")[0]
          : "",
        result: (existingInterview.result as "passed" | "failed" | "pending" | "ghosted") || "pending",
        difficulty: existingInterview.difficulty || 3,
        tagIds: existingInterview.tags?.map((t) => t.id) || [],
      });
    }
  }, [existingInterview]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyId || !formData.title.trim() || !formData.content.trim()) {
      return;
    }

    if (isEditing) {
      updateMutation.mutate({
        id: interviewId,
        ...formData,
      });
    } else {
      createMutation.mutate({
        ...formData,
        companyId: formData.companyId,
      });
    }
  };

  const toggleTag = (tagId: number) => {
    setFormData((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter((id) => id !== tagId)
        : [...prev.tagIds, tagId],
    }));
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Layout>
      {/* Header */}
      <div className="mt-6 mb-6">
        <Link
          to={isEditing ? `/interviews/${interviewId}` : "/interviews"}
          className="inline-flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-[#F8FAFC] transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          返回
        </Link>
        <h1 className="text-xl font-bold">
          {isEditing ? "编辑面经" : "添加面经"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl">
        <div className="space-y-4">
          {/* Company */}
          <div className="glass rounded-xl p-4">
            <label className="flex items-center gap-1.5 text-xs font-medium text-[#94A3B8] mb-2">
              <Building2 className="w-3.5 h-3.5" />
              公司 *
            </label>
            <select
              value={formData.companyId}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, companyId: Number(e.target.value) }))
              }
              required
              className="w-full bg-[#030305] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-[#F8FAFC] outline-none focus:border-purple-500/30"
            >
              <option value={0}>选择公司</option>
              {companies?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div className="glass rounded-xl p-4">
            <label className="flex items-center gap-1.5 text-xs font-medium text-[#94A3B8] mb-2">
              <FileText className="w-3.5 h-3.5" />
              标题 *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              required
              placeholder="例如：字节跳动后端一面面经"
              className="w-full bg-[#030305] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-[#F8FAFC] placeholder:text-[#475569] outline-none focus:border-purple-500/30"
            />
          </div>

          {/* Position & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="glass rounded-xl p-4">
              <label className="flex items-center gap-1.5 text-xs font-medium text-[#94A3B8] mb-2">
                <Briefcase className="w-3.5 h-3.5" />
                岗位
              </label>
              <input
                type="text"
                value={formData.position}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, position: e.target.value }))
                }
                placeholder="例如：后端开发工程师"
                className="w-full bg-[#030305] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-[#F8FAFC] placeholder:text-[#475569] outline-none focus:border-purple-500/30"
              />
            </div>
            <div className="glass rounded-xl p-4">
              <label className="flex items-center gap-1.5 text-xs font-medium text-[#94A3B8] mb-2">
                <Calendar className="w-3.5 h-3.5" />
                面试日期
              </label>
              <input
                type="date"
                value={formData.interviewDate}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, interviewDate: e.target.value }))
                }
                className="w-full bg-[#030305] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-[#F8FAFC] outline-none focus:border-purple-500/30"
              />
            </div>
          </div>

          {/* Result & Difficulty */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="glass rounded-xl p-4">
              <label className="text-xs font-medium text-[#94A3B8] mb-2 block">
                面试结果
              </label>
              <div className="flex gap-2">
                {(["passed", "failed", "pending", "ghosted"] as const).map((r) => {
                  const colors: Record<string, string> = {
                    passed: "#22C55E",
                    failed: "#EF4444",
                    pending: "#EAB308",
                    ghosted: "#6B7280",
                  };
                  const labels: Record<string, string> = {
                    passed: "通过",
                    failed: "未通过",
                    pending: "等待中",
                    ghosted: "无回应",
                  };
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, result: r }))}
                      className="flex-1 py-2 rounded-lg text-xs font-medium transition-all border"
                      style={{
                        backgroundColor:
                          formData.result === r ? `${colors[r]}15` : "transparent",
                        borderColor:
                          formData.result === r ? `${colors[r]}40` : "rgba(255,255,255,0.08)",
                        color: formData.result === r ? colors[r] : "#94A3B8",
                      }}
                    >
                      {labels[r]}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="glass rounded-xl p-4">
              <label className="flex items-center gap-1.5 text-xs font-medium text-[#94A3B8] mb-2">
                <Star className="w-3.5 h-3.5 text-[#EAB308]" />
                难度评级
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, difficulty: star }))
                    }
                    className="text-lg transition-transform hover:scale-110"
                  >
                    <Star
                      className="w-5 h-5"
                      fill={star <= formData.difficulty ? "#EAB308" : "transparent"}
                      color={star <= formData.difficulty ? "#EAB308" : "#475569"}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Source URL */}
          <div className="glass rounded-xl p-4">
            <label className="flex items-center gap-1.5 text-xs font-medium text-[#94A3B8] mb-2">
              <Globe className="w-3.5 h-3.5" />
              来源链接
            </label>
            <input
              type="url"
              value={formData.sourceUrl}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, sourceUrl: e.target.value }))
              }
              placeholder="https://..."
              className="w-full bg-[#030305] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-[#F8FAFC] placeholder:text-[#475569] outline-none focus:border-purple-500/30"
            />
          </div>

          {/* Content */}
          <div className="glass rounded-xl p-4">
            <label className="flex items-center gap-1.5 text-xs font-medium text-[#94A3B8] mb-2">
              <AlignLeft className="w-3.5 h-3.5" />
              面试内容 *
            </label>
            <textarea
              value={formData.content}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, content: e.target.value }))
              }
              required
              rows={12}
              placeholder="详细描述面试过程，包括：自我介绍、技术问题、算法题、项目讨论、反问环节等..."
              className="w-full bg-[#030305] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-[#F8FAFC] placeholder:text-[#475569] outline-none focus:border-purple-500/30 resize-y leading-relaxed"
            />
          </div>

          {/* Tags */}
          <div className="glass rounded-xl p-4">
            <label className="flex items-center gap-1.5 text-xs font-medium text-[#94A3B8] mb-3">
              <Tag className="w-3.5 h-3.5" />
              标签
            </label>
            {/* Selected Tags */}
            {formData.tagIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {formData.tagIds.map((tagId) => {
                  const tag = allTags?.find((t) => t.id === tagId);
                  if (!tag) return null;
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className="font-mono-tag text-xs px-3 py-1.5 rounded-full flex items-center gap-1 border transition-all"
                      style={{
                        backgroundColor: `${tag.color || "#A855F7"}20`,
                        color: tag.color || "#A855F7",
                        borderColor: `${tag.color}40`,
                      }}
                    >
                      {tag.name}
                      <X className="w-3 h-3" />
                    </button>
                  );
                })}
              </div>
            )}
            {/* Available Tags by Category */}
            <div className="space-y-3">
              {(["tech", "process", "role", "other"] as const).map((cat) => {
                const catTags = allTags?.filter((t) => t.category === cat) || [];
                if (catTags.length === 0) return null;
                return (
                  <div key={cat}>
                    <span className="text-[10px] text-[#475569] uppercase tracking-wider mb-1.5 block">
                      {categoryLabels[cat]}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {catTags.map((tag) => {
                        const isSelected = formData.tagIds.includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => toggleTag(tag.id)}
                            className="font-mono-tag text-xs px-2.5 py-1 rounded-full border transition-all hover:scale-105"
                            style={{
                              backgroundColor: isSelected
                                ? `${tag.color || "#A855F7"}15`
                                : "transparent",
                              color: isSelected ? (tag.color || "#A855F7") : "#94A3B8",
                              borderColor: isSelected
                                ? `${tag.color || "#A855F7"}30`
                                : "rgba(255,255,255,0.06)",
                            }}
                          >
                            {isSelected && <Plus className="w-2.5 h-2.5 inline mr-0.5" />}
                            {tag.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="aurora-gradient text-white text-sm font-medium px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isEditing ? "保存修改" : "添加面经"}
            </button>
            <Link
              to={isEditing ? `/interviews/${interviewId}` : "/interviews"}
              className="text-sm text-[#94A3B8] hover:text-[#F8FAFC] transition-colors px-4 py-2.5"
            >
              取消
            </Link>
          </div>
        </div>
      </form>
    </Layout>
  );
}
