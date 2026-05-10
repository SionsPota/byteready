import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { projectResults, resumes } from "@db/schema";
import { eq } from "drizzle-orm";
import { fetchRealTimeProjects } from "./lib/fetcher";

interface SkillGap {
  skill: string;
  category: string;
  importance: number;
}

interface ProjectTemplate {
  name: string;
  type: "quick_win" | "weekend_build" | "deep_dive";
  difficulty: "beginner" | "intermediate" | "advanced";
  timeEstimate: string;
  techStack: string[];
  gapAddressed: string;
  description: string;
  coreFeatures: string[];
  techHighlights: string[];
  implementationSteps: string[];
  resumeTemplate: string;
  impactScore: number;
}

const ROLE_REQUIREMENTS: Record<string, { skills: string[]; gaps: string[] }> = {
  frontend: {
    skills: ["React", "Vue", "TypeScript", "CSS", "性能优化", "设计系统"],
    gaps: ["Server Components", "微前端", "PWA", "无障碍", "国际化"],
  },
  backend: {
    skills: ["API设计", "数据库", "缓存", "消息队列", "分布式系统"],
    gaps: ["高并发", "Kubernetes", "可观测性", "CI/CD", "安全加固"],
  },
  fullstack: {
    skills: ["React/Vue", "Node.js", "数据库", "部署"],
    gaps: ["支付集成", "多租户", "微服务", "实时通信", "SSR"],
  },
  ai: {
    skills: ["Python", "模型训练", "向量数据库", "RAG"],
    gaps: ["MLOps", "模型监控", "A/B测试", "成本优化", "边缘部署"],
  },
  data: {
    skills: ["SQL", "ETL", "数据仓库", "数据建模"],
    gaps: ["流处理", "数据治理", "血缘追踪", "实时分析", "数据质量"],
  },
  devops: {
    skills: ["Kubernetes", "IaC", "CI/CD", "监控"],
    gaps: ["安全扫描", "灾备", "多区域部署", "FinOps", "混沌工程"],
  },
  product: {
    skills: ["数据分析", "SQL", "Python", "A/B测试", "指标设计"],
    gaps: ["实验平台", "因果推断", "产品分析", "数据可视化", "增长工程"],
  },
  mobile: {
    skills: ["Flutter", "React Native", "iOS", "Android"],
    gaps: ["原生性能优化", "跨端一致性", "热更新", "离线功能", "推送系统"],
  },
};

function detectRole(skills: string[]): string {
  const skillLower = skills.map((s) => s.toLowerCase());
  const scores: Record<string, number> = {};

  for (const [role, req] of Object.entries(ROLE_REQUIREMENTS)) {
    scores[role] = req.skills.filter((s) =>
      skillLower.some((skill) => skill.includes(s.toLowerCase()) || s.toLowerCase().includes(skill))
    ).length;
  }

  const maxRole = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return maxRole[0] || "fullstack";
}

function identifyGaps(skills: string[], role: string): SkillGap[] {
  const req = ROLE_REQUIREMENTS[role] || ROLE_REQUIREMENTS["fullstack"];
  const skillLower = skills.map((s) => s.toLowerCase());
  const gaps: SkillGap[] = [];

  for (const gap of req.gaps) {
    const hasSkill = skillLower.some((s) =>
      s.includes(gap.toLowerCase()) || gap.toLowerCase().includes(s)
    );
    if (!hasSkill) {
      gaps.push({
        skill: gap,
        category: "missing",
        importance: 8,
      });
    }
  }

  return gaps;
}

