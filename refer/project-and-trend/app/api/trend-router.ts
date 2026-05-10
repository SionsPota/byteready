import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { trendResults, resumes } from "@db/schema";
import { eq } from "drizzle-orm";
import { fetchRealTimeTrends } from "./lib/fetcher";

interface TrendDomain {
  domain: string;
  keywords: string[];
}

const DOMAIN_MAP: Record<string, TrendDomain[]> = {
  frontend: [
    { domain: "React生态", keywords: ["React 19", "Server Components", "concurrent rendering"] },
    { domain: "前端工程化", keywords: ["Vite", "Rspack", "前端性能优化"] },
    { domain: "TypeScript", keywords: ["TypeScript 5.7", "type safety", "TS全栈"] },
  ],
  backend: [
    { domain: "云原生", keywords: ["Kubernetes", "Docker", "微服务架构"] },
    { domain: "Go语言", keywords: ["Go 1.23", "高性能后端", "云原生Go"] },
    { domain: "API设计", keywords: ["REST API", "GraphQL", "gRPC"] },
  ],
  fullstack: [
    { domain: "全栈框架", keywords: ["Next.js", "Nuxt", "全栈TypeScript"] },
    { domain: "Serverless", keywords: ["Serverless架构", "边缘计算", "部署优化"] },
  ],
  ai: [
    { domain: "大模型应用", keywords: ["LLM应用开发", "RAG系统", "AI Agent"] },
    { domain: "MLOps", keywords: ["模型部署", "模型监控", "MLOps实践"] },
    { domain: "AI基础设施", keywords: ["向量数据库", "GPU优化", "AI推理加速"] },
  ],
  data: [
    { domain: "数据工程", keywords: ["实时数据处理", "数据管道", "流处理"] },
    { domain: "数据仓库", keywords: ["数据湖", "湖仓一体", "数据建模"] },
    { domain: "数据分析", keywords: ["数据可视化", "产品分析", "增长分析"] },
  ],
  devops: [
    { domain: "平台工程", keywords: ["Platform Engineering", "IaC", "GitOps"] },
    { domain: "可观测性", keywords: ["可观测性", "链路追踪", "日志分析"] },
    { domain: "云成本优化", keywords: ["FinOps", "云成本管理", "资源优化"] },
  ],
  mobile: [
    { domain: "跨平台开发", keywords: ["Flutter", "React Native", "跨平台框架"] },
    { domain: "原生性能", keywords: ["SwiftUI", "Jetpack Compose", "移动端优化"] },
  ],
  product: [
    { domain: "数据驱动", keywords: ["数据驱动产品", "A/B测试", "产品分析"] },
    { domain: "增长工程", keywords: ["增长黑客", "产品增长", "用户增长"] },
    { domain: "AI产品", keywords: ["AI产品设计", "大模型产品化", "智能产品"] },
  ],
};

function detectDomains(skills: string[], role?: string | null): TrendDomain[] {
  const skillLower = skills.map((s) => s.toLowerCase());
  const detected: TrendDomain[] = [];

  const roleMapping: Record<string, string[]> = {
    frontend: ["frontend", "前端", "front-end", "front end"],
    backend: ["backend", "后端", "back-end", "back end"],
    fullstack: ["fullstack", "全栈", "full-stack", "full stack"],
    ai: ["ai", "机器学习", "深度学习", "algorithm", "算法", "artificial intelligence", "machine learning", "deep learning"],
    data: ["data", "数据", "数据分析", "数据工程", "data engineer", "data scientist"],
    devops: ["devops", "sre", "运维", "平台工程", "infrastructure"],
    mobile: ["mobile", "移动端", "ios", "android", "flutter", "react native"],
    product: ["product", "产品经理", "综合岗", "产品"],
  };

  let matchedRole = role?.toLowerCase() || "";
  if (!matchedRole) {
    for (const [key, aliases] of Object.entries(roleMapping)) {
      if (aliases.some((a) => skillLower.some((s) => s.includes(a)))) {
        matchedRole = key;
        break;
      }
    }
  }

  const domains = DOMAIN_MAP[matchedRole] || DOMAIN_MAP["fullstack"];

  for (const domain of domains) {
    const relevance = domain.keywords.filter((k) =>
      skillLower.some((s) => s.includes(k.toLowerCase()) || k.toLowerCase().includes(s))
    ).length;
    if (relevance > 0 || matchedRole) {
      detected.push(domain);
    }
  }

  if (detected.length === 0) {
    return [...DOMAIN_MAP["fullstack"], ...DOMAIN_MAP["ai"]];
  }

  return detected;
}

