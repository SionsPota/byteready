import type { DemoAccount } from './seed.ts'

const U = 'a1111111-1111-4111-a111-111111111111'
const R = 'a1111111-1111-4111-a111-111111111112'
const P1 = 'a1111111-1111-4111-a111-111111111121'
const P2 = 'a1111111-1111-4111-a111-111111111122'
const P3 = 'a1111111-1111-4111-a111-111111111123'

// ====== User / Resume / Projects ======

const user = {
  id: U,
  email: 'demo-frontend@byteready.com',
  name: '陈明远',
  password: 'demo123',
}

const resume = {
  id: R,
  title: '陈明远-前端工程师',
  rawText: `陈明远
前端工程师 | 3年经验
手机：138-0000-0001 | 邮箱：chenmingyuan@example.com | 北京

【教育背景】
北京大学 | 软件工程 | 本科 | 2019.09 - 2023.06

【工作经历】
字节跳动 | 前端开发工程师 | 2023.07 - 至今
- 负责电商中台系统前端架构设计与核心模块开发
- 主导微前端架构改造，将单体应用拆分为5个独立子应用
- 推动前端工程化建设，搭建CI/CD流水线与组件库

美团 | 前端实习生 | 2022.06 - 2022.12
- 参与商家后台管理系统开发
- 负责表单配置化引擎的前端实现

【项目经历】
1. 电商中台系统（React + TypeScript + Micro-frontend）
   - 设计并实现基于 Module Federation 的微前端架构
   - 统一状态管理方案，封装通用数据流 hooks
   - 首屏加载时间从 4.2s 优化至 1.8s

2. 低代码表单引擎（Vue3 + Vite）
   - 实现拖拽式表单设计器，支持20+种表单组件
   - 设计JSON Schema协议，实现表单配置的序列化与反序列化
   - 支持条件渲染、动态校验、联动逻辑等高级特性

3. 实时数据大屏（WebSocket + ECharts）
   - 开发实时数据可视化大屏，支持WebSocket推送
   - 实现图表联动、下钻分析、实时告警等交互
   - 处理高频数据更新（每秒500+数据点）的性能优化

【技术栈】
React / Vue3 / TypeScript / Webpack / Vite / Node.js / Micro-frontend / ECharts / WebSocket`,
  sourceFormat: 'paste' as const,
  contactName: '陈明远',
  contactEmail: 'chenmingyuan@example.com',
  contactPhone: '138-0000-0001',
  contactLocation: '北京',
  summary: '3年前端开发经验，擅长React生态与微前端架构，有完整的电商中台系统建设经验。关注性能优化与工程化实践。',
  educations: [{ school: '北京大学', major: '软件工程', degree: '本科', period: '2019.09 - 2023.06' }],
  experiences: [
    { company: '字节跳动', title: '前端开发工程师', period: '2023.07 - 至今', description: '负责电商中台系统前端架构设计与核心模块开发' },
    { company: '美团', title: '前端实习生', period: '2022.06 - 2022.12', description: '参与商家后台管理系统开发' },
  ],
  skills: [
    { name: 'React', level: '精通' },
    { name: 'TypeScript', level: '精通' },
    { name: 'Vue3', level: '熟练' },
    { name: 'Webpack/Vite', level: '熟练' },
    { name: 'Node.js', level: '了解' },
  ],
}

const projects = [
  {
    id: P1,
    name: '电商中台系统',
    period: '2023.08 - 2024.06',
    role: '前端负责人',
    summary: '基于Module Federation的微前端电商中台，支撑日均千万级GMV',
    keywords: ['React', 'TypeScript', 'Micro-frontend', 'Webpack', '性能优化'],
  },
  {
    id: P2,
    name: '低代码表单引擎',
    period: '2024.01 - 2024.09',
    role: '核心开发',
    summary: '拖拽式表单设计器，支持20+组件，JSON Schema驱动的配置化方案',
    keywords: ['Vue3', 'Vite', 'JSON Schema', '拖拽', '低代码'],
  },
  {
    id: P3,
    name: '实时数据大屏',
    period: '2024.06 - 2024.12',
    role: '前端开发',
    summary: 'WebSocket实时推送的数据可视化大屏，处理高频数据更新',
    keywords: ['WebSocket', 'ECharts', 'Canvas', '性能优化', '实时数据'],
  },
]

// ====== Helper: timestamp ======
const T = (s: string) => new Date(s).getTime()

// ====== Helper: score builder ======
function scores(
  prof: number,
  proj: number,
  expr: number,
  logic: number,
  comm: number,
): Array<{ dimension: string; score: number; weight: number; weighted: number }> {
  const dims = ['专业知识深度', '项目复述质量', '表达与结构', '逻辑与问题解决', '沟通自然度']
  const vals = [prof, proj, expr, logic, comm]
  return dims.map((d, i) => {
    const v = vals[i] ?? 0
    return { dimension: d, score: v, weight: 0.2, weighted: +(v * 0.2).toFixed(3) }
  })
}

function total(scoresArr: ReturnType<typeof scores>): number {
  return +scoresArr.reduce((s, v) => s + v.weighted, 0).toFixed(2)
}