function generateTemplateProjects(gaps: SkillGap[], skills: string[], role: string): ProjectTemplate[] {
  const projects: ProjectTemplate[] = [];

  const roleProjects: Record<string, ProjectTemplate[]> = {
    frontend: [
      {
        name: "可访问性审计工具",
        type: "quick_win",
        difficulty: "intermediate",
        timeEstimate: "6-8小时",
        techStack: ["React", "TypeScript", "axe-core"],
        gapAddressed: "无障碍(Accessibility)",
        description: "构建一个Chrome扩展或Web工具，自动扫描页面可访问性问题并生成修复建议。",
        coreFeatures: ["自动化a11y扫描", "可视化问题标注", "修复建议生成", "WCAG合规评分"],
        techHighlights: ["深入理解ARIA规范和键盘导航", "使用axe-core进行专业级检测", "可量化的可访问性评分体系"],
        implementationSteps: ["搭建React+TypeScript项目", "集成axe-core扫描引擎", "设计问题可视化UI", "实现报告导出功能"],
        resumeTemplate: "独立开发可访问性审计工具，自动化检测WCAG合规问题，帮助团队识别并修复30+可访问性缺陷。",
        impactScore: 8,
      },
      {
        name: "微前端架构演示平台",
        type: "deep_dive",
        difficulty: "advanced",
        timeEstimate: "2-3周",
        techStack: ["React", "Module Federation", "Webpack/Rspack", "TypeScript"],
        gapAddressed: "微前端架构",
        description: "构建一个多技术栈共存的微前端平台，展示独立部署、运行时集成和共享依赖管理。",
        coreFeatures: ["Module Federation模块联邦", "React/Vue/Angular共存", "独立部署CI/CD", "共享设计系统"],
        techHighlights: ["从零搭建微前端架构体系", "解决样式隔离和JS沙箱难题", "实现生产级独立部署流水线"],
        implementationSteps: ["设计微前端架构方案", "搭建Module Federation基座", "集成多技术栈子应用", "实现路由和状态管理"],
        resumeTemplate: "设计并实现微前端架构平台，支持React/Vue/Angular技术栈独立部署与运行时集成，服务10+业务线。",
        impactScore: 9,
      },
    ],
    backend: [
      {
        name: "高并发限流器服务",
        type: "weekend_build",
        difficulty: "intermediate",
        timeEstimate: "12-16小时",
        techStack: ["Go", "Redis", "gRPC", "Docker"],
        gapAddressed: "高并发处理",
        description: "实现分布式令牌桶限流器，支持集群级流量控制和动态限流策略。",
        coreFeatures: ["令牌桶算法实现", "Redis分布式同步", "gRPC高性能通信", "动态限流配置"],
        techHighlights: ["单机10w+ QPS的限流性能", "Redis Lua脚本保证原子性", "滑动窗口算法精准控制"],
        implementationSteps: ["设计限流算法架构", "实现单机令牌桶", "添加Redis分布式支持", "部署Docker容器化"],
        resumeTemplate: "开发分布式限流服务，基于令牌桶算法实现集群级流量控制，支撑10w+ QPS高并发场景。",
        impactScore: 8,
      },
    ],
    ai: [
      {
        name: "RAG文档问答系统",
        type: "deep_dive",
        difficulty: "advanced",
        timeEstimate: "2-3周",
        techStack: ["Python", "LangChain", "ChromaDB", "OpenAI API", "FastAPI"],
        gapAddressed: "RAG系统",
        description: "构建完整的RAG(Retrieval-Augmented Generation)系统，支持文档上传、向量索引和智能问答。",
        coreFeatures: ["文档解析与分块", "向量嵌入与索引", "检索增强生成", "对话历史管理"],
        techHighlights: ["从零搭建完整RAG流水线", "优化Embedding提升检索精度", "实现生产级API服务"],
        implementationSteps: ["搭建FastAPI后端框架", "集成文档解析和分块", "实现向量索引和检索", "对接LLM生成回答"],
        resumeTemplate: "独立开发RAG文档问答系统，支持PDF/Word/Markdown文档的智能检索与问答，检索准确率85%+。",
        impactScore: 9,
      },
    ],
    data: [
      {
        name: "实时数据管道",
        type: "deep_dive",
        difficulty: "advanced",
        timeEstimate: "2-3周",
        techStack: ["Apache Kafka", "Flink", "PostgreSQL", "Docker"],
        gapAddressed: "流处理",
        description: "构建端到端实时数据处理管道，包含数据采集、清洗、聚合和可视化。",
        coreFeatures: ["Kafka消息队列", "Flink实时计算", "数据清洗ETL", "实时仪表盘"],
        techHighlights: ["秒级延迟的实时数据处理", "Exactly-once语义保障", "水平扩展的流处理架构"],
        implementationSteps: ["搭建Kafka集群", "开发Flink流处理作业", "实现数据清洗逻辑", "构建实时监控看板"],
        resumeTemplate: "设计实时数据处理管道，基于Kafka+Flink实现秒级数据清洗与聚合，支撑百万级日活数据分析。",
        impactScore: 9,
      },
    ],
    product: [
      {
        name: "产品增长实验平台",
        type: "deep_dive",
        difficulty: "intermediate",
        timeEstimate: "2周",
        techStack: ["Python", "Streamlit", "PostgreSQL", "统计模型"],
        gapAddressed: "A/B测试与增长",
        description: "构建产品实验平台，支持A/B测试设计、流量分配、结果分析和置信度计算。",
        coreFeatures: ["实验设计与创建", "动态流量分配", "统计显著性计算", "实验报告自动生成"],
        techHighlights: ["完整的实验统计方法论", "防止AA测试偏差的校验机制", "可视化实验配置和结果"],
        implementationSteps: ["设计实验数据模型", "实现流量分配算法", "开发统计分析模块", "构建可视化仪表盘"],
        resumeTemplate: "构建产品增长实验平台，支持A/B测试全流程管理，服务产品团队每月10+实验的高效迭代。",
        impactScore: 9,
      },
    ],
  };

  const defaultProjects: ProjectTemplate[] = [
    {
      name: "个人技术博客系统",
      type: "weekend_build",
      difficulty: "intermediate",
      timeEstimate: "1-2周",
      techStack: ["Next.js", "TypeScript", "Tailwind CSS", "PostgreSQL"],
      gapAddressed: "全栈工程能力",
      description: "构建功能完善的SSG技术博客，支持Markdown渲染、标签分类、全文搜索和评论系统。",
      coreFeatures: ["SSG静态生成", "Markdown渲染", "标签和分类", "全文搜索", "暗色模式"],
      techHighlights: ["Next.js App Router深度实践", "Contentlayer类型安全的内容管理", "Lighthouse评分95+"],
      implementationSteps: ["设计数据库Schema", "搭建Next.js项目", "实现博客内容管理", "部署到Vercel/Netlify"],
      resumeTemplate: "独立开发全栈技术博客系统，基于Next.js App Router实现SSG，支持Markdown渲染和全文搜索。",
      impactScore: 7,
    },
  ];

  const specificProjects = roleProjects[role] || [];
  projects.push(...specificProjects, ...defaultProjects);

  // 根据缺口调整推荐
  if (gaps.length > 0) {
    const gapNames = gaps.map((g) => g.skill);
    projects.forEach((p) => {
      const matchCount = gapNames.filter((g) =>
        p.gapAddressed.includes(g) || g.includes(p.gapAddressed)
      ).length;
      if (matchCount > 0) {
        p.impactScore = Math.min(10, p.impactScore + 1);
      }
    });
  }

  return projects;
}

