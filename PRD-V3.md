# byteready V3 产品需求文档（PRD）

> 版本：v3.0 | 日期：2026-05-10 | 前置：V2 阶段化面试+语音+项目一等公民已落地

---

## 1. V3 迭代总览

| 维度 | V2 | V3 |
|:---|:---|:---|
| 训练形式 | 整面模拟面试（固定3阶段） | **阶段面试可独立训练 + 整面上下文连贯** |
| 训练背景 | 岗位+目标公司 | **+ 岗位描述（JD）可选输入** |
| 评价体系 | 面试结束统一复盘 | **每个阶段结束即复盘 + 整面额外复盘** |
| 复盘结构 | 单份报告 | **阶段复盘 + 整面复盘 双轨** |
| 趋势分析 | 跨场面试趋势 | **阶段级趋势 + 整面趋势 双轨** |
| 演示数据 | 需用户自己创建 | **默认预填 demo 数据，开箱展示** |
| LLM 角色 | 单一面试官 | **interviewer-persona + 多 coach 角色** |

**核心原则**：阶段可独立、上下文可连贯、评价即时、复盘分层、趋势长期追踪。

---

## 2. 默认预填数据（Demo 账号）

### 2.1 目标

新用户注册后，默认获得一份**完整的 demo 数据集**，无需任何操作即可体验全部功能。

### 2.2 预填内容

| 数据类型 | 数量 | 内容 |
|:---|:---|:---|
| 简历 | 1 份 | 完整的 demo 简历（含联系信息/教育/工作/技能/3-5个项目） |
| 项目 | 3-5 个 | 与简历关联，覆盖不同技术栈 |
| 阶段面试 | 5-8 场 | 涵盖三种阶段类型（自我介绍/项目问答/随机问答） |
| 整面面试 | 2-3 场 | 完整的整面记录，含所有阶段 |
| 阶段复盘 | 5-8 份 | 对应阶段面试的复盘报告 |
| 整面复盘 | 2-3 份 | 对应整面面试的复盘报告 |
| 趋势数据 | 足够画折线 | 5-8 个数据点，覆盖阶段趋势和整面趋势 |

### 2.3 实现方式

- 用户注册时，后端自动为 `owner_id` 克隆 demo 数据
- Demo 数据存储在 `apps/server/seeds/demo-data.ts`，与题库 seed 同级
- 数据隔离：`owner_id` 隔离，demo 数据不可被其他用户看到

---

## 3. 训练背景输入扩展

### 3.1 新增字段

创建训练时，除 V2 已有的 `position`（岗位）和 `target_company`（目标公司）外，新增：

| 字段 | 类型 | 必填 | 说明 |
|:---|:---|:---|:---|
| `job_description` | text | 可选 | 岗位描述（JD），用户可粘贴或上传 |
| `interviewer_persona_id` | uuid | 可选 | 选择的面试官人格（V3 新增，见第6节） |

### 3.2 JD 的用途

- **注入 LLM 上下文**：`job_description` 与 `position` + `target_company` 一起注入 interviewer-persona
- **题库筛选**：如有 JD，从题库抽题时优先匹配 JD 中提到的技术关键词
- **复盘对标**：复盘时对比候选人的回答与 JD 要求的技能匹配度

### 3.3 创建训练表单

```
[训练类型]  单选：整面 / 自我介绍 / 项目问答 / 随机问答
[岗位]      下拉选择
[目标公司]  文本输入（可选）
[岗位描述]  文本域，支持粘贴 JD（可选）
[面试官风格] 下拉选择 persona（可选，默认标准）
[关联简历]  下拉选择（可选）
[关联项目]  多选（项目问答时必填）
```

---

## 4. 训练形式解耦：阶段面试 + 整面

### 4.1 训练类型

| 训练类型 | 标识 | 包含阶段 | 上下文 |
|:---|:---|:---|:---|
| **整面** | `full` | 自我介绍 → 项目问答 → 随机问答（全部） | 阶段间上下文连贯传递 |
| **自我介绍** | `self_intro` | 仅自我介绍 | 无前置上下文 |
| **项目问答** | `project_qa` | 仅项目问答（可选单项目或多项目） | 可选加载简历上下文 |
| **随机问答** | `random_qa` | 仅随机问答（技术/算法/场景） | 可选加载前置阶段摘要 |