// ====== Session 1: 整面 #1 (低分 2.5) ======
const S1 = 'f0000001-0000-4000-a000-000000000001'
const s1 = {
  id: S1,
  type: 'full' as const,
  position: 'frontend',
  targetCompany: '字节跳动',
  jobDescription: '高级前端工程师，负责抖音电商业务前端架构',
  status: 'ended' as const,
  currentState: 'END',
  startedAt: T('2026-05-03T10:00:00'),
  endedAt: T('2026-05-03T10:25:00'),
  createdAt: T('2026-05-03T09:55:00'),
  turns: [
    { kind: 'system' as const, text: '你好，我是今天的面试官。请先做个简单的自我介绍。', phase: 'self_intro', state: 'SELF_INTRO' },
    { kind: 'interviewer_main' as const, text: '你好，我是今天的面试官。请先做个简单的自我介绍。', phase: 'self_intro', state: 'SELF_INTRO' },
    { kind: 'candidate' as const, text: '呃...我叫陈明远，北大毕业的，学软件的。现在在字节做前端，大概三年了。做过一些项目，像电商中台什么的。技术栈主要是React和Vue，也会一些TypeScript。就这些吧。', phase: 'self_intro', state: 'SELF_INTRO' },
    { kind: 'interviewer_main' as const, text: '感谢你的介绍。接下来请介绍一下你的项目经历，我们先从你最有代表性的项目开始。', phase: 'self_intro', state: 'SELF_INTRO' },
    { kind: 'candidate' as const, text: '好的，我来说一下电商中台吧。这个项目主要是给公司内部用的，前端用了React，后端是Java。我负责前端部分，做了一些页面和组件。然后后来我们改成了微前端，用的是Webpack的Module Federation。', phase: 'project_single', state: 'PROJECT_SINGLE_1', projectId: P1 },
    { kind: 'interviewer_followup' as const, text: '你提到用Module Federation做了微前端拆分，能具体说说你们是怎么拆分的吗？比如按什么维度？', phase: 'project_single', state: 'PROJECT_SINGLE_1', projectId: P1 },
    { kind: 'candidate' as const, text: '嗯...就是按照业务模块拆的，比如商品、订单、库存这些。每个模块一个独立的仓库，然后打包后通过Module Federation共享出来。', phase: 'project_single', state: 'PROJECT_SINGLE_1', projectId: P1 },
    { kind: 'interviewer_followup' as const, text: '那在拆分过程中遇到的最大挑战是什么？', phase: 'project_single', state: 'PROJECT_SINGLE_1', projectId: P1 },
    { kind: 'candidate' as const, text: '挑战啊...主要是一些公共依赖的版本管理吧，有时候不同模块用的React版本不一样会出问题。还有就是样式隔离，有时候会冲突。', phase: 'project_single', state: 'PROJECT_SINGLE_1', projectId: P1 },
    { kind: 'interviewer_main' as const, text: '好的，我们再聊聊另一个项目。', phase: 'project_single', state: 'PROJECT_SINGLE_2' },
    { kind: 'candidate' as const, text: '另一个项目是低代码表单引擎，用Vue3做的。主要是让用户可以拖拽组件来生成表单，不用写代码。', phase: 'project_single', state: 'PROJECT_SINGLE_2', projectId: P2 },
    { kind: 'interviewer_followup' as const, text: '表单引擎的校验逻辑是怎么实现的？', phase: 'project_single', state: 'PROJECT_SINGLE_2', projectId: P2 },
    { kind: 'candidate' as const, text: '校验就是用的VeeValidate，配合自定义规则。每个组件可以配自己的校验规则，然后提交的时候统一校验。', phase: 'project_single', state: 'PROJECT_SINGLE_2', projectId: P2 },
    { kind: 'interviewer_main' as const, text: '很好。现在我想把几个项目放在一起对比着问问。', phase: 'project_cross', state: 'PROJECT_CROSS' },
    { kind: 'candidate' as const, text: '好的。', phase: 'project_cross', state: 'PROJECT_CROSS' },
    { kind: 'interviewer_followup' as const, text: '你在电商中台和数据大屏两个项目中都涉及了性能优化，能对比一下两个场景下的优化策略有什么不同吗？', phase: 'project_cross', state: 'PROJECT_CROSS' },
    { kind: 'candidate' as const, text: '电商中台主要是减少打包体积，用了代码分割和懒加载。数据大屏是数据量大，所以用了虚拟滚动和节流。', phase: 'project_cross', state: 'PROJECT_CROSS' },
    { kind: 'interviewer_main' as const, text: '项目部分我们就聊到这里。接下来进入技术问答环节。', phase: 'q_and_a', state: 'QNA_TECH' },
    { kind: 'candidate' as const, text: '好的。', phase: 'q_and_a', state: 'QNA_TECH' },
    { kind: 'interviewer_main' as const, text: '请说说React的useEffect依赖数组的作用，以及常见的陷阱。', phase: 'q_and_a', state: 'QNA_TECH', topic: 'bagua' },
    { kind: 'candidate' as const, text: 'useEffect的依赖数组用来控制副作用的执行时机，当依赖变化时才会执行。陷阱...有时候闭包问题会导致拿不到最新的值，还有就是忘记加依赖会不执行。', phase: 'q_and_a', state: 'QNA_TECH', topic: 'bagua' },
    { kind: 'interviewer_main' as const, text: '基础概念掌握得不错。我们来看一道算法题。', phase: 'q_and_a', state: 'QNA_ALGO' },
    { kind: 'candidate' as const, text: '好的。', phase: 'q_and_a', state: 'QNA_ALGO' },
    { kind: 'interviewer_main' as const, text: '请实现一个函数，判断两个字符串是否互为字母异位词。', phase: 'q_and_a', state: 'QNA_ALGO', topic: 'algorithm' },
    { kind: 'candidate' as const, text: '可以用一个Map来统计字符出现次数。先遍历第一个字符串增加计数，再遍历第二个字符串减少计数，最后检查是否所有计数都为0。', phase: 'q_and_a', state: 'QNA_ALGO', topic: 'algorithm' },
    { kind: 'interviewer_main' as const, text: '算法部分聊完了。我们来聊一个场景设计题。', phase: 'q_and_a', state: 'QNA_SCENE' },
    { kind: 'candidate' as const, text: '好的。', phase: 'q_and_a', state: 'QNA_SCENE' },
    { kind: 'interviewer_main' as const, text: '设计一个支持百万级用户同时在线的实时聊天系统前端架构。', phase: 'q_and_a', state: 'QNA_SCENE', topic: 'scene' },
    { kind: 'candidate' as const, text: '前端可以用WebSocket连到服务端，消息用虚拟列表渲染，只渲染视口内的消息。图片和文件用懒加载。', phase: 'q_and_a', state: 'QNA_SCENE', topic: 'scene' },
    { kind: 'system' as const, text: '今天的面试就到这里，感谢你的时间。', phase: 'q_and_a', state: 'END' },
  ],
  phaseReviews: [
    {
      phaseType: 'self_intro' as const, phaseIndex: 0,
      scores: scores(2.0, 2.0, 2.5, 2.0, 2.5),
      totalScore: total(scores(2.0, 2.0, 2.5, 2.0, 2.5)),
      evaluation: '自我介绍过于简略，缺乏重点突出。没有清晰的时间线和成果量化，技术亮点挖掘不足。建议准备1-2分钟的结构化自我介绍模板。',
      interviewerReflection: '候选人明显没有充分准备，回答时频繁停顿，内容流于表面。',
      improvementSuggestions: [
        { priority: 'high' as const, suggestion: '准备STAR法则的自我介绍框架：背景-职责-成果-技术栈' },
        { priority: 'medium' as const, suggestion: '量化成果，如"首屏从4.2s优化到1.8s"' },
        { priority: 'medium' as const, suggestion: '增加对目标岗位匹配度的表达' },
      ],
    },
    {
      phaseType: 'project_qa' as const, phaseIndex: 1,
      scores: scores(2.5, 2.5, 2.5, 2.5, 3.0),
      totalScore: total(scores(2.5, 2.5, 2.5, 2.5, 3.0)),
      evaluation: '项目描述停留在表层，缺乏技术深度。面对追问时只能回答"用了什么技术"，而无法解释"为什么选这个技术"和"遇到了什么坑"。',
      interviewerReflection: '候选人对项目有一定了解，但缺乏系统性思考和复盘能力。',
      improvementSuggestions: [
        { priority: 'high' as const, suggestion: '每个项目准备3个技术难点及解决方案' },
        { priority: 'high' as const, suggestion: '对比不同技术选型的利弊，展示架构思考' },
        { priority: 'medium' as const, suggestion: '量化项目成果和业务价值' },
      ],
    },
    {
      phaseType: 'random_qa' as const, phaseIndex: 2,
      scores: scores(3.0, 2.5, 3.0, 2.5, 3.0),
      totalScore: total(scores(3.0, 2.5, 3.0, 2.5, 3.0)),
      evaluation: '基础概念有一定掌握，但算法题只给出思路没有写代码。场景设计题缺乏系统性，没有从需求分析、架构选型到扩展性逐步展开。',
      interviewerReflection: '候选人基础知识尚可，但编码能力和系统设计思维需要加强。',
      improvementSuggestions: [
        { priority: 'high' as const, suggestion: '算法题要动手写出完整代码，包括边界条件处理' },
        { priority: 'high' as const, suggestion: '系统设计使用结构化框架：需求→约束→架构→扩展→容错' },
        { priority: 'medium' as const, suggestion: '多刷LeetCode中等难度题目' },
      ],
    },
  ],
  fullReview: {
    phaseScoresSummary: [
      { phaseType: 'self_intro', score: total(scores(2.0, 2.0, 2.5, 2.0, 2.5)), duration: 3 },
      { phaseType: 'project_qa', score: total(scores(2.5, 2.5, 2.5, 2.5, 3.0)), duration: 12 },
      { phaseType: 'random_qa', score: total(scores(3.0, 2.5, 3.0, 2.5, 3.0)), duration: 10 },
    ],
    coherenceScore: 2.5,
    jdMatchScore: 2.5,
    overallPersona: '有一定前端经验但准备不充分的候选人，需要系统性提升面试表达和技术深度。',
    consolidatedImprovements: [
      { priority: 'high' as const, sourcePhases: ['self_intro', 'project_qa'], suggestion: '准备结构化自我介绍和项目深度复盘材料' },
      { priority: 'high' as const, sourcePhases: ['random_qa'], suggestion: '加强算法编码和系统设计的系统性训练' },
      { priority: 'medium' as const, sourcePhases: ['project_qa'], suggestion: '量化项目成果，提升表达说服力' },
    ],
    overallEvaluation: '本次面试整体表现偏弱。候选人有一定前端开发经验，但在面试表达、技术深度和系统性思考方面存在明显短板。建议在面试准备、项目复盘和算法训练上投入更多时间。',
    overallScore: 2.5,
  },
}

