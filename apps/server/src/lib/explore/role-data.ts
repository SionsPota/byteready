// 角色技能图谱与领域映射，用于探索模块的趋势/项目推荐。
// 数据形状参考 refer/project-and-trend/app/api/{project,trend}-router.ts；
// V1 仅做静态映射占位，留接口给 V2 替换为 LLM/RAG 实现。

export const ROLE_KEYS = [
  'frontend',
  'backend',
  'fullstack',
  'ai',
  'data',
  'devops',
  'mobile',
  'product',
] as const
export type RoleKey = (typeof ROLE_KEYS)[number]

export interface RoleRequirement {
  skills: string[]
  gaps: string[]
}

export const ROLE_REQUIREMENTS: Record<RoleKey, RoleRequirement> = {
  frontend: {
    skills: ['React', 'Vue', 'TypeScript', 'CSS', '性能优化', '设计系统'],
    gaps: ['Server Components', '微前端', 'PWA', '无障碍', '国际化'],
  },
  backend: {
    skills: ['API设计', '数据库', '缓存', '消息队列', '分布式系统'],
    gaps: ['高并发', 'Kubernetes', '可观测性', 'CI/CD', '安全加固'],
  },
  fullstack: {
    skills: ['React', 'Node.js', '数据库', '部署'],
    gaps: ['支付集成', '多租户', '微服务', '实时通信', 'SSR'],
  },
  ai: {
    skills: ['Python', '模型训练', '向量数据库', 'RAG'],
    gaps: ['MLOps', '模型监控', 'A/B测试', '成本优化', '边缘部署'],
  },
  data: {
    skills: ['SQL', 'ETL', '数据仓库', '数据建模'],
    gaps: ['流处理', '数据治理', '血缘追踪', '实时分析', '数据质量'],
  },
  devops: {
    skills: ['Kubernetes', 'IaC', 'CI/CD', '监控'],
    gaps: ['安全扫描', '灾备', '多区域部署', 'FinOps', '混沌工程'],
  },
  mobile: {
    skills: ['Flutter', 'React Native', 'iOS', 'Android'],
    gaps: ['原生性能优化', '跨端一致性', '热更新', '离线功能', '推送系统'],
  },
  product: {
    skills: ['数据分析', 'SQL', 'Python', 'A/B测试', '指标设计'],
    gaps: ['实验平台', '因果推断', '产品分析', '数据可视化', '增长工程'],
  },
}

// 角色别名（中英对照、复合写法）。用于 detectRole 时做模糊匹配。
export const ROLE_ALIASES: Record<RoleKey, string[]> = {
  frontend: ['frontend', '前端', 'front-end', 'front end', 'web', 'react', 'vue'],
  backend: ['backend', '后端', 'back-end', 'back end', 'server', 'java', 'go', 'golang'],
  fullstack: ['fullstack', '全栈', 'full-stack', 'full stack'],
  ai: ['ai', '机器学习', '深度学习', 'algorithm', '算法', 'machine learning', 'deep learning', 'llm'],
  data: ['data', '数据', '数据分析', '数据工程', 'data engineer', 'data scientist'],
  devops: ['devops', 'sre', '运维', '平台工程', 'infrastructure'],
  mobile: ['mobile', '移动端', 'ios', 'android', 'flutter', 'react native'],
  product: ['product', '产品经理', '综合岗', '产品'],
}

export interface TrendDomain {
  domain: string
  keywords: string[]
}

export const DOMAIN_MAP: Record<RoleKey, TrendDomain[]> = {
  frontend: [
    { domain: 'React生态', keywords: ['React 19', 'Server Components', 'concurrent rendering'] },
    { domain: '前端工程化', keywords: ['Vite', 'Rspack', '前端性能优化'] },
    { domain: 'TypeScript', keywords: ['TypeScript 5.7', 'type safety', 'TS全栈'] },
  ],
  backend: [
    { domain: '云原生', keywords: ['Kubernetes', 'Docker', '微服务架构'] },
    { domain: 'Go语言', keywords: ['Go 1.23', '高性能后端', '云原生Go'] },
    { domain: 'API设计', keywords: ['REST API', 'GraphQL', 'gRPC'] },
  ],
  fullstack: [
    { domain: '全栈框架', keywords: ['Next.js', 'Nuxt', '全栈TypeScript'] },
    { domain: 'Serverless', keywords: ['Serverless架构', '边缘计算', '部署优化'] },
  ],
  ai: [
    { domain: '大模型应用', keywords: ['LLM应用开发', 'RAG系统', 'AI Agent'] },
    { domain: 'MLOps', keywords: ['模型部署', '模型监控', 'MLOps实践'] },
    { domain: 'AI基础设施', keywords: ['向量数据库', 'GPU优化', 'AI推理加速'] },
  ],
  data: [
    { domain: '数据工程', keywords: ['实时数据处理', '数据管道', '流处理'] },
    { domain: '数据仓库', keywords: ['数据湖', '湖仓一体', '数据建模'] },
    { domain: '数据分析', keywords: ['数据可视化', '产品分析', '增长分析'] },
  ],
  devops: [
    { domain: '平台工程', keywords: ['Platform Engineering', 'IaC', 'GitOps'] },
    { domain: '可观测性', keywords: ['可观测性', '链路追踪', '日志分析'] },
    { domain: '云成本优化', keywords: ['FinOps', '云成本管理', '资源优化'] },
  ],
  mobile: [
    { domain: '跨平台开发', keywords: ['Flutter', 'React Native', '跨平台框架'] },
    { domain: '原生性能', keywords: ['SwiftUI', 'Jetpack Compose', '移动端优化'] },
  ],
  product: [
    { domain: '数据驱动', keywords: ['数据驱动产品', 'A/B测试', '产品分析'] },
    { domain: '增长工程', keywords: ['增长黑客', '产品增长', '用户增长'] },
    { domain: 'AI产品', keywords: ['AI产品设计', '大模型产品化', '智能产品'] },
  ],
}
