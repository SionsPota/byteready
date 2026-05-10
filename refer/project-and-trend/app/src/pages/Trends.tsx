import { useParams, useNavigate } from "react-router";
import { useTrends } from "@/hooks/useTrends";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  TrendingUp,
  Loader2,
  Zap,
  ArrowLeft,
  ExternalLink,
  Lightbulb,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

export default function Trends() {
  const { resumeId } = useParams<{ resumeId: string }>();
  const navigate = useNavigate();
  const id = parseInt(resumeId || "0");
  const { trends, isLoading, analyze, isAnalyzing } = useTrends(id);
  const [activeDomain, setActiveDomain] = useState<string | null>(null);

  const handleAnalyze = () => {
    analyze({ resumeId: id });
  };

  const groupedByDomain = trends.reduce((acc, trend) => {
    if (!acc[trend.domain]) acc[trend.domain] = [];
    acc[trend.domain].push(trend);
    return acc;
  }, {} as Record<string, typeof trends>);

  const domains = Object.keys(groupedByDomain);

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
                <TrendingUp className="h-5 w-5 text-emerald-400" />
                <h1 className="text-2xl font-bold">技术趋势推荐</h1>
              </div>
              <p className="text-slate-400 text-sm mt-1">基于你的技术栈，匹配最前沿的行业趋势</p>
            </div>
          </div>
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                分析中...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                {trends.length > 0 ? "重新分析" : "开始分析"}
              </>
            )}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          </div>
        ) : trends.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="h-8 w-8 text-slate-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-300 mb-2">暂无趋势数据</h3>
            <p className="text-slate-500 mb-6">点击「开始分析」按钮，获取你的技术趋势推荐</p>
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
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
                { label: "趋势条目", value: trends.length, color: "text-emerald-400" },
                { label: "覆盖领域", value: domains.length, color: "text-cyan-400" },
                { label: "平均相关度", value: `${Math.round(trends.reduce((s, t) => s + t.relevanceScore, 0) / trends.length)}/10`, color: "text-amber-400" },
                { label: "学习建议", value: trends.filter((t) => t.learningAdvice).length, color: "text-purple-400" },
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

            {/* Domain Filter */}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={activeDomain === null ? "secondary" : "ghost"}
                onClick={() => setActiveDomain(null)}
                className={activeDomain === null ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"}
              >
                全部
              </Button>
              {domains.map((domain) => (
                <Button
                  key={domain}
                  size="sm"
                  variant={activeDomain === domain ? "secondary" : "ghost"}
                  onClick={() => setActiveDomain(domain === activeDomain ? null : domain)}
                  className={activeDomain === domain ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"}
                >
                  {domain}
                </Button>
              ))}
            </div>

            {/* Trends List */}
            <div className="space-y-4">
              {(activeDomain ? groupedByDomain[activeDomain] || [] : trends).map((trend) => (
                <Card
                  key={trend.id}
                  className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge
                            variant="outline"
                            className="bg-emerald-950/30 border-emerald-800/50 text-emerald-400 text-xs"
                          >
                            {trend.domain}
                          </Badge>
                          <h3 className="text-lg font-semibold text-white">{trend.title}</h3>
                        </div>
                        <p className="text-slate-400 text-sm leading-relaxed">{trend.summary}</p>
                      </div>
                      <div className="ml-4 text-right">
                        <div className="text-2xl font-bold text-emerald-400">
                          {trend.relevanceScore}
                        </div>
                        <div className="text-xs text-slate-500">相关度/10</div>
                      </div>
                    </div>

                    <Separator className="my-4 bg-slate-800" />

                    <div className="space-y-4">
                      {trend.keyPoints && (trend.keyPoints as string[]).length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            关键要点
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {(trend.keyPoints as string[]).map((point, i) => (
                              <span
                                key={i}
                                className="px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-sm text-slate-300"
                              >
                                {point}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {trend.learningAdvice && (
                        <div className="rounded-lg bg-emerald-950/20 border border-emerald-800/30 p-4">
                          <h4 className="text-sm font-medium text-emerald-400 mb-1 flex items-center gap-2">
                            <Lightbulb className="h-4 w-4" />
                            学习建议
                          </h4>
                          <p className="text-sm text-slate-300">{trend.learningAdvice}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