// ====== Session 2: 整面 #2 (中分 3.2) ======
const S2 = 'f0000002-0000-4000-a000-000000000002'
const s1ScoresMed = scores(3.0, 3.2, 3.0, 3.2, 3.5)
const s2ProjScoresMed = scores(3.2, 3.5, 3.0, 3.2, 3.5)
const s2QnaScoresMed = scores(3.5, 3.0, 3.2, 3.2, 3.5)
const s2 = {
  id: S2,
  type: 'full' as const,
  position: 'frontend',
  targetCompany: '阿里巴巴',
  jobDescription: 'P6前端工程师，负责淘宝营销活动搭建平台',
  status: 'ended' as const,
  currentState: 'END',
  startedAt: T('2026-05-05T14:00:00'),
  endedAt: T('2026-05-05T14:28:00'),
  createdAt: T('2026-05-05T13:55:00'),
  turns: [
    { kind: 'system' as const, text: '你好，我是今天的面试官。请先做个简单的自我介绍。', phase: 'self_intro', state: 'SELF_INTRO' },
    { kind: 'interviewer_main' as const, text: '你好，我是今天的面试官。请先做个简单的自我介绍。', phase: 'self_intro', state: 'SELF_INTRO' },
    { kind: 'candidate' as const, text: '面试官好，我叫陈明远，北京大学软件工程专业本科毕业，目前在字节跳动担任前端开发工程师，主要负责电商中台系统的前端架构与核心模块开发。我在前端领域有3年经验，技术栈以React和TypeScript为主，同时也熟悉Vue3生态。最近比较关注微前端架构和前端性能优化方向。', phase: 'self_intro', state: 'SELF_INTRO' },
    { kind: 'interviewer_main' as const, text: '感谢你的介绍。接下来请介绍一下你的项目经历，我们先从你最有代表性的项目开始。', phase: 'self_intro', state: 'SELF_INTRO' },
    { kind: 'candidate' as const, text: '好的，我重点介绍电商中台系统。这是一个支撑抖音电商业务的核心中台，日均GMV千万级。我作为前端负责人，主导了从单体应用到微前端架构的改造。我们采用Webpack Module Federation方案，按业务域拆分为商品中心、订单中心、库存中心等5个独立子应用。改造后，各团队可以独立开发部署，发布周期从两周缩短到两天。', phase: 'project_single', state: 'PROJECT_SINGLE_1', projectId: P1 },
    { kind: 'interviewer_followup' as const, text: '微前端拆分过程中，公共依赖的版本管理你是怎么解决的？', phase: 'project_single', state: 'PROJECT_SINGLE_1', projectId: P1 },
    { kind: 'candidate' as const, text: '我们采用了shared配置来共享React、ReactDOM等核心依赖，并统一了版本号。同时自建了一个依赖管控平台，自动检测各子应用的依赖版本冲突。对于样式隔离，我们使用CSS Modules + BEM命名规范，避免了全局污染。', phase: 'project_single', state: 'PROJECT_SINGLE_1', projectId: P1 },
    { kind: 'interviewer_followup' as const, text: '首屏加载时间从4.2s优化到1.8s，具体做了哪些事情？', phase: 'project_single', state: 'PROJECT_SINGLE_1', projectId: P1 },
    { kind: 'candidate' as const, text: '主要做了四件事：一是路由懒加载，将非首屏路由拆分为独立chunk；二是组件库按需引入，从全量引入改为babel-plugin-import按需加载；三是启用Brotli压缩和CDN静态资源加速；四是实施SSR预渲染，对核心页面做服务端渲染。其中路由懒加载贡献了最大的收益，大约减少了60%的首屏JS体积。', phase: 'project_single', state: 'PROJECT_SINGLE_1', projectId: P1 },
    { kind: 'interviewer_main' as const, text: '好的，我们再聊聊另一个项目。', phase: 'project_single', state: 'PROJECT_SINGLE_2' },
    { kind: 'candidate' as const, text: '我再介绍一下低代码表单引擎。这个项目的目标是让运营同学可以通过拖拽组件的方式快速搭建表单页面，而不需要前端介入。技术栈是Vue3 + Vite。我负责核心设计器的实现，包括拖拽画布、组件物料库、属性配置面板和JSON Schema引擎四个核心模块。', phase: 'project_single', state: 'PROJECT_SINGLE_2', projectId: P2 },
    { kind: 'interviewer_followup' as const, text: 'JSON Schema的校验联动逻辑是怎么设计的？比如A字段的值影响B字段的显示和校验规则。', phase: 'project_single', state: 'PROJECT_SINGLE_2', projectId: P2 },
    { kind: 'candidate' as const, text: '我们设计了一套声明式的联动协议。每个字段可以定义dependencies，指定依赖字段、条件和响应动作。比如当A字段等于"其他"时，显示B字段并启用必填校验。引擎会构建依赖图，当字段变化时按拓扑序触发联动。我们还支持跨表单联动和异步数据源联动。', phase: 'project_single', state: 'PROJECT_SINGLE_2', projectId: P2 },
    { kind: 'interviewer_main' as const, text: '很好。现在我想把几个项目放在一起对比着问问。', phase: 'project_cross', state: 'PROJECT_CROSS' },
    { kind: 'candidate' as const, text: '好的。', phase: 'project_cross', state: 'PROJECT_CROSS' },
    { kind: 'interviewer_followup' as const, text: '电商中台用了React，表单引擎用了Vue3，如果让你把表单引擎迁移到React生态，你会怎么设计？', phase: 'project_cross', state: 'PROJECT_CROSS' },
    { kind: 'candidate' as const, text: '迁移到React的话，我会选择React DnD或@dnd-kit做拖拽引擎，状态管理用Zustand替代Vuex。组件渲染层用函数组件+Hooks。不过最大的挑战是Vue的响应式系统和React的单向数据流差异较大，需要重构表单数据流。我会先抽象一层平台无关的core层，包含Schema解析、校验引擎和联动逻辑，然后分别适配React和Vue的渲染层。', phase: 'project_cross', state: 'PROJECT_CROSS' },
    { kind: 'interviewer_main' as const, text: '项目部分我们就聊到这里。接下来进入技术问答环节。', phase: 'q_and_a', state: 'QNA_TECH' },
    { kind: 'candidate' as const, text: '好的。', phase: 'q_and_a', state: 'QNA_TECH' },
    { kind: 'interviewer_main' as const, text: 'React 18的Concurrent Features你了解多少？Suspense和Transition分别解决什么问题？', phase: 'q_and_a', state: 'QNA_TECH', topic: 'bagua' },
    { kind: 'candidate' as const, text: 'Concurrent Features是React 18引入的并发渲染能力。Suspense主要解决异步数据加载的声明式处理，以前需要在useEffect里手动管理loading状态，现在可以用Suspense边界包裹异步组件，配合fallback UI实现优雅的加载体验。useTransition用于标记非紧急更新，比如搜索建议列表的更新可以标记为transition，避免阻塞输入框的响应。', phase: 'q_and_a', state: 'QNA_TECH', topic: 'bagua' },
    { kind: 'interviewer_main' as const, text: '基础概念掌握得不错。我们来看一道算法题。', phase: 'q_and_a', state: 'QNA_ALGO' },
    { kind: 'candidate' as const, text: '好的。', phase: 'q_and_a', state: 'QNA_ALGO' },
    { kind: 'interviewer_main' as const, text: '实现一个LRU缓存，要求get和put操作都是O(1)。', phase: 'q_and_a', state: 'QNA_ALGO', topic: 'algorithm' },
    { kind: 'candidate' as const, text: '可以用HashMap + 双向链表实现。HashMap存储key到链表节点的映射，双向链表按访问顺序维护节点，头部是最新访问的，尾部是最久未访问的。get时通过HashMap找到节点，移到链表头部。put时如果容量满了，删除尾部节点，再插入新节点到头部。', phase: 'q_and_a', state: 'QNA_ALGO', topic: 'algorithm' },
    { kind: 'interviewer_main' as const, text: '算法部分聊完了。我们来聊一个场景设计题。', phase: 'q_and_a', state: 'QNA_SCENE' },
    { kind: 'candidate' as const, text: '好的。', phase: 'q_and_a', state: 'QNA_SCENE' },
    { kind: 'interviewer_main' as const, text: '设计一个前端错误监控和报警系统。', phase: 'q_and_a', state: 'QNA_SCENE', topic: 'scene' },
    { kind: 'candidate' as const, text: '我会从三个层面设计：采集层、处理层和展示层。采集层用window.onerror和window.addEventListener("unhandledrejection")捕获JS错误，用PerformanceObserver采集性能数据，采样上报避免影响业务。处理层接收上报数据，做错误去重、聚合和分级。展示层提供错误列表、趋势图表、错误详情和告警规则配置。告警可以按错误率阈值或P99延迟触发。', phase: 'q_and_a', state: 'QNA_SCENE', topic: 'scene' },
    { kind: 'system' as const, text: '今天的面试就到这里，感谢你的时间。', phase: 'q_and_a', state: 'END' },
  ],
  phaseReviews: [
    {
      phaseType: 'self_intro' as const, phaseIndex: 0,
      scores: s1ScoresMed,
      totalScore: total(s1ScoresMed),
      evaluation: '自我介绍结构较清晰，涵盖了教育背景、工作经历和技术方向。但可以更突出个人亮点和与目标岗位的匹配度。',
      interviewerReflection: '候选人做了一定准备，表达较流畅，但缺少让人印象深刻的记忆点。',
      improvementSuggestions: [
        { priority: 'medium' as const, suggestion: '增加1-2个量化成果作为开场亮点' },
        { priority: 'medium' as const, suggestion: '结尾加入对目标岗位的理解和职业诉求' },
      ],
    },
    {
      phaseType: 'project_qa' as const, phaseIndex: 1,
      scores: s2ProjScoresMed,
      totalScore: total(s2ProjScoresMed),
      evaluation: '项目描述有层次感，能讲清楚技术选型和量化成果。追问环节回答有一定深度，但架构迁移的决策过程可以讲得更充分。',
      interviewerReflection: '候选人对项目比较熟悉，技术细节掌握较好，跨项目对比时有不错的迁移思考。',
      improvementSuggestions: [
        { priority: 'medium' as const, suggestion: '增加技术决策的Trade-off分析' },
        { priority: 'low' as const, suggestion: '补充团队协作和推动过程' },
      ],
    },
    {
      phaseType: 'random_qa' as const, phaseIndex: 2,
      scores: s2QnaScoresMed,
      totalScore: total(s2QnaScoresMed),
      evaluation: '基础概念掌握较好，算法题给出了正确思路和复杂度分析。场景设计题有一定系统性，但容错和扩展性考虑不够全面。',
      interviewerReflection: '候选人基础扎实，学习和总结能力较强。',
      improvementSuggestions: [
        { priority: 'medium' as const, suggestion: '算法题尽量写出完整可运行代码' },
        { priority: 'medium' as const, suggestion: '系统设计增加容量估算和降级方案' },
      ],
    },
  ],
  fullReview: {
    phaseScoresSummary: [
      { phaseType: 'self_intro', score: total(s1ScoresMed), duration: 4 },
      { phaseType: 'project_qa', score: total(s2ProjScoresMed), duration: 14 },
      { phaseType: 'random_qa', score: total(s2QnaScoresMed), duration: 10 },
    ],
    coherenceScore: 3.2,
    jdMatchScore: 3.2,
    overallPersona: '有一定技术深度和项目经验的前端工程师，表达和系统性思维正在稳步提升。',
    consolidatedImprovements: [
      { priority: 'medium' as const, sourcePhases: ['self_intro'], suggestion: '增加开场亮点和岗位匹配度表达' },
      { priority: 'medium' as const, sourcePhases: ['project_qa'], suggestion: '补充技术决策的完整决策链' },
      { priority: 'medium' as const, sourcePhases: ['random_qa'], suggestion: '加强系统设计的深度和边界思考' },
    ],
    overallEvaluation: '本次面试表现中等偏上。候选人在项目经验和技术基础方面有较好的积累，自我介绍和项目描述比上次有明显进步。算法和系统设计方面还有提升空间，建议继续加强编码实践和架构思维训练。',
    overallScore: 3.2,
  },
}