### 4.2 整面的上下文连贯

整面训练时，阶段间通过**上下文摘要**传递信息：

```
[自我介绍结束] → 生成 summary_self_intro
  → 注入 PROJECT_QA 的 LLM 上下文："候选人自我介绍要点：{summary_self_intro}"

[项目问答结束] → 生成 summary_project_qa
  → 注入 RANDOM_QA 的 LLM 上下文："候选人项目经历要点：{summary_project_qa}"
```

**summary 内容**：
- `summary_self_intro`：候选人的核心背景、求职动机、亮点关键词（由 LLM 在阶段结束时生成，50-100字）
- `summary_project_qa`：讨论过的项目、暴露的技术盲区、表现评估（由 LLM 在阶段结束时生成，100-150字）

### 4.3 阶段面试的独立运行

阶段面试不依赖其他阶段，可独立启动：

```
【自我介绍训练】
用户选择"自我介绍" → 仅加载岗位/公司/JD/persona 上下文
  → 进入 SELF_INTRO 状态
  → 候选人完成自我介绍
  → 结束 → 触发自我介绍复盘

【项目问答训练】
用户选择"项目问答" → 选择要练的项目（单选或多选）
  → 可选加载简历上下文
  → 进入 PROJECT_SINGLE_1 / PROJECT_SINGLE_2 / PROJECT_CROSS
  → 项目深挖/交叉追问
  → 结束 → 触发项目问答复盘

【随机问答训练】
用户选择"随机问答" → 选择主题偏好（八股/算法/场景/混合）
  → 可选加载前置阶段摘要（如用户已完成自我介绍训练）
  → 进入 QNA_TECH / QNA_ALGO / QNA_SCENE 轮转
  → 结束 → 触发随机问答复盘
```

### 4.4 数据模型：统一 + 区分

```
TrainingSession {
  id, owner_id,
  type: "full" | "self_intro" | "project_qa" | "random_qa",
  position, target_company, job_description,
  persona_id,
  resume_id, project_ids,
  status: "pending" | "running" | "ended",
  current_phase: string,          // 当前运行到的阶段
  context_summary: {              // 阶段间传递的上下文摘要
    self_intro?: string,
    project_qa?: string,
  },
  parent_session_id?: uuid,       // 如是阶段面试，可关联到整面（可选）
  started_at, ended_at, created_at
}

TrainingTurn {
  id, session_id, index, kind, text, audio_meta,
  phase: "self_intro" | "project_single" | "project_cross" | "qna",
  state: string,                  // 细化状态，同 V2
  project_id?, project_ids?, topic?, question_id?
}

PhaseRecord {                      // 阶段级记录（整面时每个阶段一条）
  id, session_id,
  phase_type: "self_intro" | "project_qa" | "random_qa",
  phase_index: integer,           // 整面中的顺序（自我介绍=0，项目问答=1，随机问答=2）
  start_turn_index: integer,      // 该阶段开始的 turn index
  end_turn_index: integer,        // 该阶段结束的 turn index
  context_in: string,             // 进入该阶段时注入的上下文
  context_out: string,            // 该阶段结束时生成的摘要
  status: "running" | "ended",
}
```

### 4.5 状态机调整

V2 的状态机用于**整面**。V3 中状态机根据 `type` 动态激活：

```
// 整面（full）
IDLE → SELF_INTRO → PROJECT_SINGLE_1 → PROJECT_SINGLE_2 → PROJECT_CROSS
  → QNA_TECH → QNA_ALGO → QNA_SCENE → END

// 自我介绍（self_intro）
IDLE → SELF_INTRO → END

// 项目问答（project_qa）
IDLE → PROJECT_SINGLE_1 → [PROJECT_SINGLE_2] → [PROJECT_CROSS] → END

// 随机问答（random_qa）
IDLE → QNA_TECH → QNA_ALGO → QNA_SCENE → [循环] → END
```

---

## 5. 评价体系

### 5.1 评价体系文件

评价体系以 prompt 文件形式存储在 `apps/server/src/skills/` 目录：

