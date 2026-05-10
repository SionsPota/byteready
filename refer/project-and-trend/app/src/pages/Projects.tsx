import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useProjects } from "@/hooks/useProjects";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  FolderKanban,
  Loader2,
  Zap,
  ArrowLeft,
  Target,
  Rocket,
  Clock,
  Star,
  CheckCircle2,
  ChevronRight,
  Copy,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export default function Projects() {
  const { resumeId } = useParams<{ resumeId: string }>();
  const navigate = useNavigate();
  const id = parseInt(resumeId || "0");
  const { projects, isLoading, analyze, isAnalyzing } = useProjects(id);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [expandedProject, setExpandedProject] = useState<number | null>(null);

  const handleAnalyze = () => {
    analyze({ resumeId: id });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("已复制到剪贴板");
  };

  const typeLabels: Record<string, { label: string; color: string }> = {
    quick_win: { label: "Quick Win", color: "bg-emerald-950/50 text-emerald-400 border-emerald-800/50" },
    weekend_build: { label: "Weekend Build", color: "bg-cyan-950/50 text-cyan-400 border-cyan-800/50" },
    deep_dive: { label: "Deep Dive", color: "bg-purple-950/50 text-purple-400 border-purple-800/50" },
  };

  const difficultyLabels: Record<string, string> = {
    beginner: "入门",
    intermediate: "中级",
    advanced: "高级",
  };

  const filtered = activeType
    ? projects.filter((p) => p.projectType === activeType)
    : projects;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="text-slate-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              返回
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5 text-cyan-400" />
                <h1 className="text-2xl font-bold">项目推荐</h1>
              </div>
              <p className="text-slate-400 text-sm mt-1">基于技能缺口分析，推荐可复刻的项目方案</p>
            </div>
          </div>
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="bg-cyan-500 hover:bg-cyan-600 text-white"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                分析中...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                {projects.length > 0 ? "重新分析" : "开始分析"}
              </>
            )}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-4">
              <FolderKanban className="h-8 w-8 text-slate-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-300 mb-2">暂无推荐项目</h3>
            <p className="text-slate-500 mb-6">点击「开始分析」按钮，获取你的项目推荐</p>
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="bg-cyan-500 hover:bg-cyan-600 text-white"
            >
              {isAnalyzing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              开始分析
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "推荐项目", value: projects.length, color: "text-cyan-400" },
                {
                  label: "平均影响分",
                  value: `${Math.round(projects.reduce((s, p) => s + p.impactScore, 0) / projects.length)}/10`,
                  color: "text-amber-400",
                },
                {
                  label: "覆盖缺口",
                  value: new Set(projects.map((p) => p.gapAddressed)).size,
                  color: "text-purple-400",
                },
                {
                  label: "Quick Wins",
                  value: projects.filter((p) => p.projectType === "quick_win").length,
                  color: "text-emerald-400",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-center"
                >
                  <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Type Filter */}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={activeType === null ? "secondary" : "ghost"}
                onClick={() => setActiveType(null)}
                className={activeType === null ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"}
              >
                全部
              </Button>
              {Object.entries(typeLabels).map(([key, { label }]) => (
                <Button
                  key={key}
                  size="sm"
                  variant={activeType === key ? "secondary" : "ghost"}
                  onClick={() => setActiveType(key === activeType ? null : key)}
                  className={activeType === key ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"}
                >
                  {label}
                </Button>
              ))}
            </div>

            {/* Projects List */}
            <div className="space-y-4">
              {filtered.map((project) => {
                const isExpanded = expandedProject === project.id;
                const typeInfo = typeLabels[project.projectType] || typeLabels.quick_win;
                const techStack = (project.techStack as string[]) || [];
                const features = (project.coreFeatures as string[]) || [];
                const highlights = (project.techHighlights as string[]) || [];
                const steps = (project.implementationSteps as string[]) || [];

                return (
                  <Card
                    key={project.id}
                    className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-all"
                  >
                    <CardContent className="p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <Badge
                              variant="outline"
                              className={`${typeInfo.color} text-xs`}
                            >
                              {typeInfo.label}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="bg-slate-800 border-slate-700 text-slate-300 text-xs"
                            >
                              {difficultyLabels[project.difficulty]}
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <Clock className="h-3 w-3" />
                              {project.timeEstimate}
                            </div>
                          </div>
                          <h3 className="text-lg font-semibold text-white">{project.name}</h3>
                          <p className="text-slate-400 text-sm mt-1">{project.description}</p>
                        </div>
                        <div className="ml-4 text-right">
                          <div className="text-2xl font-bold text-amber-400">
                            {project.impactScore}
                          </div>
                          <div className="text-xs text-slate-500">影响分/10</div>
                        </div>
                      </div>

                      {/* Tech Stack & Gap */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {techStack.map((tech) => (
                          <span
                            key={tech}
                            className="px-2 py-1 rounded-md bg-slate-800/50 border border-slate-700/50 text-xs text-slate-300"
                          >
                            {tech}
                          </span>
                        ))}
                        <span className="px-2 py-1 rounded-md bg-purple-950/30 border border-purple-800/30 text-xs text-purple-300">
                          <Target className="h-3 w-3 inline mr-1" />
                          {project.gapAddressed}
                        </span>
                      </div>

                      <Separator className="my-4 bg-slate-800" />

                      {/* Expandable Content */}
                      <div className="space-y-4">
                        {/* Core Features */}
                        <div>
                          <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                            核心功能
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {features.map((feature, i) => (
                              <span
                                key={i}
                                className="px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-sm text-slate-300"
                              >
                                {feature}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Expand button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                          className="text-slate-400 hover:text-white w-full"
                        >
                          {isExpanded ? "收起详情" : "展开详情"}
                          <ChevronRight
                            className={`h-4 w-4 ml-1 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                          />
                        </Button>

                        {isExpanded && (
                          <div className="space-y-4 pt-2">
                            {/* Tech Highlights */}
                            {highlights.length > 0 && (
                              <div className="rounded-lg bg-cyan-950/20 border border-cyan-800/30 p-4">
                                <h4 className="text-sm font-medium text-cyan-400 mb-2 flex items-center gap-2">
                                  <Star className="h-4 w-4" />
                                  技术亮点
                                </h4>
                                <ul className="space-y-2">
                                  {highlights.map((h, i) => (
                                    <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                                      <span className="text-cyan-400 mt-1">-</span>
                                      {h}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Implementation Steps */}
                            {steps.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                                  <Rocket className="h-4 w-4 text-orange-400" />
                                  实现步骤
                                </h4>
                                <div className="space-y-2">
                                  {steps.map((step, i) => (
                                    <div
                                      key={i}
                                      className="flex items-center gap-3 text-sm text-slate-300"
                                    >
                                      <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-medium text-slate-400">
                                        {i + 1}
                                      </span>
                                      {step}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Resume Template */}
                            {project.resumeTemplate && (
                              <div className="rounded-lg bg-emerald-950/20 border border-emerald-800/30 p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="text-sm font-medium text-emerald-400 flex items-center gap-2">
                                    <Sparkles className="h-4 w-4" />
                                    简历描述模板
                                  </h4>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleCopy(project.resumeTemplate!)}
                                    className="h-7 text-xs text-slate-400 hover:text-white"
                                  >
                                    <Copy className="h-3 w-3 mr-1" />
                                    复制
                                  </Button>
                                </div>
                                <p className="text-sm text-slate-300 italic">
                                  {project.resumeTemplate}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