// ====== Session 3: 整面 #3 (高分 4.0) ======
const S3 = 'f0000003-0000-4000-a000-000000000003'
const s3IntroScores = scores(4.0, 3.8, 4.2, 4.0, 4.5)
const s3ProjScores = scores(4.2, 4.5, 4.0, 4.2, 4.5)
const s3QnaScores = scores(4.0, 3.8, 4.0, 4.0, 4.2)
const s3 = {
  id: S3,
  type: 'full' as const,
  position: 'frontend',
  targetCompany: '蚂蚁集团',
  jobDescription: '高级前端工程师，负责支付宝小程序框架',
  status: 'ended' as const,
  currentState: 'END',
  startedAt: T('2026-05-08T10:00:00'),
  endedAt: T('2026-05-08T10:32:00'),
  createdAt: T('2026-05-08T09:55:00'),
  turns: [
    { kind: 'system' as const, text: '你好，我是今天的面试官。请先做个简单的自我介绍。', phase: 'self_intro', state: 'SELF_INTRO' },
    { kind: 'interviewer_main' as const, text: '你好，我是今天的面试官。请先做个简单的自我介绍。', phase: 'self_intro', state: 'SELF_INTRO' },
    { kind: 'candidate' as const, text: '面试官好，我是陈明远，北京大学软件工程本科，目前在字节跳动担任前端开发工程师，3年经验。过去两年我主导了电商中台系统的微前端架构改造，将单体应用拆分为5个独立子应用，发布周期从两周缩短到两天，首屏加载时间从4.2s优化到1.8s。我的技术方向聚焦在React生态、微前端架构和前端工程化，同时也持续关注性能优化和低代码领域。今天应聘的是支付宝小程序框架方向的岗位，我对小程序的运行时架构和跨端渲染技术非常感兴趣，希望能有机会深入交流。', phase: 'self_intro', state: 'SELF_INTRO' },
    { kind: 'interviewer_main' as const, text: '感谢你的介绍。接下来请介绍一下你的项目经历，我们先从你最有代表性的项目开始。', phase: 'self_intro', state: 'SELF_INTRO' },
    { kind: 'candidate' as const, text: '好的，我详细介绍电商中台系统的微前端改造。项目背景是随着业务增长，原来的单体前端应用已经无法满足多团队并行开发的需求，代码库膨胀到20万行，构建时间超过10分钟，发布冲突频繁。我的核心职责是设计并落地微前端架构方案。', phase: 'project_single', state: 'PROJECT_SINGLE_1', projectId: P1 },
    { kind: 'interviewer_followup' as const, text: '你们对比了哪些微前端方案？最终为什么选Module Federation而不是qiankun？', phase: 'project_single', state: 'PROJECT_SINGLE_1', projectId: P1 },
    { kind: 'candidate' as const, text: '我们对比了iframe、qiankun和Module Federation三种方案。iframe方案在体验上有明显短板，弹窗遮罩、路由同步都很麻烦。qiankun在运行时隔离上做得不错，但JS Sandbox的Proxy方案在一些低端机上性能较差，且样式隔离需要额外处理。Module Federation的优势在于模块共享能力，我们的组件库可以被多个子应用共享而无需重复打包，这带来了显著的体积优化。另外，Module Federation是Webpack原生能力，和我们现有的构建体系兼容性最好。', phase: 'project_single', state: 'PROJECT_SINGLE_1', projectId: P1 },
    { kind: 'interviewer_followup' as const, text: '在性能优化方面，除了你提到的首屏优化，还有没有针对运行时性能的优化？', phase: 'project_single', state: 'PROJECT_SINGLE_1', projectId: P1 },
    { kind: 'candidate' as const, text: '有的。运行时方面我们做了三件事：一是虚拟滚动优化长列表，用react-window替代原生渲染，将10万条数据的渲染时间从3s降到50ms；二是实施组件级懒加载，用React.lazy + Suspense对非核心组件做按需加载；三是建立了性能监控体系，用Performance API采集FCP、LCP、FID、CLS等核心指标，通过Sentry告警异常。我们设定了性能预算，每个PR如果增加了超过50KB的JS体积就会触发CI阻断。', phase: 'project_single', state: 'PROJECT_SINGLE_1', projectId: P1 },
    { kind: 'interviewer_main' as const, text: '好的，我们再聊聊另一个项目。', phase: 'project_single', state: 'PROJECT_SINGLE_2' },
    { kind: 'candidate' as const, text: '我再介绍实时数据大屏项目。这个项目的需求是实时监控电商全链路数据，包括订单量、支付成功率、库存预警等20+指标，数据更新频率是每秒500+数据点。技术挑战在于高频数据更新下的渲染性能。', phase: 'project_single', state: 'PROJECT_SINGLE_2', projectId: P3 },
    { kind: 'interviewer_followup' as const, text: '500+数据点每秒的更新，ECharts是怎么处理的？有没有遇到过渲染卡顿？', phase: 'project_single', state: 'PROJECT_SINGLE_2', projectId: P3 },
    { kind: 'candidate' as const, text: '我们遇到了严重的卡顿问题，初始方案直接用ECharts setOption更新，FPS掉到10以下。优化方案分三层：数据层用WebWorker做数据预处理和聚合，将500个点按时间窗口聚合成50个；渲染层用requestAnimationFrame节流，控制在60FPS以内；展示层只渲染视口内图表，非视口图表暂停更新。另外我们对折线图做了数据抽稀，用LTTB算法在保持趋势的前提下减少80%的数据点。最终FPS稳定在55+，CPU占用从80%降到25%。', phase: 'project_single', state: 'PROJECT_SINGLE_2', projectId: P3 },
    { kind: 'interviewer_main' as const, text: '很好。现在我想把几个项目放在一起对比着问问。', phase: 'project_cross', state: 'PROJECT_CROSS' },
    { kind: 'candidate' as const, text: '好的。', phase: 'project_cross', state: 'PROJECT_CROSS' },
    { kind: 'interviewer_followup' as const, text: '假设你要把数据大屏的实时数据能力集成到低代码表单引擎里，让用户可以配置实时数据绑定的表单组件，你会怎么设计这个跨项目的集成方案？', phase: 'project_cross', state: 'PROJECT_CROSS' },
    { kind: 'candidate' as const, text: '我会设计三层集成架构。最底层是数据通道层，抽象一个DataSource SDK，封装WebSocket连接管理、心跳重连、断线恢复，同时支持轮询和SSE降级。中间层是组件适配层，在表单引擎的物料体系里新增"实时数据"组件类型，支持选择数据源、配置刷新频率和展示格式。上层是可视化配置层，在表单设计器的属性面板里增加数据源绑定UI，支持拖拽字段映射。核心挑战是状态同步——表单字段的编辑状态和实时数据的只读状态需要明确区分，我的方案是给实时数据绑定字段加上readonly装饰，并用不同颜色标识数据来源。', phase: 'project_cross', state: 'PROJECT_CROSS' },
    { kind: 'interviewer_main' as const, text: '项目部分我们就聊到这里。接下来进入技术问答环节。', phase: 'q_and_a', state: 'QNA_TECH' },
    { kind: 'candidate' as const, text: '好的。', phase: 'q_and_a', state: 'QNA_TECH' },
    { kind: 'interviewer_main' as const, text: '请详细解释React的Fiber架构，包括时间切片和优先级调度是如何工作的。', phase: 'q_and_a', state: 'QNA_TECH', topic: 'bagua' },
    { kind: 'candidate' as const, text: 'Fiber是React 16引入的新的协调引擎，核心目标是将渲染工作拆分为可中断的小单元。每个Fiber节点对应一个React元素，通过链表结构（child、sibling、return）连接成树。时间切片的实现依赖于requestIdleCallback的polyfill——Scheduler包，它会将工作拆分为5ms左右的任务片，利用浏览器每一帧的空闲时间执行。如果一帧内有用户输入等高优先级事件，React可以中断当前渲染，优先处理用户交互。优先级调度方面，React将更新分为多个 lanes，如SyncLane、InputContinuousLane、DefaultLane等，高优先级的更新可以抢占低优先级的渲染。', phase: 'q_and_a', state: 'QNA_TECH', topic: 'bagua' },
    { kind: 'interviewer_main' as const, text: '基础概念掌握得不错。我们来看一道算法题。', phase: 'q_and_a', state: 'QNA_ALGO' },
    { kind: 'candidate' as const, text: '好的。', phase: 'q_and_a', state: 'QNA_ALGO' },
    { kind: 'interviewer_main' as const, text: '实现一个支持最小值查询的栈，要求push、pop、getMin都是O(1)。', phase: 'q_and_a', state: 'QNA_ALGO', topic: 'algorithm' },
    { kind: 'candidate' as const, text: '可以用辅助栈来实现。主栈正常存数据，辅助栈存当前最小值。push时如果新元素小于等于辅助栈栈顶，就同时压入辅助栈。pop时如果弹出元素等于辅助栈栈顶，辅助栈也弹出。getMin直接返回辅助栈栈顶。两个栈操作都是O(1)，空间复杂度O(n)最坏情况。', phase: 'q_and_a', state: 'QNA_ALGO', topic: 'algorithm' },
    { kind: 'interviewer_main' as const, text: '算法部分聊完了。我们来聊一个场景设计题。', phase: 'q_and_a', state: 'QNA_SCENE' },
    { kind: 'candidate' as const, text: '好的。', phase: 'q_and_a', state: 'QNA_SCENE' },
    { kind: 'interviewer_main' as const, text: '设计一个前端微前端平台的运行时调度系统，要求支持沙箱隔离、样式隔离、按需加载和跨应用通信。', phase: 'q_and_a', state: 'QNA_SCENE', topic: 'scene' },
    { kind: 'candidate' as const, text: '我会从五个维度设计。加载调度层：实现基于路由匹配的微应用生命周期管理，支持预加载和缓存策略。JS沙箱层：用Proxy实现快照沙箱，在应用挂载时记录window变更，卸载时恢复，避免全局污染。对于需要严格隔离的场景，可以用Web Component的Shadow DOM或iframe。样式隔离层：自动给子应用CSS选择器加前缀，配合CSSOM的insertRule拦截实现动态样式隔离。按需加载层：基于路由的Code Splitting，配合预加载策略，首屏只加载当前应用，其他应用在进入路由前预加载。跨应用通信层：设计基于发布订阅的EventBus，支持强类型约束，同时提供全局状态管理器的适配层，如Redux、Zustand的跨应用共享。', phase: 'q_and_a', state: 'QNA_SCENE', topic: 'scene' },
    { kind: 'system' as const, text: '今天的面试就到这里，感谢你的时间。', phase: 'q_and_a', state: 'END' },
  ],
  phaseReviews: [
    {
      phaseType: 'self_intro' as const, phaseIndex: 0,
      scores: s3IntroScores,
      totalScore: total(s3IntroScores),
      evaluation: '自我介绍非常优秀，结构清晰、重点突出、有量化成果支撑。结尾主动表达对目标岗位的兴趣和理解，展现了良好的求职意愿。',
      interviewerReflection: '候选人做了充分准备，表达流畅自信，给人留下了深刻印象。',
      improvementSuggestions: [
        { priority: 'low' as const, suggestion: '可以适当增加一个有趣的个人标签，让面试官更容易记住你' },
      ],
    },
    {
      phaseType: 'project_qa' as const, phaseIndex: 1,
      scores: s3ProjScores,
      totalScore: total(s3ProjScores),
      evaluation: '项目描述非常出色，技术深度、架构思考和量化成果都很充分。追问环节展现了扎实的问题分析能力和解决复杂问题的经验。跨项目对比时有完整的迁移思考。',
      interviewerReflection: '候选人对项目有深度的ownership，不仅是执行者，更是架构设计者。',
      improvementSuggestions: [
        { priority: 'low' as const, suggestion: '可以补充一些失败案例和从中吸取的教训，展现成长型思维' },
      ],
    },
    {
      phaseType: 'random_qa' as const, phaseIndex: 2,
      scores: s3QnaScores,
      totalScore: total(s3QnaScores),
      evaluation: '基础概念理解深入，算法题给出最优解并分析了复杂度。场景设计题展现了系统的架构思维和分层设计能力。',
      interviewerReflection: '候选人基础扎实，技术视野较广，学习能力较强。',
      improvementSuggestions: [
        { priority: 'low' as const, suggestion: '算法题可以同时给出时间和空间复杂度的Trade-off分析' },
      ],
    },
  ],
  fullReview: {
    phaseScoresSummary: [
      { phaseType: 'self_intro', score: total(s3IntroScores), duration: 5 },
      { phaseType: 'project_qa', score: total(s3ProjScores), duration: 16 },
      { phaseType: 'random_qa', score: total(s3QnaScores), duration: 11 },
    ],
    coherenceScore: 4.2,
    jdMatchScore: 4.0,
    overallPersona: '技术扎实、表达优秀、有架构视野的前端工程师，具备高级岗位的潜力。',
    consolidatedImprovements: [
      { priority: 'low' as const, sourcePhases: ['self_intro'], suggestion: '增加个人标签提升记忆点' },
      { priority: 'low' as const, sourcePhases: ['project_qa'], suggestion: '补充失败案例展现成长型思维' },
    ],
    overallEvaluation: '本次面试表现优秀。候选人在所有维度上都有出色的表现，自我介绍清晰有力，项目描述有深度和量化成果，技术基础和架构思维扎实。建议作为strong hire推进。',
    overallScore: 4.0,
  },
}