```
apps/server/src/skills/
├── interviewer-persona/           # 面试官人格
│   ├── standard.ts                # 标准严肃型
│   ├── friendly.ts                # 亲和引导型
│   └── aggressive.ts              # 压力挑战型
├── interviewer-review/            # 面试官视角评价
│   ├── self-intro-rubric.ts       # 自我介绍评分标准
│   ├── project-qa-rubric.ts       # 项目问答评分标准
│   └── random-qa-rubric.ts        # 随机问答评分标准
├── interview-coach/               # 面试教练（项目/随机问答）
│   ├── project-analysis.ts        # 项目分析 coach
│   ├── technical-feedback.ts      # 技术反馈 coach
│   └── improvement-plan.ts        # 提升计划 coach
├── introduction-coach/            # 自我介绍教练
│   ├── structure-analysis.ts      # 结构分析
│   ├── expression-feedback.ts     # 表达反馈
│   └── polish-suggestions.ts      # 润色建议
└── full-review/                   # 整面评价
    ├── coherence-evaluation.ts    # 连贯性评价
    └── overall-improvement.ts     # 整体提升建议
```

### 5.2 三种阶段的评价体系

#### 5.2.1 自我介绍评价体系

**评价维度**：

| 维度 | 权重 | 考察点 |
|:---|:---|:---|
| 结构完整性 | 25% | 是否包含背景+动机+亮点+收尾 |
| 时长控制 | 20% | 是否在 1-3 分钟合理区间 |
| 信息密度 | 25% | 是否精炼、无冗余、无遗漏 |
| 表达流畅度 | 15% | 语速、停顿、填充词 |
| 个性化程度 | 15% | 是否针对目标岗位/公司定制 |

**输出三元组**（由 introduction-coach 生成）：
- **评价**：各维度得分（1-5分）+ 一句话总结
- **面试官复盘**："如果我是面试官，我会注意到..." "这部分让我印象深刻/困惑"
- **提升建议**：具体可执行的改进点，如"在第二段加入与目标岗位的关联""减少'然后'的使用"

#### 5.2.2 项目问答评价体系

**评价维度**：

| 维度 | 权重 | 考察点 |
|:---|:---|:---|
| 项目理解深度 | 25% | 对业务背景、技术选型、个人贡献的理解 |
| 技术深度 | 25% | 对所用技术原理、边界条件、优化空间的掌握 |
| 表达结构 | 20% | STAR 法则应用、逻辑层次、详略得当 |
| 追问应对 | 20% | 对深层追问的回应质量、知识盲区处理 |
| 项目间关联 | 10% | 跨项目的技术迁移、对比、架构视野 |

**输出三元组**（由 interview-coach 生成）：
- **评价**：各维度得分 + 项目复述质量（简历 vs 面试的匹配度）
- **面试官复盘**："追问到第三层时候选人开始模糊，这是常见的盲区"
- **提升建议**："建议补充量化的业务指标""技术选型时需要对比方案的劣势"

#### 5.2.3 随机问答评价体系

**评价维度**：

| 维度 | 权重 | 考察点 |
|:---|:---|:---|
| 知识准确度 | 30% | 概念、原理、公式是否正确 |
| 思维深度 | 25% | 是否触及本质、能否举一反三 |
| 表达清晰度 | 20% | 逻辑层次、举例恰当、无歧义 |
| 边界意识 | 15% | 是否主动提及边界条件、例外情况 |
| 与岗位匹配 | 10% | 回答是否与 JD 要求的技术栈对齐 |

**输出三元组**（由 interview-coach 生成）：
- **评价**：各维度得分 + 知识点覆盖度
- **面试官复盘**："这个问题的标准答法应包含 X，候选人提到了 Y 但遗漏了 Z"
- **提升建议**："建议补充 XXX 的边缘 case""可以用 XXX 的实际案例来支撑"

### 5.3 interviewer-persona

面试官人格定义了 LLM 在面试过程中的语气、追问风格、压力程度。

