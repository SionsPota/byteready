import type { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'
import { hashPassword } from '../auth/password.ts'
import { createResumeRepository } from '../resume/repository.ts'
import { createProjectRepository } from '../projects/repository.ts'
import { createTrainingRepository } from '../training/repository.ts'
import { createPhaseReviewRepository } from '../phase-reviews/repository.ts'
import { createFullReviewRepository } from '../full-reviews/repository.ts'
import { createReviewRepository } from '../reviews/repository.ts'
import { createV3TrendRepository } from '../trends/repository-v3.ts'
import { generatePhaseReview } from '../reviews/phase-generator.ts'
import { generateFullReview } from '../reviews/full-generator.ts'

// ============================================================
// Demo Seed Data
// 模拟真实用户链路：用户 -> 简历/项目 -> 训练 -> 复盘
// ============================================================

const DEMO_USERS = [
  {
    id: 'demo-user-001',
    email: 'zhangwei@demo.com',
    name: '张伟',
    password: 'demo123',
    resume: {
      title: '张伟 - 后端开发工程师',
      rawText: `姓名：张伟
邮箱：zhangwei@demo.com
电话：138-0000-0001

教育经历
北京大学 软件工程 本科 2019-2023

工作经历
字节跳动 - 后端开发工程师 2023.07-至今
- 负责电商订单系统的开发与维护
- 参与实时消息推送系统的设计

专业技能
Python, Go, Redis, Kafka, MySQL, Docker, Kubernetes

项目经历
1. 电商订单系统缓存优化
   负责订单查询模块的性能优化，引入 Redis 缓存热点数据，优化数据库查询。
   技术栈：Python, Redis, MySQL

2. 实时消息推送系统
   基于 WebSocket 和 Kafka 的实时消息推送服务，支持订单状态变更通知。
   技术栈：Go, WebSocket, Kafka`,
      position: 'backend',
      sourceFormat: 'paste' as const,
    },
    projects: [
      {
        name: '电商订单系统缓存优化',
        period: '2023.09-2024.03',
        role: '后端开发',
        summary: '负责订单查询模块的性能优化，引入 Redis 缓存热点数据，将查询响应时间从 200ms 降低到 50ms。设计了多级缓存策略，包括本地缓存和分布式缓存。',
        keywords: ['Python', 'Redis', 'MySQL', '缓存优化'],
      },
      {
        name: '实时消息推送系统',
        period: '2024.04-至今',
        role: '核心开发',
        summary: '基于 WebSocket 和 Kafka 构建的实时消息推送服务，支持订单状态变更、促销活动通知等场景，峰值 QPS 达到 5000。',
        keywords: ['Go', 'WebSocket', 'Kafka', '高并发'],
      },
    ],
  },
  {
    id: 'demo-user-002',
    email: 'lina@demo.com',
    name: '李娜',
    password: 'demo123',
    resume: {
      title: '李娜 - 前端开发工程师',
      rawText: `姓名：李娜
邮箱：lina@demo.com
电话：138-0000-0002

教育经历
浙江大学 计算机科学与技术 本科 2020-2024

工作经历
阿里巴巴 - 前端开发工程师 2024.03-至今
- 负责企业级中后台系统的前端架构设计
- 主导移动端 H5 活动页面的性能优化

专业技能
React, Vue, TypeScript, Webpack, Vite, Node.js, 性能优化

项目经历
1. 企业级中后台管理系统
   使用 React + Ant Design 构建的企业级中后台系统，支持权限管理、数据可视化等模块。
   技术栈：React, TypeScript, ECharts

2. 移动端 H5 活动页面
   高并发场景下的 H5 营销活动页面，首屏加载时间优化至 1.2s 以内。
   技术栈：Vue, Vite, 性能优化`,
      position: 'frontend',
      sourceFormat: 'paste' as const,
    },
    projects: [
      {
        name: '企业级中后台管理系统',
        period: '2024.03-2024.09',
        role: '前端负责人',
        summary: '使用 React + TypeScript 构建的企业级中后台系统，包含权限管理、数据可视化、表单引擎等模块。通过组件库封装和微前端架构，提升团队开发效率 40%。',
        keywords: ['React', 'TypeScript', '微前端', 'ECharts'],
      },
      {
        name: '移动端 H5 活动页面',
        period: '2024.10-至今',
        role: '前端开发',
        summary: '双十一、618 等大促活动的高并发 H5 页面，首屏加载时间从 3.5s 优化至 1.2s。采用 SSR + CDN 预热 + 图片懒加载等策略，PV 峰值达到 100万/小时。',
        keywords: ['Vue', 'Vite', 'SSR', '性能优化'],
      },
    ],
  },
]

// ============================================================
// 模拟训练对话数据
// ============================================================

interface SimulatedTurn {
  kind: 'interviewer_main' | 'interviewer_followup' | 'candidate' | 'system'
  text: string
  phase: string | null
  state: string | null
  projectId?: string | null
  questionId?: string | null
  topic?: string | null
}

interface SimulatedSession {
  type: 'full' | 'self_intro' | 'project_qa' | 'random_qa'
  position: string
  targetCompany: string
  jobDescription: string
  turns: SimulatedTurn[]
}

// 张伟的训练数据（表现一般，有不少可改进点）
const ZHANGWEI_SESSIONS: SimulatedSession[] = [
  {
    type: 'self_intro',
    position: 'backend',
    targetCompany: '字节跳动',
    jobDescription: '负责后端服务开发，要求熟悉分布式系统和缓存技术',
    turns: [
      {
        kind: 'system',
        text: '你好，我是今天的面试官。请先做个简单的自我介绍。',
        phase: null,
        state: 'SELF_INTRO',
      },
      {
        kind: 'interviewer_main',
        text: '你好，我是今天的面试官。请先做个简单的自我介绍。',
        phase: 'self_intro',
        state: 'SELF_INTRO',
      },
      {
        kind: 'candidate',
        text: '嗯...大家好，我叫张伟，然后我现在在一家公司做后端开发，主要负责一些订单系统的工作。我之前学的是软件工程，然后工作大概三年了吧。我平时用的技术主要是 Python 和 Go，然后也接触过一些 Redis 和 Kafka 之类的东西。今天就...希望能和您聊聊吧。',
        phase: 'self_intro',
        state: 'SELF_INTRO',
      },
      {
        kind: 'system',
        text: '自我介绍环节结束。',
        phase: null,
        state: 'END',
      },
    ],
  },
  {
    type: 'project_qa',
    position: 'backend',
    targetCompany: '字节跳动',
    jobDescription: '负责后端服务开发，要求熟悉分布式系统和缓存技术',
    turns: [
      {
        kind: 'system',
        text: '你好，我是今天的面试官。我们来聊聊你的项目经历。',
        phase: null,
        state: 'PROJECT_SINGLE_1',
      },
      {
        kind: 'interviewer_main',
        text: '我们来聊聊你的项目经历。先说说你最有代表性的项目。',
        phase: 'project_single',
        state: 'PROJECT_SINGLE_1',
      },
      {
        kind: 'candidate',
        text: '好的，那我介绍一下电商订单系统的缓存优化项目。这个项目主要是做订单查询的优化，因为原来高峰期查询很慢。然后我引入了 Redis 做缓存，把热点数据放在 Redis 里，这样查询速度就提升了很多。',
        phase: 'project_single',
        state: 'PROJECT_SINGLE_1',
        projectId: null,
      },
      {
        kind: 'interviewer_followup',
        text: '你提到查询速度提升了很多，具体是多少？怎么量化的？',
        phase: 'project_single',
        state: 'PROJECT_SINGLE_1',
      },
      {
        kind: 'candidate',
        text: '具体数字...我记得大概是提升了 80% 吧。这个是我根据前后对比估算的，没有特别精确地统计。主要是用户反馈查询变快了。',
        phase: 'project_single',
        state: 'PROJECT_SINGLE_1',
      },
      {
        kind: 'interviewer_followup',
        text: '缓存的 key 是怎么设计的？如果 Redis 挂了，你们的降级方案是什么？',
        phase: 'project_single',
        state: 'PROJECT_SINGLE_1',
      },
      {
        kind: 'candidate',
        text: 'key 就是直接用 order_id 作为 key，然后加了 TTL，好像是一个小时。降级的话...如果 Redis 挂了就会查数据库，但是可能会比较慢。这个我们没有特别处理过。',
        phase: 'project_single',
        state: 'PROJECT_SINGLE_1',
      },
      {
        kind: 'interviewer_followup',
        text: '缓存和数据库的一致性是怎么保证的？有没有遇到过缓存击穿或者雪崩的情况？',
        phase: 'project_single',
        state: 'PROJECT_SINGLE_1',
      },
      {
        kind: 'candidate',
        text: '一致性...我们是在订单更新的时候同时更新 Redis。击穿和雪崩...我好像听说过这些概念，但是在项目中没有遇到过，所以了解不太深。',
        phase: 'project_single',
        state: 'PROJECT_SINGLE_1',
      },
      {
        kind: 'interviewer_main',
        text: '好的，我们聊聊另一个项目。说说实时消息推送系统。',
        phase: 'project_single',
        state: 'PROJECT_SINGLE_2',
      },
      {
        kind: 'candidate',
        text: '实时消息推送系统是我们最近在做的一个项目，用 Go 写的。主要是用户下单之后，通过 Kafka 发消息，然后 WebSocket 推送到前端页面。单机大概能支持一万个连接吧。',
        phase: 'project_single',
        state: 'PROJECT_SINGLE_2',
        projectId: null,
      },
      {
        kind: 'interviewer_followup',
        text: '一万连接是怎么测出来的？如果连接数翻倍，你的扩展方案是什么？',
        phase: 'project_single',
        state: 'PROJECT_SINGLE_2',
      },
      {
        kind: 'candidate',
        text: '就是用的压测工具测的。连接数翻倍的话...应该加机器吧，或者用更高效的框架。具体的我还没想过。',
        phase: 'project_single',
        state: 'PROJECT_SINGLE_2',
      },
    ],
  },
  {
    type: 'random_qa',
    position: 'backend',
    targetCompany: '字节跳动',
    jobDescription: '负责后端服务开发，要求熟悉分布式系统和缓存技术',
    turns: [
      {
        kind: 'system',
        text: '接下来进入技术问答环节。',
        phase: null,
        state: 'QNA_TECH',
      },
      {
        kind: 'interviewer_main',
        text: '来说说 Redis 的持久化机制。',
        phase: 'q_and_a',
        state: 'QNA_TECH',
      },
      {
        kind: 'candidate',
        text: 'Redis 有 RDB 和 AOF 两种持久化方式。RDB 是定期快照，AOF 是记录写命令日志。我们项目用的是 AOF。',
        phase: 'q_and_a',
        state: 'QNA_TECH',
      },
      {
        kind: 'interviewer_followup',
        text: 'AOF 的 rewrite 机制是什么？什么时候会触发？',
        phase: 'q_and_a',
        state: 'QNA_TECH',
      },
      {
        kind: 'candidate',
        text: 'rewrite 就是压缩 AOF 文件，去掉一些重复的操作。好像是在文件大小达到一定阈值的时候触发，具体数值我不记得了。',
        phase: 'q_and_a',
        state: 'QNA_TECH',
      },
      {
        kind: 'interviewer_main',
        text: '那说说 Kafka 的消费者组是怎么工作的？',
        phase: 'q_and_a',
        state: 'QNA_TECH',
      },
      {
        kind: 'candidate',
        text: '消费者组里面可以有多个消费者，然后每个 partition 只能被组里的一个消费者消费。如果有消费者挂了，Kafka 会重新分配 partition，这个叫 rebalance。',
        phase: 'q_and_a',
        state: 'QNA_TECH',
      },
      {
        kind: 'interviewer_followup',
        text: 'rebalance 的时候消息会重复消费吗？怎么避免？',
        phase: 'q_and_a',
        state: 'QNA_TECH',
      },
      {
        kind: 'candidate',
        text: '嗯...可能会吧？我不太确定。我们项目好像没有遇到过这个问题。',
        phase: 'q_and_a',
        state: 'QNA_TECH',
      },
      {
        kind: 'interviewer_main',
        text: '说说 MySQL 的索引原理。B+ 树和 B 树有什么区别？',
        phase: 'q_and_a',
        state: 'QNA_TECH',
      },
      {
        kind: 'candidate',
        text: 'MySQL 用 B+ 树做索引。B+ 树和 B 树的区别...我记得 B+ 树的非叶子节点不存数据，只存 key，然后叶子节点之间有链表连接。这样范围查询比较快。',
        phase: 'q_and_a',
        state: 'QNA_TECH',
      },
    ],
  },
  {
    type: 'full',
    position: 'backend',
    targetCompany: '字节跳动',
    jobDescription: '负责后端服务开发，要求熟悉分布式系统和缓存技术',
    turns: [
      // 自我介绍
      {
        kind: 'system',
        text: '你好，我是今天的面试官。请先做个简单的自我介绍。',
        phase: null,
        state: 'SELF_INTRO',
      },
      {
        kind: 'interviewer_main',
        text: '你好，我是今天的面试官。请先做个简单的自我介绍。',
        phase: 'self_intro',
        state: 'SELF_INTRO',
      },
      {
        kind: 'candidate',
        text: '你好，我叫张伟，目前在一家电商公司做后端开发。我有三年的工作经验，主要做订单系统和消息推送相关的开发。技术栈主要是 Python 和 Go，用过 Redis、Kafka 这些。希望能加入字节跳动。',
        phase: 'self_intro',
        state: 'SELF_INTRO',
      },
      {
        kind: 'interviewer_main',
        text: '感谢你的介绍。接下来请介绍一下你的项目经历，我们先从你最有代表性的项目开始。',
        phase: 'self_intro',
        state: 'SELF_INTRO',
      },
      // 项目 1
      {
        kind: 'candidate',
        text: '好的，我介绍一下电商订单系统的缓存优化。这个项目主要是解决高峰期订单查询慢的问题。我引入了 Redis 做缓存，把热点订单数据缓存起来。',
        phase: 'project_single',
        state: 'PROJECT_SINGLE_1',
        projectId: null,
      },
      {
        kind: 'interviewer_followup',
        text: '热点数据是怎么定义的？缓存命中率大概多少？',
        phase: 'project_single',
        state: 'PROJECT_SINGLE_1',
      },
      {
        kind: 'candidate',
        text: '热点数据就是最近下单的订单，因为用户经常查最新的订单。命中率...应该在 80% 左右吧。',
        phase: 'project_single',
        state: 'PROJECT_SINGLE_1',
      },
      {
        kind: 'interviewer_followup',
        text: '如果订单状态更新了，怎么保证缓存的一致性？',
        phase: 'project_single',
        state: 'PROJECT_SINGLE_1',
      },
      {
        kind: 'candidate',
        text: '我们在更新订单的时候会把 Redis 里对应的 key 删掉，这样下次查询就会从数据库拿最新的数据。',
        phase: 'project_single',
        state: 'PROJECT_SINGLE_1',
      },
      {
        kind: 'interviewer_main',
        text: '好的，我们再聊聊另一个项目。',
        phase: 'project_single',
        state: 'PROJECT_SINGLE_2',
      },
      // 项目 2
      {
        kind: 'candidate',
        text: '另一个项目是实时消息推送系统。用户下单后，通过 Kafka 发消息，然后 WebSocket 实时推送到用户端。我用 Go 写的推送服务。',
        phase: 'project_single',
        state: 'PROJECT_SINGLE_2',
        projectId: null,
      },
      {
        kind: 'interviewer_followup',
        text: 'WebSocket 连接断开后的重连机制是怎么设计的？',
        phase: 'project_single',
        state: 'PROJECT_SINGLE_2',
      },
      {
        kind: 'candidate',
        text: '重连是前端做的，前端检测到断开会自动重连。后端就是维护一个连接池。',
        phase: 'project_single',
        state: 'PROJECT_SINGLE_2',
      },
      // 技术问答
      {
        kind: 'interviewer_main',
        text: '项目部分我们就聊到这里。接下来进入技术问答环节。说说 Redis 和 Memcached 的区别？',
        phase: 'q_and_a',
        state: 'QNA_TECH',
      },
      {
        kind: 'candidate',
        text: 'Redis 支持更多的数据类型，比如 list、set、hash 这些。Memcached 只支持简单的 key-value。另外 Redis 支持持久化，Memcached 不支持。',
        phase: 'q_and_a',
        state: 'QNA_TECH',
      },
      {
        kind: 'interviewer_followup',
        text: 'Redis 是单线程的，为什么还这么快？',
        phase: 'q_and_a',
        state: 'QNA_TECH',
      },
      {
        kind: 'candidate',
        text: '因为 Redis 的数据都存在内存里，内存访问比磁盘快很多。而且它的网络模型是 IO 多路复用，虽然是单线程但是能处理很多并发连接。',
        phase: 'q_and_a',
        state: 'QNA_TECH',
      },
      {
        kind: 'interviewer_main',
        text: '今天的面试就到这里，感谢你的时间。',
        phase: 'q_and_a',
        state: 'QNA_TECH',
      },
      {
        kind: 'system',
        text: '今天的面试就到这里，感谢你的时间。',
        phase: null,
        state: 'END',
      },
    ],
  },
]

// 李娜的训练数据（表现较好）
const LINA_SESSIONS: SimulatedSession[] = [
  {
    type: 'self_intro',
    position: 'frontend',
    targetCompany: '阿里巴巴',
    jobDescription: '负责前端架构设计与性能优化，要求深入理解 React 生态和工程化',
    turns: [
      {
        kind: 'system',
        text: '你好，我是今天的面试官。请先做个简单的自我介绍。',
        phase: null,
        state: 'SELF_INTRO',
      },
      {
        kind: 'interviewer_main',
        text: '你好，我是今天的面试官。请先做个简单的自我介绍。',
        phase: 'self_intro',
        state: 'SELF_INTRO',
      },
      {
        kind: 'candidate',
        text: '你好面试官，我叫李娜，毕业于浙江大学计算机专业，目前在阿里巴巴做前端开发。工作一年以来，我主要负责中后台系统的前端架构和移动端 H5 页面的性能优化。\n\n在技术上，我主要使用 React 和 TypeScript，对前端工程化、性能优化有较深入的理解。在上一个项目中，我通过微前端架构改造和组件库封装，帮助团队提升了 40% 的开发效率。\n\n选择阿里是因为我非常认同你们的技术文化，也希望能在更大的平台上挑战更复杂的前端架构问题。',
        phase: 'self_intro',
        state: 'SELF_INTRO',
      },
      {
        kind: 'system',
        text: '自我介绍环节结束。',
        phase: null,
        state: 'END',
      },
    ],
  },
  {
    type: 'project_qa',
    position: 'frontend',
    targetCompany: '阿里巴巴',
    jobDescription: '负责前端架构设计与性能优化，要求深入理解 React 生态和工程化',
    turns: [
      {
        kind: 'system',
        text: '我们来聊聊你的项目经历。',
        phase: null,
        state: 'PROJECT_SINGLE_1',
      },
      {
        kind: 'interviewer_main',
        text: '我们来聊聊你的项目经历。先说说你最有代表性的项目。',
        phase: 'project_single',
        state: 'PROJECT_SINGLE_1',
      },
      {
        kind: 'candidate',
        text: '那我介绍一下企业级中后台管理系统的重构项目。背景是我们团队有多个中后台系统，每个系统的技术栈和组件都不统一，维护成本很高。\n\n我的任务是设计一套统一的前端架构。我主导引入了微前端架构，基于 qiankun 框架把多个子应用整合到一个主应用里。同时封装了一套业务组件库，统一了 UI 风格和交互逻辑。\n\n结果是，新需求开发效率提升了 40%，UI 不一致的 bug 减少了 60%。',
        phase: 'project_single',
        state: 'PROJECT_SINGLE_1',
        projectId: null,
      },
      {
        kind: 'interviewer_followup',
        text: '微前端之间的通信是怎么设计的？有没有遇到过样式隔离的问题？',
        phase: 'project_single',
        state: 'PROJECT_SINGLE_1',
      },
      {
        kind: 'candidate',
        text: '通信方面，我们设计了一个基于发布订阅的全局事件总线，同时配合 props 透传的方式。对于需要共享的状态，我们抽了一个轻量级的全局 store。\n\n样式隔离确实是个坑。我们一开始用 CSS Module，但不同子应用可能有相同的类名。后来我们通过 postcss-prefix-wrap 给每个子应用的样式加上前缀，结合 qiankun 的 sandbox，基本解决了这个问题。',
        phase: 'project_single',
        state: 'PROJECT_SINGLE_1',
      },
      {
        kind: 'interviewer_followup',
        text: '如果子应用之间需要共享一个组件库版本，怎么处理版本升级？',
        phase: 'project_single',
        state: 'PROJECT_SINGLE_1',
      },
      {
        kind: 'candidate',
        text: '我们在主应用里通过 webpack externals 把组件库打出来，子应用通过 window 对象访问。升级时只需要更新主应用的组件库版本，所有子应用自动生效。不过这也带来一个问题，就是子应用不能独立使用不同版本的组件库。我们的策略是组件库保持向后兼容，大版本升级时统一协调。',
        phase: 'project_single',
        state: 'PROJECT_SINGLE_1',
      },
      {
        kind: 'interviewer_main',
        text: '很好。再聊聊 H5 性能优化的项目。',
        phase: 'project_single',
        state: 'PROJECT_SINGLE_2',
      },
      {
        kind: 'candidate',
        text: 'H5 活动页面是大促期间的核心入口，对性能要求很高。我负责把首屏加载时间从 3.5s 优化到 1.2s。\n\n主要做了这几件事：\n1. 路由级别的懒加载 + 预加载策略\n2. 图片资源用 WebP + CDN + 渐进式加载\n3. 关键 CSS 内联，非关键 CSS 延迟加载\n4. 接口数据做缓存和合并请求\n\n双十一当天，页面 PV 峰值达到 100万/小时，页面崩溃率控制在 0.01% 以内。',
        phase: 'project_single',
        state: 'PROJECT_SINGLE_2',
        projectId: null,
      },
      {
        kind: 'interviewer_followup',
        text: '预加载策略是怎么设计的？怎么避免预加载影响当前页面的性能？',
        phase: 'project_single',
        state: 'PROJECT_SINGLE_2',
      },
      {
        kind: 'candidate',
        text: '我们用的是基于用户行为的预测预加载。通过分析用户在当前页面的点击热区，预测下一步可能访问的页面，在空闲时通过 requestIdleCallback 去加载。\n\n同时设置了一个带宽阈值，如果当前页面还在加载关键资源，就暂停预加载。另外预加载的优先级设为 lowest，不占用主请求的资源。',
        phase: 'project_single',
        state: 'PROJECT_SINGLE_2',
      },
    ],
  },
  {
    type: 'random_qa',
    position: 'frontend',
    targetCompany: '阿里巴巴',
    jobDescription: '负责前端架构设计与性能优化，要求深入理解 React 生态和工程化',
    turns: [
      {
        kind: 'system',
        text: '接下来进入技术问答环节。',
        phase: null,
        state: 'QNA_TECH',
      },
      {
        kind: 'interviewer_main',
        text: '来说说 React 的 Fiber 架构解决了什么问题？',
        phase: 'q_and_a',
        state: 'QNA_TECH',
      },
      {
        kind: 'candidate',
        text: 'Fiber 架构主要解决了 React 15 之前递归渲染不可中断的问题。在 Fiber 之前，React 的更新是同步的，如果组件树很深，主线程会被长时间占用，导致页面卡顿。\n\nFiber 把渲染工作拆分成小单元，每个单元执行完后会检查是否有更高优先级的任务（比如用户输入），如果有就中断当前渲染，先处理高优先级任务。这样可以实现时间切片和优先级调度。',
        phase: 'q_and_a',
        state: 'QNA_TECH',
      },
      {
        kind: 'interviewer_followup',
        text: 'Fiber 的 diff 算法和之前的栈 diff 有什么区别？',
        phase: 'q_and_a',
        state: 'QNA_TECH',
      },
      {
        kind: 'candidate',
        text: '主要区别是遍历方式。栈 diff 是递归深度优先遍历，不可中断。Fiber diff 是把每个节点包装成一个 Fiber 节点，通过链表结构连接（child、sibling、return），用循环代替递归，可以在任意节点暂停和恢复。\n\n另外 Fiber 引入了双缓冲机制，当前屏幕上显示的是 current tree，内存中构建的是 workInProgress tree，构建完成后直接切换指针，避免中间状态。',
        phase: 'q_and_a',
        state: 'QNA_TECH',
      },
      {
        kind: 'interviewer_main',
        text: '说说事件委托在 React 中是怎么实现的？',
        phase: 'q_and_a',
        state: 'QNA_TECH',
      },
      {
        kind: 'candidate',
        text: 'React 用的是自定义合成事件系统，把所有事件都委托到 document（React 17 之后是 root 容器）上。\n\n这样做的好处是：\n1. 跨浏览器兼容性，React 自己封装了一层事件对象\n2. 可以统一处理事件池复用（React 17 之前）\n3. 方便实现事件冒泡和捕获的统一管理\n\n当事件触发时，React 会通过事件源 DOM 节点找到对应的 Fiber 节点，然后向上遍历收集所有事件处理函数，按捕获-目标-冒泡的顺序执行。',
        phase: 'q_and_a',
        state: 'QNA_TECH',
      },
      {
        kind: 'interviewer_followup',
        text: 'React 18 的 Concurrent Features 你了解吗？useTransition 和 useDeferredValue 的区别是什么？',
        phase: 'q_and_a',
        state: 'QNA_TECH',
      },
      {
        kind: 'candidate',
        text: 'React 18 引入了并发渲染，允许同时存在多个版本的 UI。useTransition 和 useDeferredValue 都是用来处理非紧急更新的。\n\nuseTransition 是命令式的，包裹一个状态更新，告诉 React 这个更新可以延迟。返回一个 isPending 状态和一个 startTransition 函数。\n\nuseDeferredValue 是声明式的，接收一个值，返回一个延迟版本。React 会先用旧值渲染，空闲时再用新值渲染。\n\n区别在于 useTransition 用于控制状态更新时机，useDeferredValue 用于控制某个值的渲染优先级。',
        phase: 'q_and_a',
        state: 'QNA_TECH',
      },
    ],
  },
  {
    type: 'full',
    position: 'frontend',
    targetCompany: '阿里巴巴',
    jobDescription: '负责前端架构设计与性能优化，要求深入理解 React 生态和工程化',
    turns: [
      // 自我介绍
      {
        kind: 'system',
        text: '你好，我是今天的面试官。请先做个简单的自我介绍。',
        phase: null,
        state: 'SELF_INTRO',
      },
      {
        kind: 'interviewer_main',
        text: '你好，我是今天的面试官。请先做个简单的自我介绍。',
        phase: 'self_intro',
        state: 'SELF_INTRO',
      },
      {
        kind: 'candidate',
        text: '你好面试官，我叫李娜，毕业于浙江大学计算机专业。目前在阿里做前端开发，主要负责中后台系统的前端架构和移动端 H5 性能优化。\n\n在技术方面，我对 React 生态和前端工程化有比较深入的理解。主导过微前端架构改造，也做过大促 H5 页面的性能优化，首屏从 3.5s 优化到 1.2s。希望能加入贵团队，挑战更复杂的前端架构问题。',
        phase: 'self_intro',
        state: 'SELF_INTRO',
      },
      {
        kind: 'interviewer_main',
        text: '感谢你的介绍。接下来请介绍一下你的项目经历。',
        phase: 'self_intro',
        state: 'SELF_INTRO',
      },
      // 项目 1
      {
        kind: 'candidate',
        text: '好的。我介绍企业级中后台管理系统的重构项目。这个项目背景是我们有多个中后台系统，技术栈不统一，维护成本高。我主导引入了微前端架构，基于 qiankun 整合子应用，同时封装了统一的业务组件库。最终开发效率提升 40%，UI 不一致 bug 减少 60%。',
        phase: 'project_single',
        state: 'PROJECT_SINGLE_1',
        projectId: null,
      },
      {
        kind: 'interviewer_followup',
        text: '微前端改造过程中最大的技术难点是什么？',
        phase: 'project_single',
        state: 'PROJECT_SINGLE_1',
      },
      {
        kind: 'candidate',
        text: '最大的难点是样式隔离和 JS 沙箱。不同子应用可能用不同版本的 UI 库，样式容易冲突。我们用了 postcss-prefix-wrap 加前缀 + qiankun 的 sandbox 解决。\n\n另一个难点是公共依赖的共享。我们通过 webpack externals 把 React、组件库等打出来，子应用通过 window 访问，但这也限制了子应用独立升级依赖版本。',
        phase: 'project_single',
        state: 'PROJECT_SINGLE_1',
      },
      // 项目 2
      {
        kind: 'interviewer_main',
        text: '好的，再聊聊 H5 性能优化。',
        phase: 'project_single',
        state: 'PROJECT_SINGLE_2',
      },
      {
        kind: 'candidate',
        text: 'H5 活动页面的核心挑战是大促期间的高并发和首屏性能。我主要从四个方向优化：\n1. 路由懒加载 + 基于用户行为的预测预加载\n2. 图片 WebP + CDN + 渐进式加载\n3. 关键 CSS 内联，接口数据缓存和合并\n4. SSR 降级策略\n\n双十一 PV 峰值 100万/小时，崩溃率 0.01%。',
        phase: 'project_single',
        state: 'PROJECT_SINGLE_2',
        projectId: null,
      },
      // 技术问答
      {
        kind: 'interviewer_main',
        text: '项目部分我们就聊到这里。接下来进入技术问答环节。说说 React 的 Fiber 架构。',
        phase: 'q_and_a',
        state: 'QNA_TECH',
      },
      {
        kind: 'candidate',
        text: 'Fiber 架构解决了 React 15 同步递归渲染不可中断的问题。通过把渲染拆分成小单元，实现时间切片和优先级调度。同时引入双缓冲机制，用 workInProgress tree 和 current tree 切换，避免中间状态。',
        phase: 'q_and_a',
        state: 'QNA_TECH',
      },
      {
        kind: 'interviewer_followup',
        text: 'React 18 的自动批处理是什么？和之前的批处理有什么区别？',
        phase: 'q_and_a',
        state: 'QNA_TECH',
      },
      {
        kind: 'candidate',
        text: 'React 18 之前，只有 React 事件处理函数中的 setState 会自动批处理。如果在 setTimeout 或 Promise 中多次 setState，每次都会触发一次重新渲染。\n\nReact 18 的自动批处理通过 createRoot 实现，把所有 setState 的更新先放入队列，在事件循环的下一个 tick 统一处理。这样无论在什么场景下多次 setState，都只会触发一次重新渲染。',
        phase: 'q_and_a',
        state: 'QNA_TECH',
      },
      {
        kind: 'interviewer_main',
        text: '今天的面试就到这里，感谢你的时间。',
        phase: 'q_and_a',
        state: 'QNA_TECH',
      },
      {
        kind: 'system',
        text: '今天的面试就到这里，感谢你的时间。',
        phase: null,
        state: 'END',
      },
    ],
  },
]

// ============================================================
// Seed 执行逻辑
// ============================================================

function createDemoUser(db: DatabaseSync, user: (typeof DEMO_USERS)[number]): void {
  const now = Date.now()
  db.prepare(
    'INSERT OR IGNORE INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(user.id, user.email, user.name, hashPassword(user.password), now)
}

function createDemoResume(
  db: DatabaseSync,
  userId: string,
  resumeData: (typeof DEMO_USERS)[number]['resume'],
  projects: (typeof DEMO_USERS)[number]['projects'],
): string {
  const resumeRepo = createResumeRepository(db)

  // 创建简历（内部同时创建项目）
  const resume = resumeRepo.create(
    {
      ownerId: userId,
      title: resumeData.title,
      rawText: resumeData.rawText,
      sourceFormat: resumeData.sourceFormat,
    },
    projects.map((p) => ({ name: p.name, period: p.period, role: p.role, summary: p.summary, keywords: p.keywords })),
  )

  return resume.id
}

function createDemoTraining(
  db: DatabaseSync,
  userId: string,
  resumeId: string,
  sessionData: SimulatedSession,
  projectIdMap: Map<string, string>,
): string {
  const trainingRepo = createTrainingRepository(db)

  const session = trainingRepo.createSession({
    ownerId: userId,
    type: sessionData.type,
    position: sessionData.position,
    targetCompany: sessionData.targetCompany,
    jobDescription: sessionData.jobDescription,
    resumeId,
  })

  trainingRepo.start(session.id)

  // 创建对话轮次
  for (const [i, turn] of sessionData.turns.entries()) {
    const pid = turn.projectId === null ? null : projectIdMap.get(turn.projectId ?? '') ?? null

    trainingRepo.createTurn({
      sessionId: session.id,
      index: i,
      kind: turn.kind,
      text: turn.text,
      phase: turn.phase,
      state: turn.state,
      projectId: pid,
      questionId: turn.questionId ?? null,
      topic: turn.topic ?? null,
    })
  }

  trainingRepo.end(session.id)
  trainingRepo.updateState(session.id, { currentState: 'END' })

  return session.id
}

async function generateDemoReviews(
  db: DatabaseSync,
  userId: string,
  sessionId: string,
  sessionData: SimulatedSession,
  projectIdMap: Map<string, string>,
): Promise<void> {
  const trainingRepo = createTrainingRepository(db)
  const phaseReviewRepo = createPhaseReviewRepository(db)
  const fullReviewRepo = createFullReviewRepository(db)
  const v3TrendRepo = createV3TrendRepository(db)

  const session = trainingRepo.getById(sessionId)
  if (!session) return

  const phaseTurnsMap = new Map<string, typeof session.turns>()
  const PHASE_TO_TYPE: Record<string, string> = {
    'self_intro': 'self_intro',
    'project_single': 'project_qa',
    'project_cross': 'project_qa',
    'q_and_a': 'random_qa',
  }

  for (const turn of session.turns) {
    const phaseType = PHASE_TO_TYPE[turn.phase ?? '']
    if (!phaseType) continue
    if (!phaseTurnsMap.has(phaseType)) phaseTurnsMap.set(phaseType, [])
    phaseTurnsMap.get(phaseType)!.push(turn)
  }

  const phaseTypes = resolvePhaseTypes(sessionData.type)
  const phaseResults: Array<{
    phaseType: string
    phaseIndex: number
    result: import('../reviews/phase-generator.ts').PhaseReviewResult
    reviewId: string
  }> = []

  for (const [i, phaseType] of phaseTypes.entries()) {
    const phaseTurns = phaseTurnsMap.get(phaseType) ?? []
    if (phaseTurns.length === 0) continue

    let projectInfo: string | undefined
    let questions: string | undefined

    if (phaseType === 'project_qa') {
      const projectRepo = createProjectRepository(db)
      const pids = [...new Set(phaseTurns.map((t) => t.project_id).filter(Boolean))]
      if (pids.length > 0) {
        const projects = pids.map((pid) => projectRepo.getById(pid!)).filter((p) => p !== null)
        projectInfo = projects
          .map((p) => {
            const keywords = p!.keywords ? (JSON.parse(p!.keywords) as string[]) : []
            return `- ${p!.name}${p!.role ? ` (${p!.role})` : ''}${p!.summary ? `: ${p!.summary}` : ''}${keywords.length > 0 ? ` [${keywords.join(', ')}]` : ''}`
          })
          .join('\n')
      }
    }

    const firstTurn = phaseTurns[0]!
    const lastTurn = phaseTurns[phaseTurns.length - 1]!
    const elapsedMinutes = Math.max(1, Math.floor((lastTurn.created_at - firstTurn.created_at) / 60000))

    try {
      const result = await generatePhaseReview({
        phaseType,
        phaseIndex: i,
        position: sessionData.position,
        targetCompany: sessionData.targetCompany,
        jobDescription: sessionData.jobDescription,
        turns: phaseTurns.map((t) => ({ kind: t.kind, text: t.text, index: t.index })),
        projectInfo,
        questions,
        elapsedMinutes,
      })

      const phaseReview = phaseReviewRepo.create({
        sessionId: sessionId,
        phaseType,
        phaseIndex: i,
        scores: result.scores,
        totalScore: result.totalScore,
        evaluation: result.evaluation,
        interviewerReflection: result.interviewerReflection,
        improvementSuggestions: result.improvementSuggestions,
        rubricVersion: 'v3-phase',
        coachVersion: phaseType === 'self_intro' ? 'introduction-coach' : 'interview-coach',
      })

      phaseResults.push({ phaseType, phaseIndex: i, result, reviewId: phaseReview.id })
    } catch (e) {
      console.error(`[demo-seed] 阶段复盘生成失败 (${phaseType}):`, e)
    }
  }

  // 整面复盘
  if (sessionData.type === 'full' && phaseResults.length > 0) {
    const elapsedMinutes = session.started_at
      ? Math.floor((Date.now() - session.started_at) / 60000)
      : 0

    try {
      const fullResult = await generateFullReview({
        position: sessionData.position,
        targetCompany: sessionData.targetCompany,
        jobDescription: sessionData.jobDescription,
        phaseResults: phaseResults.map((p) => ({
          phaseType: p.phaseType,
          phaseIndex: p.phaseIndex,
          result: p.result,
        })),
        sessionInfo: {
          type: sessionData.type,
          totalTurns: session.turns.length,
          elapsedMinutes,
          trainingType: sessionData.type,
        },
      })

      const fullReview = fullReviewRepo.create({
        sessionId: sessionId,
        phaseReviewIds: phaseResults.map((p) => p.reviewId),
        phaseScoresSummary: phaseResults.map((p) => ({
          phaseType: p.phaseType,
          score: p.result.totalScore,
          duration: 0,
        })),
        coherenceScore: fullResult.coherenceScore,
        jdMatchScore: fullResult.jdMatchScore,
        overallPersona: fullResult.overallPersona,
        consolidatedImprovements: fullResult.consolidatedImprovements,
        overallEvaluation: fullResult.overallEvaluation,
        overallScore: fullResult.overallScore,
      })

      // V3 趋势快照
      for (const { phaseType, result, reviewId: prid } of phaseResults) {
        v3TrendRepo.createPhaseSnapshots(
          userId,
          sessionId,
          prid,
          phaseType,
          result.scores.map((s) => ({ dimension: s.dimension, score: s.score })),
        )
      }

      v3TrendRepo.createFullSnapshots(
        userId,
        sessionId,
        fullReview.id,
        [
          { metric: 'overall_score', value: fullResult.overallScore },
          { metric: 'coherence_score', value: fullResult.coherenceScore },
          { metric: 'jd_match_score', value: fullResult.jdMatchScore },
        ],
      )
    } catch (e) {
      console.error('[demo-seed] 整面复盘生成失败:', e)
    }
  }
}

function resolvePhaseTypes(type: string): Array<'self_intro' | 'project_qa' | 'random_qa'> {
  switch (type) {
    case 'full': return ['self_intro', 'project_qa', 'random_qa']
    case 'self_intro': return ['self_intro']
    case 'project_qa': return ['project_qa']
    case 'random_qa': return ['random_qa']
    default: return []
  }
}

// ============================================================
// 公开 API
// ============================================================

export interface SeedResult {
  seeded: boolean
  users: number
  resumes: number
  projects: number
  sessions: number
  reviewsGenerated: boolean
}

export async function seedDemoData(db: DatabaseSync, opts?: { skipReviews?: boolean }): Promise<SeedResult> {
  // 检查是否已 seed
  const check = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE id LIKE 'demo-user-%'").get() as { cnt: number }
  if (check.cnt > 0) {
    console.log('[demo-seed] Demo 数据已存在，跳过')
    return { seeded: false, users: 0, resumes: 0, projects: 0, sessions: 0, reviewsGenerated: false }
  }

  console.log('[demo-seed] 开始创建 Demo 数据...')

  let userCount = 0
  let resumeCount = 0
  let projectCount = 0
  let sessionCount = 0

  // 张伟
  {
    const user = DEMO_USERS[0]!
    createDemoUser(db, user)
    userCount++

    const resumeId = createDemoResume(db, user.id, user.resume, user.projects)
    resumeCount++
    projectCount += user.projects.length

    // 为每个 session 创建训练数据
    const projectIdMap = new Map<string, string>()
    const projectRepo = createProjectRepository(db)
    const projects = projectRepo.listByResumeId(resumeId)
    for (const [i, p] of projects.entries()) {
      if (i >= user.projects.length) break
      projectIdMap.set(String(i), p.id)
    }

    for (const sessionData of ZHANGWEI_SESSIONS) {
      const sessionId = createDemoTraining(db, user.id, resumeId, sessionData, projectIdMap)
      sessionCount++

      if (!opts?.skipReviews) {
        console.log(`[demo-seed] 为张伟生成 ${sessionData.type} 复盘...`)
        await generateDemoReviews(db, user.id, sessionId, sessionData, projectIdMap)
      }
    }
  }

  // 李娜
  {
    const user = DEMO_USERS[1]!
    createDemoUser(db, user)
    userCount++

    const resumeId = createDemoResume(db, user.id, user.resume, user.projects)
    resumeCount++
    projectCount += user.projects.length

    const projectIdMap = new Map<string, string>()
    const projectRepo = createProjectRepository(db)
    const projects = projectRepo.listByResumeId(resumeId)
    for (const [i, p] of projects.entries()) {
      if (i >= user.projects.length) break
      projectIdMap.set(String(i), p.id)
    }

    for (const sessionData of LINA_SESSIONS) {
      const sessionId = createDemoTraining(db, user.id, resumeId, sessionData, projectIdMap)
      sessionCount++

      if (!opts?.skipReviews) {
        console.log(`[demo-seed] 为李娜生成 ${sessionData.type} 复盘...`)
        await generateDemoReviews(db, user.id, sessionId, sessionData, projectIdMap)
      }
    }
  }

  console.log(`[demo-seed] Demo 数据创建完成: ${userCount} 用户, ${resumeCount} 简历, ${projectCount} 项目, ${sessionCount} 训练`)

  return {
    seeded: true,
    users: userCount,
    resumes: resumeCount,
    projects: projectCount,
    sessions: sessionCount,
    reviewsGenerated: !opts?.skipReviews,
  }
}