// ====== Session 4: 自我介绍专项 (3.0) ======
const S4 = 'f0000004-0000-4000-a000-000000000004'
const s4Scores = scores(3.0, 2.5, 3.5, 3.0, 3.5)
const s4 = {
  id: S4,
  type: 'self_intro' as const,
  position: 'frontend',
  targetCompany: null,
  jobDescription: null,
  status: 'ended' as const,
  currentState: 'END',
  startedAt: T('2026-05-08T16:00:00'),
  endedAt: T('2026-05-08T16:08:00'),
  createdAt: T('2026-05-08T15:55:00'),
  turns: [
    { kind: 'system' as const, text: '你好，我是今天的面试官。请先做个简单的自我介绍。', phase: 'self_intro', state: 'SELF_INTRO' },
    { kind: 'interviewer_main' as const, text: '你好，我是今天的面试官。请先做个简单的自我介绍。', phase: 'self_intro', state: 'SELF_INTRO' },
    { kind: 'candidate' as const, text: '面试官好，我叫陈明远，北大软件工程毕业，目前在字节做前端开发。我主要做React相关的项目，做过电商中台、低代码引擎和数据大屏。对微前端和性能优化比较熟悉。希望能加入贵公司。', phase: 'self_intro', state: 'SELF_INTRO' },
    { kind: 'interviewer_main' as const, text: '你提到做过微前端，能具体说说你在这个领域的经验吗？', phase: 'self_intro', state: 'SELF_INTRO' },
    { kind: 'candidate' as const, text: '好的。我在电商中台项目里主导了微前端架构改造，用Webpack Module Federation把单体应用拆成5个子应用。解决了多团队并行开发和发布冲突的问题。', phase: 'self_intro', state: 'SELF_INTRO' },
    { kind: 'interviewer_main' as const, text: '除了技术方面，你在团队协作中通常扮演什么角色？', phase: 'self_intro', state: 'SELF_INTRO' },
    { kind: 'candidate' as const, text: '我通常是技术方案的推动者。在微前端改造项目中，我需要说服各业务团队接受新的架构，协调迁移排期，还要编写技术文档和培训材料。', phase: 'self_intro', state: 'SELF_INTRO' },
    { kind: 'system' as const, text: '自我介绍环节结束。', phase: 'self_intro', state: 'END' },
  ],
  phaseReviews: [
    {
      phaseType: 'self_intro' as const, phaseIndex: 0,
      scores: s4Scores,
      totalScore: total(s4Scores),
      evaluation: '自我介绍基本完整，涵盖了教育背景、工作经历和技术方向。但缺少量化成果，对目标岗位匹配度的表达不够明确。',
      interviewerReflection: '候选人表达较流畅，但内容偏平，缺少让人记住的亮点。',
      improvementSuggestions: [
        { priority: 'high' as const, suggestion: '用1-2个具体数字量化核心成果' },
        { priority: 'medium' as const, suggestion: '增加对目标岗位的理解和匹配度说明' },
        { priority: 'medium' as const, suggestion: '准备一个60秒和90秒两个版本的自我介绍' },
      ],
    },
  ],
  fullReview: null,
}