export const projectRouter = createRouter({
  analyze: publicQuery
    .input(z.object({ resumeId: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const resume = await db.select().from(resumes).where(eq(resumes.id, input.resumeId));
      if (!resume[0]) {
        return { success: false, error: "Resume not found" };
      }

      const r = resume[0];
      const skills = (r.parsedSkills as string[]) || [];
      const role = detectRole(skills);
      const gaps = identifyGaps(skills, role);

      // 清除旧结果
      await db.delete(projectResults).where(eq(projectResults.resumeId, input.resumeId));

      // 1. 获取实时GitHub项目数据
      const realTimeProjects = await fetchRealTimeProjects(skills, role);

      // 2. 生成知识库模板项目
      const templateProjects = generateTemplateProjects(gaps, skills, role);

      // 3. 合并去重（优先保留实时数据）
      const allProjects = [...realTimeProjects];
      for (const tp of templateProjects) {
        const exists = allProjects.some(
          (rp) => rp.name.toLowerCase().includes(tp.name.toLowerCase().slice(0, 8))
        );
        if (!exists) {
          allProjects.push(tp);
        }
      }

      // 4. 保存到数据库
      for (const project of allProjects) {
        await db.insert(projectResults).values({
          resumeId: input.resumeId,
          name: project.name,
          projectType: project.type,
          difficulty: project.difficulty,
          timeEstimate: project.timeEstimate,
          techStack: project.techStack,
          gapAddressed: project.gapAddressed,
          description: project.description,
          coreFeatures: project.coreFeatures,
          techHighlights: project.techHighlights,
          implementationSteps: project.implementationSteps,
          resumeTemplate: project.resumeTemplate,
          impactScore: project.impactScore,
        });
      }

      return {
        success: true,
        count: allProjects.length,
        realTimeCount: realTimeProjects.length,
        templateCount: templateProjects.length,
        role,
        gaps: gaps.map((g) => g.skill),
      };
    }),

  getByResume: publicQuery
    .input(z.object({ resumeId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db.select().from(projectResults).where(eq(projectResults.resumeId, input.resumeId));
    }),
});