```
// standard.ts
{
  name: "标准严肃型",
  tone: "专业、冷静、客观",
  follow_up_style: "层层递进，从概念到实现到优化",
  pressure_level: "中等，偶尔施压测试",
  transition_style: "简洁过渡，不闲聊",
  system_prompt: "你是一位资深的 {position} 面试官..."
}

// friendly.ts
{
  name: "亲和引导型",
  tone: "温和、鼓励、引导",
  follow_up_style: "引导式追问，给提示",
  pressure_level: "低，允许思考时间",
  transition_style: "鼓励性过渡",
  system_prompt: "..."
}

// aggressive.ts
{
  name: "压力挑战型",
  tone: "直接、挑战、快节奏",
  follow_up_style: "连续追问，不容模糊",
  pressure_level: "高，快速切换",
  transition_style: "简短甚至略显生硬",
  system_prompt: "..."
}
```

**加载方式**：创建训练时选择 persona，整个 session 的 LLM system prompt 以 persona 为基底。

### 5.4 阶段结束后的后台复盘流程

```
阶段结束（用户点击结束或超时）
  → 状态标记为 ended
  → 异步触发复盘任务

复盘任务：
  1. 加载该阶段的完整 transcript
  2. 加载 interviewer-review 评分标准（根据阶段类型）
  3. 加载对应 coach（self_intro → introduction-coach；project_qa/random_qa → interview-coach）
  4. 并行调用 LLM：
     - Call A：interviewer-review → 生成评分 + 面试官复盘
     - Call B：coach → 生成提升建议
  5. 合并为（评价；面试官复盘；提升）三元组
  6. 写入 PhaseReview 表
  7. 前端通过轮询或 WebSocket 通知复盘完成
```

### 5.5 整面额外评价

整面结束时，除各阶段已有复盘外，额外生成：

| 评价维度 | 说明 |
|:---|:---|
| 阶段间连贯性 | 自我介绍说的和项目问答说的是否一致 |
| 整体技术画像 | 综合所有阶段，勾勒候选人的技术能力轮廓 |
| 成长建议优先级 | 汇总各阶段的提升建议，按影响排序 |
| JD 匹配度 | 候选人的整体表现与 JD 要求的差距分析 |

由 `full-review/coherence-evaluation.ts` 和 `full-review/overall-improvement.ts` 驱动。

---

## 6. 复盘：双轨体系

### 6.1 阶段复盘

每个阶段面试结束后生成一份**阶段复盘报告**。

**报告结构**：

```
## 训练信息
- 类型：自我介绍 / 项目问答 / 随机问答
- 岗位：{position}
- 目标公司：{target_company}
- 面试官风格：{persona_name}
- 时长：{elapsed_time}

## 评价
| 维度 | 得分 | 权重 | 加权得分 |
|:---|:---|:---|:---|
| ... | 4.2/5 | 25% | 1.05 |
| 总分 | | | {weighted_total}/5 |

## 面试官复盘
- "作为面试官，我的观察是..."
- "候选人在这个阶段的亮点是..."
- "让我印象不深/困惑的是..."

## 提升建议
1. [高优先级] ...
2. [中优先级] ...
3. [低优先级] ...

## 对话回顾（可选展开）
- Turn 1: ...
- Turn 2: ...
```

### 6.2 整面复盘

整面面试结束后，整合所有阶段的复盘，生成**整面复盘报告**。

**报告结构**：

```
## 面试概览
- 岗位：{position}
- 目标公司：{target_company}
- 面试官风格：{persona_name}
- 总时长：{elapsed_time}
- 阶段数：3

## 各阶段表现
| 阶段 | 得分 | 时长 | 关键标签 |
|:---|:---|:---|:---|
| 自我介绍 | 4.1/5 | 2:30 | 结构完整、语速偏快 |
| 项目问答 | 3.8/5 | 12:00 | 技术深度不足、STAR应用好 |
| 随机问答 | 3.5/5 | 15:00 | 边界意识弱、知识点覆盖不全 |

## 整面额外评价
- 阶段间连贯性：自我介绍中提到的"熟悉分布式系统"与项目问答中的实际表现一致性 70%
- JD 匹配度：与 JD 要求的技能匹配度 65%，差距主要在 XXX
- 整体技术画像：{LLM 生成的画像描述}

## 优先级提升建议（去重+排序）
1. [所有阶段共同指向] 加强边界条件意识
2. [项目问答+随机问答共同指向] 补充 XXX 技术原理
3. [自我介绍独有] 控制语速，减少填充词

## 趋势对比（如有历史数据）
- 与上一场整面相比：总分 +0.3，项目问答 +0.5（进步最大）
```