// ====== Session 5: 项目问答专项 (3.5) ======
const S5 = 'f0000005-0000-4000-a000-000000000005'
const s5Scores = scores(3.5, 3.8, 3.2, 3.5, 3.8)
const s5 = {
  id: S5,
  type: 'project_qa' as const,
  position: 'frontend',
  targetCompany: '腾讯',
  jobDescription: '前端工程师，负责企业微信应用开发',
  status: 'ended' as const,
  currentState: 'END',
  startedAt: T('2026-05-09T10:00:00'),
  endedAt: T('2026-05-09T10:18:00'),
  createdAt: T('2026-05-09T09:55:00'),
  turns: [
    { kind: 'system' as const, text: '你好，我是今天的面试官。我们来聊聊你的项目经历。', phase: 'project_single', state: 'PROJECT_SINGLE_1' },
    { kind: 'interviewer_main' as const, text: '你好，我是今天的面试官。我们来聊聊你的项目经历。', phase: 'project_single', state: 'PROJECT_SINGLE_1' },
    { kind: 'candidate' as const, text: '好的，我先介绍电商中台系统。这个项目支撑抖音电商的核心交易链路，我作为前端负责人，主导了微前端架构改造和性能优化。', phase: 'project_single', state: 'PROJECT_SINGLE_1', projectId: P1 },
    { kind: 'interviewer_followup' as const, text: '微前端方案中，如果子应用之间需要共享状态，你们是怎么做的？', phase: 'project_single', state: 'PROJECT_SINGLE_1', projectId: P1 },
    { kind: 'candidate' as const, text: '我们有两种共享方案。对于简单的跨应用通信，用EventEmitter做发布订阅。对于需要持久化的全局状态，比如用户信息和权限，我们抽象了一个SharedStore，基于RxJS实现，各子应用通过统一API读取和订阅。SharedStore运行在基座应用里，通过Module Federation的shared配置暴露给子应用。', phase: 'project_single', state: 'PROJECT_SINGLE_1', projectId: P1 },
    { kind: 'interviewer_followup' as const, text: '子应用独立部署后，基座应用如何知道有哪些子应用可用？', phase: 'project_single', state: 'PROJECT_SINGLE_1', projectId: P1 },
    { kind: 'candidate' as const, text: '我们设计了一个应用注册中心，每个子应用打包时生成manifest文件，包含入口URL、依赖版本和路由规则，发布到注册中心。基座应用在启动时拉取manifest列表，动态注册路由。当用户访问某个路由时，基座根据manifest加载对应的remoteEntry.js。', phase: 'project_single', state: 'PROJECT_SINGLE_1', projectId: P1 },
    { kind: 'interviewer_main' as const, text: '好的，我们再聊聊另一个项目。', phase: 'project_single', state: 'PROJECT_SINGLE_2' },
    { kind: 'candidate' as const, text: '另一个项目是低代码表单引擎，目标是让运营和产品同学能自己搭建表单页面。核心设计是JSON Schema驱动的配置化方案，表单结构、校验规则和联动逻辑都用JSON描述。', phase: 'project_single', state: 'PROJECT_SINGLE_2', projectId: P2 },
    { kind: 'interviewer_followup' as const, text: '自定义组件怎么接入你们的表单引擎？', phase: 'project_single', state: 'PROJECT_SINGLE_2', projectId: P2 },
    { kind: 'candidate' as const, text: '我们设计了组件注册协议，每个自定义组件需要实现三个接口：render接收field配置返回VNode，validate接收value返回校验结果，getDefaultValue返回默认值。组件通过registerComponent API注册到引擎，注册时指定组件分类、图标和默认配置模板。我们还支持从npm包动态加载远程组件，通过import()动态导入。', phase: 'project_single', state: 'PROJECT_SINGLE_2', projectId: P2 },
    { kind: 'interviewer_main' as const, text: '很好。现在我想把几个项目放在一起对比着问问。', phase: 'project_cross', state: 'PROJECT_CROSS' },
    { kind: 'candidate' as const, text: '好的。', phase: 'project_cross', state: 'PROJECT_CROSS' },
    { kind: 'interviewer_followup' as const, text: '电商中台和表单引擎都有配置化思想，一个是路由/页面的配置化，一个是表单的配置化，你认为这两种配置化的本质区别是什么？', phase: 'project_cross', state: 'PROJECT_CROSS' },
    { kind: 'candidate' as const, text: '我觉得核心区别在于抽象层次和表达能力。微前端的配置化是应用级别的编排，关注的是应用之间的组合关系，配置的是"有什么应用、路由怎么映射"。表单引擎的配置化是组件级别的编排，关注的是单个页面内的交互逻辑，配置的是"有什么字段、字段之间怎么联动"。从抽象层次看，微前端是元数据驱动的应用架构，表单引擎是Schema驱动的UI生成。两种配置化的共同点是都需要一个运行时引擎来解释配置并产出最终结果。', phase: 'project_cross', state: 'PROJECT_CROSS' },
    { kind: 'system' as const, text: '今天的面试就到这里，感谢你的时间。', phase: 'project_cross', state: 'END' },
  ],
  phaseReviews: [
    {
      phaseType: 'project_qa' as const, phaseIndex: 0,
      scores: s5Scores,
      totalScore: total(s5Scores),
      evaluation: '项目描述有深度，技术细节掌握扎实。追问环节展现了良好的架构思考能力。跨项目对比时能从抽象层次出发，给出有洞察力的分析。',
      interviewerReflection: '候选人对项目有深刻理解，不仅是执行层面的描述，更有设计层面的思考。',
      improvementSuggestions: [
        { priority: 'medium' as const, suggestion: '可以增加一些量化的业务价值数据' },
        { priority: 'low' as const, suggestion: '补充团队协作中的冲突解决案例' },
      ],
    },
  ],
  fullReview: null,
}

