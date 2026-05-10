import { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import Layout from "@/components/Layout";
import {
  Bug,
  Globe,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  Tag,
  Briefcase,
  Star,
  Save,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  AlertCircle,
  Sparkles,
} from "lucide-react";

const platformIcons: Record<string, string> = {
  nowcoder: "🐮",
  zhihu: "📚",
  xiaohongshu: "📕",
  v2ex: "🌐",
  unknown: "🔗",
};

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "待处理", color: "#EAB308", icon: Clock },
  running: { label: "爬取中", color: "#3B82F6", icon: Loader2 },
  completed: { label: "已完成", color: "#22C55E", icon: CheckCircle2 },
  failed: { label: "失败", color: "#EF4444", icon: XCircle },
};

const resultLabels: Record<string, string> = {
  passed: "通过",
  failed: "未通过",
  pending: "等待中",
  ghosted: "无回应",
};

export default function Crawler() {
  const [url, setUrl] = useState("");
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlResult, setCrawlResult] = useState<{
    taskId: number;
    success: boolean;
    title?: string;
    content?: string;
    platform?: string;
    extractedCompany?: string;
    extractedPosition?: string;
    matchedCompanyId?: number;
    matchedTagIds?: number[];
    error?: string;
  } | null>(null);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveForm, setSaveForm] = useState({
    companyId: 0,
    title: "",
    content: "",
    position: "",
    result: "pending" as "passed" | "failed" | "pending" | "ghosted",
    difficulty: 3,
    tagIds: [] as number[],
  });
  const [expandedTask, setExpandedTask] = useState<number | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();
  const { data: platforms } = trpc.crawl.platforms.useQuery();
  const { data: tasks, refetch: refetchTasks } = trpc.crawl.list.useQuery();
  const { data: companies } = trpc.company.list.useQuery();
  const { data: allTags } = trpc.tag.list.useQuery();

  const submitMutation = trpc.crawl.submit.useMutation();
  const executeMutation = trpc.crawl.execute.useMutation();
  const saveMutation = trpc.crawl.save.useMutation({
    onSuccess: () => {
      utils.crawl.list.invalidate();
      utils.interview.list.invalidate();
      setCrawlResult(null);
      setShowSaveForm(false);
      setUrl("");
    },
  });
  const deleteMutation = trpc.crawl.delete.useMutation({
    onSuccess: () => utils.crawl.list.invalidate(),
  });

  useEffect(() => {
    if (crawlResult && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [crawlResult]);

  const handleCrawl = async () => {
    if (!url.trim()) return;
    setIsCrawling(true);
    setCrawlResult(null);

    try {
      // Step 1: Submit task
      const submitResult = await submitMutation.mutateAsync({ url });

      // Step 2: Execute crawl
      const execResult = await executeMutation.mutateAsync({
        taskId: submitResult.taskId,
      });

      setCrawlResult({
        taskId: submitResult.taskId,
        ...execResult,
        platform: submitResult.platform,
      });

      if (execResult.success) {
        setSaveForm({
          companyId: execResult.matchedCompanyId || 0,
          title: execResult.title || "",
          content: execResult.content || "",
          position: execResult.extractedPosition || "",
          result: "pending",
          difficulty: 3,
          tagIds: execResult.matchedTagIds || [],
        });
      }

      refetchTasks();
    } catch (err) {
      setCrawlResult({
        taskId: 0,
        success: false,
        error: err instanceof Error ? err.message : "爬取失败",
      });
    } finally {
      setIsCrawling(false);
    }
  };

  const handleSave = async () => {
    if (!crawlResult?.taskId || !saveForm.companyId || !saveForm.title.trim() || !saveForm.content.trim())
      return;

    await saveMutation.mutateAsync({
      taskId: crawlResult.taskId,
      companyId: saveForm.companyId,
      title: saveForm.title,
      content: saveForm.content,
      position: saveForm.position,
      result: saveForm.result,
      difficulty: saveForm.difficulty,
      tagIds: saveForm.tagIds,
      sourceUrl: url,
    });
  };

  const toggleTag = (tagId: number) => {
    setSaveForm((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter((id) => id !== tagId)
        : [...prev.tagIds, tagId],
    }));
  };

  return (
    <Layout>
      {/* Header */}
      <div className="mt-6 mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl aurora-gradient flex items-center justify-center">
            <Bug className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">面经爬虫</h1>
            <p className="text-xs text-[#94A3B8]">粘贴链接自动抓取面经内容，智能解析公司和标签</p>
          </div>
        </div>
      </div>

      {/* URL Input */}
      <div className="glass rounded-2xl p-1.5 flex items-center gap-2 mb-6 focus-within:border-purple-500/30 transition-all">
        <Globe className="w-4 h-4 text-[#94A3B8] ml-3 shrink-0" />
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !isCrawling && handleCrawl()}
          placeholder="粘贴牛客/知乎/小红书/V2EX 面经链接，回车开始解析..."
          className="flex-1 bg-transparent text-sm text-[#F8FAFC] placeholder:text-[#475569] outline-none py-3"
        />
        <button
          onClick={handleCrawl}
          disabled={isCrawling || !url.trim()}
          className="aurora-gradient text-white text-xs font-medium px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 shrink-0 flex items-center gap-1.5"
        >
          {isCrawling ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
          {isCrawling ? "解析中..." : "开始解析"}
        </button>
      </div>

      {/* Supported Platforms */}
      <div className="mb-8">
        <p className="text-xs text-[#94A3B8] mb-3 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          支持的平台
        </p>
        <div className="flex flex-wrap gap-2">
          {platforms?.map((p) => (
            <button
              key={p.key}
              onClick={() => setUrl(p.example)}
              className="glass rounded-lg px-3 py-2 text-xs text-[#94A3B8] hover:text-[#F8FAFC] hover:border-white/15 transition-all flex items-center gap-1.5"
            >
              <span>{platformIcons[p.key]}</span>
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Crawl Result */}
      {crawlResult && (
        <div ref={resultRef} className="mb-8">
          {crawlResult.success ? (
            <div className="glass rounded-xl p-5 border border-[#22C55E]/20">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />
                <h2 className="text-sm font-semibold text-[#22C55E]">解析成功</h2>
              </div>

              {/* Extracted Info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {crawlResult.extractedCompany && (
                  <div className="glass-light rounded-lg p-3">
                    <div className="flex items-center gap-1 text-[10px] text-[#94A3B8] mb-1">
                      <Building2 className="w-3 h-3" />
                      识别公司
                    </div>
                    <p className="text-sm font-medium">{crawlResult.extractedCompany}</p>
                  </div>
                )}
                {crawlResult.extractedPosition && (
                  <div className="glass-light rounded-lg p-3">
                    <div className="flex items-center gap-1 text-[10px] text-[#94A3B8] mb-1">
                      <Briefcase className="w-3 h-3" />
                      识别岗位
                    </div>
                    <p className="text-sm font-medium">{crawlResult.extractedPosition}</p>
                  </div>
                )}
                <div className="glass-light rounded-lg p-3">
                  <div className="flex items-center gap-1 text-[10px] text-[#94A3B8] mb-1">
                    <Globe className="w-3 h-3" />
                    来源平台
                  </div>
                  <p className="text-sm font-medium">
                    {platformIcons[crawlResult.platform || "unknown"]}{" "}
                    {platforms?.find((p) => p.key === crawlResult.platform)?.name || "未知"}
                  </p>
                </div>
                {crawlResult.matchedTagIds && crawlResult.matchedTagIds.length > 0 && (
                  <div className="glass-light rounded-lg p-3">
                    <div className="flex items-center gap-1 text-[10px] text-[#94A3B8] mb-1">
                      <Tag className="w-3 h-3" />
                      匹配标签
                    </div>
                    <p className="text-sm font-medium">{crawlResult.matchedTagIds.length} 个</p>
                  </div>
                )}
              </div>

              {/* Preview */}
              <div className="mb-4">
                <h3 className="text-xs font-medium text-[#94A3B8] mb-2">
                  内容预览 ({crawlResult.content?.length || 0} 字)
                </h3>
                <div className="glass-light rounded-lg p-3 max-h-48 overflow-y-auto scrollbar-thin">
                  <pre className="text-xs text-[#CBD5E1] whitespace-pre-wrap leading-relaxed font-sans">
                    {crawlResult.content?.slice(0, 800)}
                    {crawlResult.content && crawlResult.content.length > 800 && "..."}
                  </pre>
                </div>
              </div>

              {/* Save or Discard */}
              {!showSaveForm ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowSaveForm(true)}
                    className="aurora-gradient text-white text-xs font-medium px-5 py-2 rounded-xl hover:opacity-90 transition-opacity flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    保存到面经库
                  </button>
                  <button
                    onClick={() => {
                      setCrawlResult(null);
                      setUrl("");
                    }}
                    className="text-xs text-[#94A3B8] hover:text-[#F8FAFC] transition-colors px-4 py-2"
                  >
                    放弃
                  </button>
                </div>
              ) : (
                <div className="glass-light rounded-xl p-4">
                  <h3 className="text-sm font-medium mb-4">保存设置</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-xs text-[#94A3B8] mb-1.5 block">公司 *</label>
                      <select
                        value={saveForm.companyId}
                        onChange={(e) =>
                          setSaveForm((prev) => ({ ...prev, companyId: Number(e.target.value) }))
                        }
                        className="w-full bg-[#030305] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F8FAFC] outline-none focus:border-purple-500/30"
                      >
                        <option value={0}>选择公司</option>
                        {companies?.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-[#94A3B8] mb-1.5 block">岗位</label>
                      <input
                        type="text"
                        value={saveForm.position}
                        onChange={(e) =>
                          setSaveForm((prev) => ({ ...prev, position: e.target.value }))
                        }
                        className="w-full bg-[#030305] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F8FAFC] outline-none focus:border-purple-500/30"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                    <div>
                      <label className="text-xs text-[#94A3B8] mb-1.5 block">结果</label>
                      <select
                        value={saveForm.result}
                        onChange={(e) =>
                          setSaveForm((prev) => ({
                            ...prev,
                            result: e.target.value as typeof saveForm.result,
                          }))
                        }
                        className="w-full bg-[#030305] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F8FAFC] outline-none focus:border-purple-500/30"
                      >
                        {Object.entries(resultLabels).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-[#94A3B8] mb-1.5 block">难度</label>
                      <div className="flex gap-1 pt-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setSaveForm((prev) => ({ ...prev, difficulty: s }))}
                          >
                            <Star
                              className="w-4 h-4"
                              fill={s <= saveForm.difficulty ? "#EAB308" : "transparent"}
                              color={s <= saveForm.difficulty ? "#EAB308" : "#475569"}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* Tags */}
                  <div className="mb-4">
                    <label className="text-xs text-[#94A3B8] mb-2 block">标签</label>
                    <div className="flex flex-wrap gap-1.5">
                      {allTags?.map((tag) => {
                        const isSelected = saveForm.tagIds.includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => toggleTag(tag.id)}
                            className="font-mono-tag text-xs px-2.5 py-1 rounded-full border transition-all hover:scale-105"
                            style={{
                              backgroundColor: isSelected ? `${tag.color || "#A855F7"}15` : "transparent",
                              color: isSelected ? tag.color || "#A855F7" : "#94A3B8",
                              borderColor: isSelected ? `${tag.color || "#A855F7"}30` : "rgba(255,255,255,0.06)",
                            }}
                          >
                            {tag.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSave}
                      disabled={saveMutation.isPending || !saveForm.companyId}
                      className="aurora-gradient text-white text-xs font-medium px-5 py-2 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center gap-1.5"
                    >
                      {saveMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      确认保存
                    </button>
                    <button
                      onClick={() => setShowSaveForm(false)}
                      className="text-xs text-[#94A3B8] hover:text-[#F8FAFC] transition-colors px-4 py-2"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="glass rounded-xl p-5 border border-[#EF4444]/20">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-[#EF4444]" />
                <h2 className="text-sm font-semibold text-[#EF4444]">解析失败</h2>
              </div>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                {crawlResult.error || "未知错误"}
              </p>
              <p className="text-xs text-[#475569] mt-2">
                提示：部分平台（如小红书）有反爬机制，建议手动复制内容添加。
              </p>
              <button
                onClick={() => setCrawlResult(null)}
                className="text-xs text-[#94A3B8] hover:text-[#F8FAFC] transition-colors mt-3"
              >
                关闭
              </button>
            </div>
          )}
        </div>
      )}

      {/* Task History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#A855F7]" />
            抓取历史
          </h2>
          <button
            onClick={() => refetchTasks()}
            className="text-xs text-[#94A3B8] hover:text-[#F8FAFC] transition-colors flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            刷新
          </button>
        </div>

        <div className="space-y-2">
          {tasks?.length === 0 && (
            <div className="glass rounded-xl p-8 text-center">
              <Bug className="w-8 h-8 text-[#475569] mx-auto mb-2" />
              <p className="text-sm text-[#94A3B8]">暂无抓取记录</p>
            </div>
          )}

          {tasks?.map((task) => {
            const config = statusConfig[task.status || "pending"];
            const StatusIcon = config.icon;
            return (
              <div
                key={task.id}
                className="glass rounded-xl overflow-hidden hover:border-white/10 transition-all"
              >
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                  onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                >
                  <StatusIcon
                    className={`w-4 h-4 shrink-0 ${task.status === "running" ? "animate-spin" : ""}`}
                    style={{ color: config.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">
                      {task.title || task.sourceUrl}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-[#94A3B8]">
                        {platformIcons[task.platform || "unknown"]}{" "}
                        {platforms?.find((p) => p.key === task.platform)?.name || task.platform}
                      </span>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${config.color}15`,
                          color: config.color,
                        }}
                      >
                        {config.label}
                      </span>
                      {task.interviewId && (
                        <Link
                          to={`/interviews/${task.interviewId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[10px] text-[#A855F7] hover:underline flex items-center gap-0.5"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                          已入库 #{task.interviewId}
                        </Link>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("确定删除这条记录吗？")) {
                          deleteMutation.mutate({ id: task.id });
                        }
                      }}
                      className="p-1.5 rounded-lg hover:bg-white/5 text-[#475569] hover:text-[#EF4444] transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {expandedTask === task.id ? (
                      <ChevronUp className="w-4 h-4 text-[#475569]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#475569]" />
                    )}
                  </div>
                </div>

                {/* Expanded content */}
                {expandedTask === task.id && (
                  <div className="px-4 pb-4 border-t border-white/5 pt-3">
                    {task.errorMessage && (
                      <div className="mb-3 p-2 rounded-lg bg-[#EF4444]/5 border border-[#EF4444]/10">
                        <p className="text-xs text-[#EF4444]">{task.errorMessage}</p>
                      </div>
                    )}
                    {task.extractedCompany && (
                      <div className="flex items-center gap-1.5 text-xs text-[#94A3B8] mb-1">
                        <Building2 className="w-3 h-3" />
                        识别公司：{task.extractedCompany}
                      </div>
                    )}
                    {task.extractedPosition && (
                      <div className="flex items-center gap-1.5 text-xs text-[#94A3B8] mb-1">
                        <Briefcase className="w-3 h-3" />
                        识别岗位：{task.extractedPosition}
                      </div>
                    )}
                    {task.extractedTags && (
                      <div className="flex items-center gap-1.5 text-xs text-[#94A3B8] mb-2">
                        <Tag className="w-3 h-3" />
                        标签：{task.extractedTags}
                      </div>
                    )}
                    {task.content && (
                      <div className="glass-light rounded-lg p-3 max-h-40 overflow-y-auto scrollbar-thin mt-2">
                        <pre className="text-xs text-[#CBD5E1] whitespace-pre-wrap leading-relaxed font-sans">
                          {task.content.slice(0, 500)}
                          {task.content.length > 500 && "..."}
                        </pre>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <a
                        href={task.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#A855F7] hover:underline flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-3 h-3" />
                        查看原文
                      </a>
                      <span className="text-[10px] text-[#475569]">
                        {new Date(task.createdAt).toLocaleString("zh-CN")}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