### 6.3 数据模型

```
PhaseReview {                      // 阶段复盘
  id, session_id,
  phase_type: "self_intro" | "project_qa" | "random_qa",
  phase_index: integer,

  // 评价（结构化）
  scores: json,                     // [{ dimension, score, weight, weighted }]
  total_score: number,              // 加权总分

  // 三元组
  evaluation: string,               // 评价总结
  interviewer_reflection: string,   // 面试官复盘
  improvement_suggestions: json,    // [{ priority, suggestion, related_turn_index? }]

  // 元数据
  rubric_version: string,           // 评分标准版本
  coach_version: string,            // coach 版本
  generated_at: timestamp
}

FullReview {                       // 整面复盘
  id, session_id,

  // 阶段汇总
  phase_reviews: uuid[],            // 关联的 PhaseReview IDs
  phase_scores_summary: json,       // [{ phase_type, score, duration }]

  // 整面额外评价
  coherence_score: number,          // 阶段间连贯性得分
  jd_match_score: number,           // JD 匹配度
  overall_persona: string,          // 整体技术画像

  // 去重排序的提升建议
  consolidated_improvements: json,  // [{ priority, source_phases[], suggestion }]

  // 总评
  overall_evaluation: string,
  overall_score: number,
  generated_at: timestamp
}
```

---

## 7. 趋势分析：双轨长期追踪

### 7.1 阶段级趋势

用户可以按**阶段类型**查看长期趋势：

```
自我介绍趋势（最近 N 场）
- 结构完整性：3.5 → 3.8 → 4.0 → 4.2（折线）
- 时长控制：3.0 → 3.5 → 4.0 → 4.0
- 总分：3.5 → 3.8 → 4.1 → 4.2

项目问答趋势
- 技术深度：3.0 → 3.2 → 3.5 → 3.8
- 追问应对：2.8 → 3.0 → 3.2 → 3.5

随机问答趋势
- 知识准确度：3.5 → 3.5 → 3.8 → 4.0
- 边界意识：2.5 → 2.8 → 3.0 → 3.2（瓶颈）
```

**洞察**：
- 自动识别"进步最大维度"和"长期瓶颈维度"
- 跨阶段关联："自我介绍中提到的技术点，在随机问答中是否被验证"

### 7.2 整面级趋势

```
整面总分趋势（最近 N 场）
- 总分：3.2 → 3.5 → 3.8 → 4.0
- 阶段间连贯性：3.0 → 3.5 → 4.0 → 4.2
- JD 匹配度：50% → 55% → 60% → 65%
```

### 7.3 数据模型

```
PhaseTrendSnapshot {
  id, owner_id,
  phase_type: "self_intro" | "project_qa" | "random_qa",
  dimension: string,                // 评价维度名
  score: number,
  session_id, phase_review_id,
  created_at
}

FullTrendSnapshot {
  id, owner_id,
  metric: "total_score" | "coherence" | "jd_match",
  value: number,
  session_id, full_review_id,
  created_at
}
```

---

## 8. 用户场景验证

### 场景1：上传简历后做整面

```
用户上传简历 → 解析出 4 个项目
  → 创建"整面"训练
  → 选择岗位/公司/JD/persona
  → 进入整面流程
    → SELF_INTRO（2-3分钟）→ 结束 → 后台生成阶段复盘
    → PROJECT_SINGLE_1（项目A）→ PROJECT_SINGLE_2（项目B）→ PROJECT_CROSS → 结束 → 后台生成阶段复盘
    → QNA_TECH → QNA_ALGO → QNA_SCENE → 结束 → 后台生成阶段复盘
  → 整面结束 → 后台生成整面复盘
  → 用户查看：3份阶段复盘 + 1份整面复盘
  → Dashboard 更新：阶段趋势 + 整面趋势
```

### 场景2：只做自我介绍训练

```
用户点击"训练" → 选择"自我介绍"
  → 选择岗位/公司/JD/persona
  → 进入 SELF_INTRO（无其他阶段）
  → 完成 → 结束 → 后台生成自我介绍阶段复盘
  → 用户查看：1份阶段复盘
  → Dashboard 更新：自我介绍趋势
```

### 场景3：只做项目问答训练