// ====== Session 6: 随机问答专项 (3.5) ======
const S6 = 'f0000006-0000-4000-a000-000000000006'
const s6Scores = scores(3.8, 3.2, 3.5, 3.5, 3.8)
const s6 = {
  id: S6,
  type: 'random_qa' as const,
  position: 'frontend',
  targetCompany: '美团',
  jobDescription: '前端工程师，负责外卖商家端系统',
  status: 'ended' as const,
  currentState: 'END',
  startedAt: T('2026-05-09T14:00:00'),
  endedAt: T('2026-05-09T14:15:00'),
  createdAt: T('2026-05-09T13:55:00'),
  turns: [
    { kind: 'system' as const, text: '你好，我是今天的面试官。接下来进入技术问答环节。', phase: 'q_and_a', state: 'QNA_TECH' },
    { kind: 'interviewer_main' as const, text: '你好，我是今天的面试官。接下来进入技术问答环节。', phase: 'q_and_a', state: 'QNA_TECH' },
    { kind: 'candidate' as const, text: '好的，准备好了。', phase: 'q_and_a', state: 'QNA_TECH' },
    { kind: 'interviewer_main' as const, text: '请说说HTTP/2和HTTP/3的主要区别，以及前端可以如何利用这些特性优化性能。', phase: 'q_and_a', state: 'QNA_TECH', topic: 'bagua' },
    { kind: 'candidate' as const, text: 'HTTP/2的核心特性是多路复用、头部压缩和服务器推送，解决了HTTP/1.1的队头阻塞问题。HTTP/3基于QUIC协议，将传输层从TCP改为UDP，进一步解决了TCP层的队头阻塞，同时内置了TLS 1.3，握手更快。前端优化方面，HTTP/2下可以将小文件适当合并减少请求数，但要注意不要合并过大。HTTP/3由于连接迁移能力，对移动端网络切换更友好。另外HTTP/2的服务器推送可以配合preload使用，但要注意浏览器兼容性。', phase: 'q_and_a', state: 'QNA_TECH', topic: 'bagua' },
    { kind: 'interviewer_main' as const, text: '基础概念掌握得不错。我们来看一道算法题。', phase: 'q_and_a', state: 'QNA_ALGO' },
    { kind: 'candidate' as const, text: '好的。', phase: 'q_and_a', state: 'QNA_ALGO' },
    { kind: 'interviewer_main' as const, text: '给一个DOM树和一个目标节点，找到目标节点的所有祖先节点中className包含"active"的最近一个。', phase: 'q_and_a', state: 'QNA_ALGO', topic: 'algorithm' },
    { kind: 'candidate' as const, text: '可以用while循环遍历parentNode，每次检查当前节点的classList是否包含"active"，如果包含就返回。时间复杂度O(h)，h是树高。空间复杂度O(1)。也可以用递归，但迭代更省栈空间。', phase: 'q_and_a', state: 'QNA_ALGO', topic: 'algorithm' },
    { kind: 'interviewer_main' as const, text: '算法部分聊完了。我们来聊一个场景设计题。', phase: 'q_and_a', state: 'QNA_SCENE' },
    { kind: 'candidate' as const, text: '好的。', phase: 'q_and_a', state: 'QNA_SCENE' },
    { kind: 'interviewer_main' as const, text: '设计一个前端埋点系统，要求支持点击、曝光、页面停留等事件类型，且对业务代码侵入性最小。', phase: 'q_and_a', state: 'QNA_SCENE', topic: 'scene' },
    { kind: 'candidate' as const, text: '我会用声明式埋点+自动采集结合方案。点击事件通过事件委托在document级别监听，根据data-track属性自动采集，不需要在每个按钮上加onClick。曝光事件用IntersectionObserver监听目标元素进入视口，自动上报。页面停留用beforeunload计算时间差。对于需要自定义参数的场景，提供track API。采集层会做数据校验、采样和批量上报，用sendBeacon保证页面关闭时的数据不丢失。处理层做数据清洗、去重和实时计算，展示层提供事件分析、漏斗分析和留存分析。', phase: 'q_and_a', state: 'QNA_SCENE', topic: 'scene' },
    { kind: 'system' as const, text: '今天的面试就到这里，感谢你的时间。', phase: 'q_and_a', state: 'END' },
  ],
  phaseReviews: [
    {
      phaseType: 'random_qa' as const, phaseIndex: 0,
      scores: s6Scores,
      totalScore: total(s6Scores),
      evaluation: '基础概念掌握扎实，HTTP协议和网络优化有较深入理解。算法题思路正确但缺少代码实现。场景设计题方案完整，考虑了多种事件类型和上报可靠性。',
      interviewerReflection: '候选人基础知识较好，技术视野开阔，但编码能力需要加强。',
      improvementSuggestions: [
        { priority: 'high' as const, suggestion: '算法题务必写出完整代码' },
        { priority: 'medium' as const, suggestion: '场景设计增加容量估算和性能预算' },
      ],
    },
  ],
  fullReview: null,
}

export const frontendAccount: DemoAccount = {
  user,
  resume,
  projects,
  sessions: [s1, s2, s3, s4, s5, s6],
}