// 生成知识库增强的趋势数据
function generateKnowledgeTrends(domains: TrendDomain[], skills: string[]): any[] {
  const mockTrends: any[] = [];
  const trendData: Record<string, { title: string; summary: string; keyPoints: string[]; advice: string }[]> = {
    "React生态": [
      {
        title: "React Server Components 深度集成",
        summary: "RSC从Next.js走向全生态，成为React应用的标准架构模式。服务端组件可显著降低客户端bundle体积。",
        keyPoints: ["Next.js App Router已成为默认推荐", "React 19带来更好的Streaming支持", "服务端组件降低客户端bundle体积40%+"],
        advice: "学习Next.js App Router，理解Server/Client组件的边界划分。阅读Next.js官方文档中的Thinking in Server Components。",
      },
      {
        title: "React Compiler自动优化",
        summary: "React Compiler(原React Forget)进入稳定版，自动处理memoization，开发者无需手动优化。",
        keyPoints: ["无需手动useMemo/useCallback", "编译时优化，运行时零开销", "预计2026年成为CRA/Next默认配置"],
        advice: "关注React Compiler发布动态，准备一个现有项目尝试迁移。可从官方React Compiler Playground开始。",
      },
    ],
    "前端工程化": [
      {
        title: "Rust工具链全面取代JS工具",
        summary: "Rspack、Turbopack、Rolldown等Rust构建工具成为行业标准，构建速度提升10倍。",
        keyPoints: ["Rspack兼容Webpack生态，构建速度提升10倍", "Turbopack在Next.js 15中成为默认", "Rolldown旨在替代Rollup，兼容Vite"],
        advice: "迁移项目到Rspack或等待Vite+rolldown稳定版。可以先从小项目尝试Rspack的配置迁移。",
      },
    ],
    "云原生": [
      {
        title: "平台工程(Post-DevOps时代)",
        summary: "平台工程成为运维新范式，IDP(内部开发平台)成为大厂标配，Backstage快速增长。",
        keyPoints: ["Backstage等IDP框架快速增长", "开发者自助服务成为核心指标", "Golden Path引导最佳实践"],
        advice: "学习Backstage框架，理解平台产品思维。尝试搭建一个内部开发者门户原型。",
      },
    ],
    "大模型应用": [
      {
        title: "Agentic Workflow爆发",
        summary: "AI Agent从概念走向生产，Multi-Agent协作成为主流架构，LangChain/LlamaIndex持续迭代。",
        keyPoints: ["LangChain/LlamaIndex持续迭代", "自主Agent可完成端到端任务", "工具调用(Tool Use)成为标配能力"],
        advice: "学习LangChain/LangGraph框架，实现一个个人AI Agent。可从简单的RAG文档问答开始。",
      },
    ],
    "数据驱动": [
      {
        title: "产品分析民主化",
        summary: "自助式分析工具让产品经理直接操作数据，CDP与分析融合减少数据团队依赖。",
        keyPoints: ["Amplitude/Mixpanel功能增强", "Event-driven analytics成为标准", "CDP(客户数据平台)与分析融合"],
        advice: "学习SQL和产品分析工具，建立数据驱动的产品思维。掌握Amplitude或Mixpanel的使用。",
      },
    ],
  };

  for (const domain of domains) {
    const trends = trendData[domain.domain] || [
      {
        title: `${domain.domain} 2026前沿趋势`,
        summary: `${domain.domain}领域持续演进，${skills.slice(0, 3).join("、")}生态活跃，关注${domain.keywords.slice(0, 2).join("、")}等方向。`,
        keyPoints: [...domain.keywords.map((k) => `${k}持续更新迭代"`), "社区活跃度提升", "企业级应用增多"],
        advice: `关注${domain.domain}领域的技术社区和官方博客，建立持续学习的习惯。推荐参与相关开源项目。`,
      },
    ];

    for (const trend of trends) {
      mockTrends.push({
        domain: domain.domain,
        ...trend,
        relevanceScore: Math.floor(Math.random() * 2) + 8,
        sourceUrl: "https://github.com/trending",
        sourceTitle: `${domain.domain} 知识库`,
      });
    }
  }

  return mockTrends;
}

export const trendRouter = createRouter({
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
      const domains = detectDomains(skills, r.targetRole);

      // 清除旧结果
      await db.delete(trendResults).where(eq(trendResults.resumeId, input.resumeId));

      // 1. 获取实时数据
      const realTimeTrends = await fetchRealTimeTrends(skills);

      // 2. 生成知识库增强的趋势
      const knowledgeTrends = generateKnowledgeTrends(domains, skills);

      // 3. 合并去重
      const allTrends = [...realTimeTrends];
      for (const kt of knowledgeTrends) {
        const exists = allTrends.some(
          (rt) => rt.title.toLowerCase().includes(kt.title.toLowerCase().slice(0, 10))
        );
        if (!exists) {
          allTrends.push(kt);
        }
      }

      // 4. 保存到数据库
      for (const trend of allTrends) {
        await db.insert(trendResults).values({
          resumeId: input.resumeId,
          domain: trend.domain || "综合",
          title: trend.title,
          summary: trend.summary,
          relevanceScore: trend.relevanceScore || 7,
          keyPoints: trend.keyPoints || [],
          learningAdvice: trend.learningAdvice || "",
          sourceUrl: trend.sourceUrl || "",
          sourceTitle: trend.sourceTitle || "",
        });
      }

      await db.update(resumes).set({ status: "ready" }).where(eq(resumes.id, input.resumeId));

      return {
        success: true,
        count: allTrends.length,
        realTimeCount: realTimeTrends.length,
        knowledgeCount: knowledgeTrends.length,
      };
    }),

  getByResume: publicQuery
    .input(z.object({ resumeId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db.select().from(trendResults).where(eq(trendResults.resumeId, input.resumeId));
    }),
});
