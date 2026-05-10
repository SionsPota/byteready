import { useParams, Link, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import Layout from "@/components/Layout";
import {
  Calendar,
  Star,
  Eye,
  ExternalLink,
  ArrowLeft,
  Tag,
  Clock,
  Trash2,
  Pencil,
  Loader2,
} from "lucide-react";
import { useEffect } from "react";

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

export default function InterviewDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const interviewId = Number(id);

  const { data: interview, isLoading } = trpc.interview.getById.useQuery(
    { id: interviewId },
    { enabled: !isNaN(interviewId) }
  );

  const deleteMutation = trpc.interview.delete.useMutation({
    onSuccess: () => navigate("/interviews"),
  });

  const incrementMutation = trpc.interview.incrementViews.useMutation();

  useEffect(() => {
    if (!isNaN(interviewId)) {
      incrementMutation.mutate({ id: interviewId });
    }
  }, [interviewId]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-[#A855F7]" />
        </div>
      </Layout>
    );
  }

  if (!interview) {
    return (
      <Layout>
        <div className="glass rounded-xl p-12 text-center mt-8">
          <p className="text-sm text-[#94A3B8]">面经不存在或已被删除</p>
          <Link
            to="/interviews"
            className="text-xs text-[#A855F7] hover:underline mt-2 inline-block"
          >
            返回列表
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Back button */}
      <div className="mt-6 mb-4">
        <Link
          to="/interviews"
          className="inline-flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          返回列表
        </Link>
      </div>

      {/* Header */}
      <div className="glass rounded-xl p-5 mb-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span
                className="font-mono-tag text-xs px-3 py-1 rounded-full font-medium"
                style={{
                  backgroundColor: `${interview.companyColor || "#6366F1"}15`,
                  color: interview.companyColor || "#6366F1",
                }}
              >
                {interview.companyName}
              </span>
              <span
                className="text-xs px-3 py-1 rounded-full"
                style={{
                  backgroundColor: `${resultColors[interview.result || "pending"]}15`,
                  color: resultColors[interview.result || "pending"],
                }}
              >
                {resultLabels[interview.result || "pending"]}
              </span>
            </div>
            <h1 className="text-lg font-bold">{interview.title}</h1>
            {interview.position && (
              <p className="text-sm text-[#94A3B8] mt-1">{interview.position}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Link
              to={`/interviews/${interview.id}/edit`}
              className="p-2 rounded-lg hover:bg-white/5 text-[#94A3B8] hover:text-[#A855F7] transition-colors"
            >
              <Pencil className="w-4 h-4" />
            </Link>
            <button
              onClick={() => {
                if (confirm("确定删除这条面经吗？")) {
                  deleteMutation.mutate({ id: interview.id });
                }
              }}
              className="p-2 rounded-lg hover:bg-white/5 text-[#94A3B8] hover:text-[#EF4444] transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Meta Info */}
        <div className="flex flex-wrap gap-4 text-xs text-[#94A3B8]">
          {interview.interviewDate && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(interview.interviewDate).toLocaleDateString("zh-CN")}
            </span>
          )}
          {interview.difficulty && (
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-[#EAB308]" />
              难度: {"★".repeat(interview.difficulty)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            {interview.views} 次浏览
          </span>
          {interview.sourceUrl && (
            <a
              href={interview.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[#A855F7] hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              来源链接
            </a>
          )}
        </div>

        {/* Tags */}
        {interview.tags && interview.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/5">
            <Tag className="w-3.5 h-3.5 text-[#94A3B8] mr-1" />
            {interview.tags.map((tag) => (
              <Link
                key={tag.id}
                to={`/interviews?tagId=${tag.id}`}
                className="font-mono-tag text-xs px-3 py-1 rounded-full border border-white/8 hover:border-white/20 transition-all hover:scale-105"
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
        )}
      </div>

      {/* Content */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-[#A855F7]" />
          <h2 className="text-sm font-semibold">面试内容</h2>
        </div>
        <div className="prose prose-invert prose-sm max-w-none">
          <pre className="whitespace-pre-wrap text-sm text-[#CBD5E1] leading-relaxed font-sans bg-transparent p-0">
            {interview.content}
          </pre>
        </div>
      </div>
    </Layout>
  );
}