```
用户点击"训练" → 选择"项目问答"
  → 选择要练的项目（勾选项目A和项目B）
  → 选择岗位/公司/persona
  → 可选加载简历上下文
  → 进入 PROJECT_SINGLE_1（项目A）→ PROJECT_SINGLE_2（项目B）→ PROJECT_CROSS
  → 结束 → 后台生成项目问答阶段复盘
  → 用户查看：1份阶段复盘
```

### 场景4：只做随机问答训练

```
用户点击"训练" → 选择"随机问答"
  → 选择主题偏好（八股/算法/场景/混合）
  → 选择岗位/公司/JD/persona
  → 可选加载前置阶段摘要（如之前自我介绍训练的 summary）
  → 进入 QNA_TECH → QNA_ALGO → QNA_SCENE → 循环
  → 结束 → 后台生成随机问答阶段复盘
```

---

## 9. UX 需求更新

### 9.1 新增/调整页面

| 页面 | 变更 |
|:---|:---|
| `/training` | 新增训练类型选择（整面/自我介绍/项目问答/随机问答） |
| `/training/new` | 创建表单新增：训练类型、JD输入、persona选择、主题偏好 |
| `/training/:id` | 根据类型显示不同状态机（整面显示阶段进度，阶段面试显示当前类型） |
| `/reviews` | 支持按"阶段复盘"和"整面复盘"过滤 |
| `/reviews/phase/:id` | 阶段复盘详情页 |
| `/reviews/full/:id` | 整面复盘详情页 |
| `/trends` | 支持切换"阶段趋势"和"整面趋势"视图 |
| `/personas` | 面试官人格列表和介绍（V3新增） |

### 9.2 训练中阶段感知

```
训练进行中页面：

[顶部状态栏]
训练类型：整面 | 当前阶段：项目问答（第2/3阶段）| 已用时间：18:30/45:00
阶段进度：[自我介绍✓] → [项目问答◉] → [随机问答○]

[主区域]
对话流...

[底部控制]
[按住说话]  [结束当前阶段]  [结束训练]

结束当前阶段：直接进入下一阶段（整面时）或结束训练（阶段面试时）
```

### 9.3 复盘通知

```
阶段结束后：
- Toast 通知："自我介绍复盘生成中，预计 10-30 秒..."
- 复盘完成后：Toast 更新 "复盘完成，点击查看"
- 整面结束后：类似通知
```

---

## 10. 实施节奏（约10周）

| Phase | 内容 | 周期 |
|:---|:---|:---|
| 1 | Demo 数据体系（预填脚本+数据构造） | 1周 |
| 2 | 训练类型解耦（数据模型+API+状态机调整） | 2周 |
| 3 | 评价体系基建（skills 目录+prompt 框架+评分标准） | 2周 |
| 4 | 阶段复盘（后台异步+三元组生成+前端展示） | 1.5周 |
| 5 | 整面复盘（整合逻辑+额外评价+去重排序） | 1周 |
| 6 | 趋势双轨（阶段趋势+整面趋势+洞察） | 1周 |
| 7 | 背景扩展（JD输入+persona选择+上下文注入） | 1周 |
| 8 | 联调+打磨 | 0.5周 |

---

## 11. 附录

### 11.1 术语表

| 术语 | 定义 |
|:---|:---|
| 阶段面试 | 仅包含一个阶段的独立训练（自我介绍/项目问答/随机问答） |
| 整面 | 包含所有阶段的完整面试训练 |
| persona | 面试官人格，定义语气/追问风格/压力程度 |
| 三元组 | （评价；面试官复盘；提升建议） |
| 阶段复盘 | 单个阶段结束后生成的复盘报告 |
| 整面复盘 | 整面结束后整合所有阶段+额外评价的复盘报告 |
| context_summary | 阶段间传递的上下文摘要 |
| rubric | 评分标准/评分量规 |

### 11.2 参考文档

| 文档 | 内容 |
|:---|:---|
| `PRD-1.md` | V1 产品需求总纲 |
| `PRD-V2.md` | V2 阶段化+语音+项目一等公民 |
| `docs/V1-Design.md` | V1 技术设计 |
| `apps/server/src/skills/` | V3 评价体系 prompt 文件（实施中产出） |
