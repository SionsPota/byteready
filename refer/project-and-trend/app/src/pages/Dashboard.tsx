import { useState } from "react";
import { useNavigate } from "react-router";
import { useResumes } from "@/hooks/useResumes";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FileText,
  Plus,
  Trash2,
  TrendingUp,
  FolderKanban,
  Loader2,
  Sparkles,
  Tag,
  Clock,
} from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { resumes, isLoading, createResume, isCreating } = useResumes();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [skills, setSkills] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCreate = () => {
    if (!title.trim() || !content.trim()) return;
    const parsedSkills = skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    createResume(
      {
        title,
        content,
        parsedSkills: parsedSkills.length > 0 ? parsedSkills : extractSkills(content),
        targetRole: targetRole || undefined,
        userId: 1,
      },
      {
        onSuccess: () => {
          setTitle("");
          setContent("");
          setSkills("");
          setTargetRole("");
          setDialogOpen(false);
        },
      }
    );
  };

  function extractSkills(text: string): string[] {
    const commonSkills = [
      "JavaScript", "TypeScript", "React", "Vue", "Angular", "Node.js",
      "Python", "Go", "Java", "Rust", "C++", "C#", "PHP", "Ruby",
      "Next.js", "Nuxt", "Express", "Django", "Spring",
      "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch",
      "Docker", "Kubernetes", "AWS", "GCP", "Azure",
      "GraphQL", "REST", "gRPC",
      "TensorFlow", "PyTorch", "Scikit-learn", "Pandas",
      "Flink", "Spark", "Kafka",
      "Flutter", "React Native", "Swift", "Kotlin",
      "Linux", "Git", "CI/CD", "Terraform",
    ];
    const found = commonSkills.filter((skill) =>
      text.toLowerCase().includes(skill.toLowerCase())
    );
    return found.length > 0 ? found : ["JavaScript", "React", "TypeScript"];
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">简历管理</h1>
            <p className="text-slate-400 mt-1">管理你的简历档案，获取智能推荐</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
                <Plus className="h-4 w-4 mr-2" />
                新建简历
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-slate-900 border-slate-800 text-white max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-emerald-400" />
                  新建简历档案
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">简历标题</label>
                  <Input
                    placeholder="如：张三-前端开发工程师"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">目标岗位</label>
                  <Input
                    placeholder="如：Frontend Engineer / Full Stack Developer / 综合岗"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">
                    技能标签（逗号分隔，可选）
                  </label>
                  <Input
                    placeholder="React, TypeScript, Node.js, ..."
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">简历内容</label>
                  <Textarea
                    placeholder="粘贴你的简历内容，包括工作经历、项目经验、技能栈等..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={8}
                    className="bg-slate-800 border-slate-700 text-white resize-none"
                  />
                </div>
                <Button
                  onClick={handleCreate}
                  disabled={!title.trim() || !content.trim() || isCreating}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      创建中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      创建并分析
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          </div>
        ) : resumes.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-slate-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-300 mb-2">暂无简历</h3>
            <p className="text-slate-500 mb-6">上传你的第一份简历，开始智能分析</p>
            <Button
              onClick={() => setDialogOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              创建简历
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {resumes.map((resume) => {
              const skillList = (resume.parsedSkills as string[]) || [];
              return (
                <Card
                  key={resume.id}
                  className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">{resume.title}</h3>
                          <Badge
                            variant="secondary"
                            className={`text-xs ${
                              resume.status === "ready"
                                ? "bg-emerald-950/50 text-emerald-400 border border-emerald-800/50"
                                : resume.status === "analyzing"
                                ? "bg-amber-950/50 text-amber-400 border border-amber-800/50"
                                : "bg-red-950/50 text-red-400 border border-red-800/50"
                            }`}
                          >
                            {resume.status === "ready"
                              ? "就绪"
                              : resume.status === "analyzing"
                              ? "分析中"
                              : "错误"}
                          </Badge>
                        </div>
                        <p className="text-slate-400 text-sm mb-3 line-clamp-2">
                          {resume.content.slice(0, 200)}...
                        </p>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {skillList.slice(0, 8).map((skill) => (
                            <Badge
                              key={skill}
                              variant="outline"
                              className="bg-slate-800/50 border-slate-700 text-slate-300 text-xs"
                            >
                              <Tag className="h-3 w-3 mr-1" />
                              {skill}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {resume.createdAt?.toLocaleDateString?.() || new Date(resume.createdAt).toLocaleDateString()}
                          </span>
                          {resume.targetRole && (
                            <span>目标岗位：{resume.targetRole}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/trends/${resume.id}`)}
                          className="border-emerald-800/50 bg-emerald-950/30 text-emerald-400 hover:bg-emerald-950/50 hover:text-emerald-300"
                        >
                          <TrendingUp className="h-4 w-4 mr-1" />
                          趋势
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/projects/${resume.id}`)}
                          className="border-cyan-800/50 bg-cyan-950/30 text-cyan-400 hover:bg-cyan-950/50 hover:text-cyan-300"
                        >
                          <FolderKanban className="h-4 w-4 mr-1" />
                          项目
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
