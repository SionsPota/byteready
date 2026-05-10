# byteready V2 产品需求文档（PRD）

> 版本：v2.0 | 日期：2026-05-10 | 前置：V1 核心链路已跑通

---

## 1. V2 迭代总览

| 维度 | V1 | V2 |
|:---|:---|:---|
| 用户模型 | 岗位+**职级**+目标公司 | 岗位+目标公司，**移除职级** |
| 交互方式 | 纯文本回合制 | **语音输入+语音输出** |
| 核心实体 | 简历为主，项目是子属性 | **项目是一等公民**，简历是完整信息集合 |
| 简历信息 | 仅项目 | **项目+教育+工作+技能+联系方式** |
| 面试流程 | 抽题→问答 | **阶段化：自我介绍→项目介绍→问答** |
| 功能组织 | 面试/简历/复盘/趋势 各自独立 | **训练/项目与简历/复盘/探索** 四大模块 |
| 复盘对象 | 仅限面试 | **任何经历都可复盘** |
| 前端耦合 | 前后端紧耦合 | **UX 文档化，支持第三方前端自由设计 UI** |

**核心原则**：项目是一等公民；语音是默认交互；面试阶段化；复盘泛化；基建先行；UX 驱动，UI 自由。

---

## 2. 用户模型变更

**移除职级**
- 移除 `level` 字段（junior/mid/senior/expert）
- 题库不再按职级分类，LLM 根据对话动态调节追问深度
- UI 上移除所有职级选择器

**保留**：position（岗位，必选）、target_company（目标公司，可选）、resume_id（关联简历，可选）
**新增**：project_ids（直接关联项目，可选）

---

## 3. 简历信息拓展

### 3.1 核心变更

`Project` 从 `resume_projects` 子表升级为独立实体。`Resume` 扩展为完整的个人信息档案，不只包含项目。

```
Resume {
  id, owner_id, title,
  raw_text, source_format, parsed_at,
  // 新增：结构化字段
  contact: { name, email, phone, location? },
  summary?: string,           // 个人简介
  educations: Education[],    // 教育经历
  experiences: Experience[],  // 工作经历
  skills: Skill[],            // 技能
  project_ids: uuid[],        // 关联的项目（有序）
}

Project {
  id, owner_id, name, period, role, summary, keywords,
  source, source_resume_id
}

Education {
  school: string,      // 学校
  major: string,       // 专业
  degree: string,      // 学位
  period: string,      // 时间段
}

Experience {
  company: string,     // 公司
  title: string,       // 职位
  period: string,      // 时间段
  description: string, // 工作描述
}

Skill {
  name: string,        // 技能名称
  level?: string,      // 熟练度（可选）
}
```

### 3.2 简历解析 Pipeline（三阶段）

```
[输入] PDF/DOCX/纯文本
    ↓
Stage 1: 文档 → 纯文本（pdf-parse / mammoth / 直接接收）
    ↓
Stage 2: 纯文本 → 结构化 JSON（Kimi + zod schema）
    - contact { name, email, phone }
    - summary: string
    - educations [{ school, major, degree, period }]
    - experiences [{ company, title, period, description }]
    - skills [{ name, level? }]
    - projects [{ name, period, role, summary, keywords[] }]
    ↓
Stage 3: 落库
    - Resume 主表（含结构化字段）
    - Project 独立表（批量 insert）
    - raw_text 保留
```

**失败处理**：Stage 1/2 失败时，只保存 raw_text，标记 `parsed_at = null`，用户可手动填写或重新解析。

### 3.3 用户可编辑内容

用户可在简历详情页编辑所有字段：
- 联系信息、个人简介
- 教育经历（增删改）
- 工作经历（增删改）
- 技能（增删改）
- 项目（增删改，见第4节）

### 3.4 页面路由

- `/resumes` → 简历列表
- `/resumes/:id` → 简历详情（展示所有信息板块）
- `/resumes/:id/edit` → 简历编辑（所有字段可编辑）
- `/projects` → 项目列表（独立管理）
- `/projects/:id` → 项目详情
- `/projects/new` → 手动创建项目

---

## 4. 项目：一等公民

### 4.1 核心能力

| 能力 | V1 | V2 |
|:---|:---|:---|
| 从简历解析项目 | 有（生成子表） | 保留，生成独立 Project |
| 手动创建项目 | 无 | **新增** |
| 编辑项目 | 有 | 保留 |
| 删除项目 | 无 | **新增** |
| 项目复用（多简历） | 无 | **新增** |
| 项目直接关联面试 | 无 | **新增** |
| 简历重新解析 | 无 | **新增** |

### 4.2 面试中的项目引用

模拟面试的"项目介绍"阶段，显式展示用户的项目列表，用户选择要介绍的项目：

```
面试官："请介绍一下你的项目经历。"
[系统展示项目列表]
候选人选择："我想介绍 Project A"
→ 进入项目深挖阶段
→ 该项目的所有信息（name/summary/keywords/role）注入 LLM prompt
→ LLM 围绕该项目追问
→ 记录：用户介绍了 Project A，问答内容关联 project_id
```

**复盘时**：对照简历中的项目信息，分析"面试中讲述的 vs 简历中写的"匹配度。

---

## 5. 模拟面试流程阶段化

### 5.1 状态机总览

面试流程由**状态机**驱动，每个状态有明确的进入条件、LLM 行为、退出条件。状态上下文实时注入 LLM，确保面试官"知道现在在哪、已经聊过什么、接下来该问什么"。

```
[IDLE]                    -- 面试未开始
  → start()               -- 用户点击开始面试
  → [SELF_INTRO]

[SELF_INTRO]              -- 自我介绍阶段
  → candidate finishes    -- 候选人完成自我介绍
  → [PROJECT_SINGLE_1]

[PROJECT_SINGLE_1]        -- 项目深挖第一轮（第一个项目）
  → drill_complete        -- 该项目追问 3-5 轮后
  → [PROJECT_SINGLE_2]    -- 若还有第二个项目
  → [PROJECT_CROSS]       -- 若只有一个项目，跳过 SINGLE_2

[PROJECT_SINGLE_2]        -- 项目深挖第二轮（第二个项目）
  → drill_complete        -- 该项目追问 3-5 轮后
  → [PROJECT_CROSS]

[PROJECT_CROSS]           -- 项目交叉/对比（选 1-2 个项目关联问）
  → drill_complete        -- 交叉追问 2-4 轮后
  → [QNA_TECH]

[QNA_TECH]                -- 技术问答：八股文主题
  → topic_rotate          -- 该主题追问 3-5 轮后
  → [QNA_ALGO]

[QNA_ALGO]                -- 技术问答：算法主题
  → topic_rotate          -- 该主题追问 3-5 轮后
  → [QNA_SCENE]

[QNA_SCENE]               -- 技术问答：场景设计主题
  → topic_rotate          -- 该主题追问 3-5 轮后
  → [QNA_TECH]            -- 循环，直到时间到或用户结束

[END]                     -- 面试结束
  → auto_trigger_review   -- 自动触发复盘
```

**总时长**：30-45 分钟，用户可随时结束。超时强制进入 END。

---

### 5.2 状态定义与 LLM 上下文注入

每个状态下，系统构造**上下文状态对象**注入 LLM system prompt，让 LLM "知道现在在哪"。

#### 5.2.1 全局上下文（所有状态共用）

```
你是 {position} 岗位的资深面试官。
候选人简历摘要：{resume_summary}
候选人技能：{skills}
已进行的对话轮次：{total_turns}
当前时间：{elapsed_time} / 45分钟
```

#### 5.2.2 状态级上下文

| 状态 | 注入上下文 | LLM 行为约束 |
|:---|:---|:---|
| `SELF_INTRO` | `current_phase: "self_intro"` `instruction: "请候选人进行自我介绍，不要打断，不要提问。介绍结束后给出简短过渡语。"` | 不提问，听完。过渡语示例："感谢你的介绍，接下来我们聊聊你的项目经历。" |
| `PROJECT_SINGLE_1` | `current_phase: "project_single"` `current_project: {project_A}` `projects_discussed: [project_A]` `instruction: "围绕当前项目进行深度追问。每轮追问应比之前更深入，测试候选人的技术深度和 Ownership。"` | 基于 project_A 的 name/summary/keywords/role 生成追问。3-5 轮后给出过渡语，引导到下一个项目。 |
| `PROJECT_SINGLE_2` | `current_phase: "project_single"` `current_project: {project_B}` `projects_discussed: [project_A, project_B]` `instruction: "围绕当前项目进行深度追问，注意与上一个项目的对比空间（如技术选型差异）。"` | 基于 project_B 追问，可适度关联 project_A。3-5 轮后过渡。 |
| `PROJECT_CROSS` | `current_phase: "project_cross"` `selected_projects: [project_A, project_B]` `projects_discussed: [project_A, project_B]` `instruction: "选 1-2 个项目进行关联提问。考察候选人跨项目的架构视野、技术迁移能力、权衡思维。问题形式：对比、关联、假设迁移。"` | 例："Project A 用了 Redis，Project B 用了 Kafka，如果让你把 Project A 的缓存层换成 Kafka，你会怎么设计？" 2-4 轮后过渡。 |
| `QNA_TECH` | `current_phase: "qna"` `current_topic: "tech_basics"` `topics_covered: ["tech_basics"]` `instruction: "从八股文题库抽题，围绕岗位核心技术栈提问。追问应层层递进：概念→原理→应用→边界条件。"` | 从题库 category="bagua" 抽题。3-5 轮后切换主题。 |
| `QNA_ALGO` | `current_phase: "qna"` `current_topic: "algorithm"` `topics_covered: ["tech_basics", "algorithm"]` `instruction: "从算法题库抽题。考察候选人的编码思维、复杂度分析、优化意识。"` | 从题库 category="algorithm" 抽题。3-5 轮后切换。 |
| `QNA_SCENE` | `current_phase: "qna"` `current_topic: "system_design"` `topics_covered: ["tech_basics", "algorithm", "system_design"]` `instruction: "场景设计题。给出一个真实业务场景，让候选人设计系统架构。追问围绕：需求分析→架构选型→扩展性→容错。"` | 从题库 category="scene" 抽题，或 LLM 现场生成。3-5 轮后循环回 QNA_TECH。 |
| `END` | `current_phase: "ended"` | 不调用 LLM，直接触发复盘。 |

---

### 5.3 状态转换规则

| 转换 | 触发条件 | 过渡语示例 |
|:---|:---|:---|
| IDLE → SELF_INTRO | 用户点击"开始面试" | "你好，我是今天的面试官。请先做个简单的自我介绍。" |
| SELF_INTRO → PROJECT_SINGLE_1 | 候选人完成自我介绍（检测到"我的介绍完了"或沉默超时） | "感谢你的介绍。接下来请介绍一下你的项目经历，我们先从你最有代表性的项目开始。" |
| PROJECT_SINGLE_1 → PROJECT_SINGLE_2 | 该项目追问 3-5 轮后 | "好的，我们再聊聊另一个项目。" |
| PROJECT_SINGLE_1 → PROJECT_CROSS | 只有一个项目时，跳过 SINGLE_2 | "很好。现在我想把几个项目放在一起问问。" |
| PROJECT_SINGLE_2 → PROJECT_CROSS | 第二个项目追问 3-5 轮后 | "很好。现在我想把几个项目放在一起对比着问问。" |
| PROJECT_CROSS → QNA_TECH | 交叉追问 2-4 轮后 | "项目部分我们就聊到这里。接下来进入技术问答环节。" |
| QNA_TECH → QNA_ALGO | 八股主题追问 3-5 轮后 | "基础概念掌握得不错。我们来看一道算法题。" |
| QNA_ALGO → QNA_SCENE | 算法主题追问 3-5 轮后 | "算法部分聊完了。我们来聊一个场景设计题。" |
| QNA_SCENE → QNA_TECH | 场景主题追问 3-5 轮后 | "设计思路清晰。我们回到基础知识，再问几个深入的问题。" |
| 任意 → END | 用户点击"结束面试"或超时 45 分钟 | "今天的面试就到这里，感谢你的时间。" |

---

### 5.4 项目介绍阶段的特殊交互

#### 5.4.1 PROJECT_SINGLE 阶段

```
面试官（TTS）："请介绍一下你的项目经历，我们先从你最熟悉的一个开始。"

[系统展示项目列表]
候选人说/选择："我想介绍 Project A"
[ASR → 匹配 project_id → 状态设为 PROJECT_SINGLE_1 → project_A 注入 LLM 上下文]

面试官（TTS）："好的，请介绍一下 Project A 的背景和你的角色。"
... LLM 围绕 project_A 追问 3-5 轮 ...

[自动过渡]
面试官（TTS）："我们再聊聊另一个项目吧。"
[状态切换为 PROJECT_SINGLE_2 → 等待候选人选择/指定下一个项目]
```

#### 5.4.2 PROJECT_CROSS 阶段

```
[状态切换为 PROJECT_CROSS]
LLM 上下文注入：selected_projects: [project_A, project_B]

面试官（TTS）："Project A 和 Project B 都涉及高并发处理，
但一个用了 Redis 缓存，一个用了 Kafka 消息队列。
如果让你把 Project A 的缓存层改造成消息队列架构，
你会怎么权衡这两种方案的优劣？"

... 2-4 轮交叉追问 ...

面试官（TTS）："项目部分我们就聊到这里，接下来进入技术问答。"
[状态切换为 QNA_TECH]
```

**用户可主动切换**：在任意 PROJECT 状态下说"我想讲 Project C" → 系统识别意图 → 更新 `current_project` → 继续当前状态但换项目。

---

### 5.5 问答阶段的主题轮转

问答阶段不再是随机抽题，而是按**主题**轮转：

| 轮次 | 主题 | 来源 | 追问策略 |
|:---|:---|:---|:---|
| 第1轮 | 八股文（QNA_TECH） | 题库 category="bagua" | 概念→原理→应用→边界条件 |
| 第2轮 | 算法（QNA_ALGO） | 题库 category="algorithm" | 思路→编码→复杂度→优化 |
| 第3轮 | 场景设计（QNA_SCENE） | 题库 category="scene" 或 LLM 生成 | 需求→架构→扩展→容错 |
| 第4轮 | 回到八股文（更深） | 题库 | 基于前几轮表现调整难度 |
| ... | 循环直到结束 | ... | ... |

**主题上下文注入**：
```
current_topic: "algorithm"
topics_covered: ["tech_basics", "algorithm", "system_design", "tech_basics"]
instruction: "当前主题是算法。注意候选人之前回答八股文时暴露的知识盲区（如{weak_area}），本轮可适当关联。"
```

---

### 5.6 数据记录

`training_turns` 表记录完整状态信息：

```
turn {
  id, session_id, index, kind, text, audio_meta(json),
  phase: "self_intro" | "project_single" | "project_cross" | "qna",
  state: "SELF_INTRO" | "PROJECT_SINGLE_1" | "PROJECT_SINGLE_2" | "PROJECT_CROSS" | "QNA_TECH" | "QNA_ALGO" | "QNA_SCENE",
  project_id?: uuid,        // project_single / project_cross 时记录
  project_ids?: uuid[],     // project_cross 时记录关联的多个项目
  topic?: string,           // qna 时记录当前主题
  question_id?: uuid,       // qna 时记录关联的题库问题
}
```

**session 状态快照**（每次状态切换时写入）：
```
training_session {
  ...
  current_state: string,            // 当前状态机状态
  projects_discussed: uuid[],       // 已聊过的项目
  topics_covered: string[],         // 已覆盖的问答主题
  current_project_id?: uuid,        // 当前聚焦的项目
  current_topic?: string,           // 当前问答主题
}
```

---

### 5.7 复盘中利用状态数据

复盘报告按状态和主题组织：

```
## 一、自我介绍
- 时长：2分30秒
- 评估：内容完整性、结构清晰度、时长控制
- 建议：...

## 二、项目深挖
### Project A（PROJECT_SINGLE_1）
- 简历描述 vs 面试讲述（匹配度）
- 追问链条完整性（3轮追问的递进关系）
- 技术深度评估

### Project B（PROJECT_SINGLE_2）
- ...

### 项目交叉（PROJECT_CROSS）
- 跨项目架构视野评估
- 技术迁移能力
- 对比：Project A vs Project B 的技术选型逻辑一致性

## 三、技术问答
### 八股文（QNA_TECH）
- 知识点覆盖度
- 边界条件掌握

### 算法（QNA_ALGO）
- 思路清晰度
- 复杂度分析准确性

### 场景设计（QNA_SCENE）
- 需求分析能力
- 架构合理性
- 扩展性考虑

## 总评
...
```

---

## 6. 四大核心模块

### 6.1 训练（Training）

**定位**：用户的"练习场"。

**模拟面试（阶段化+语音）**：
- 3 阶段流程（自我介绍→项目介绍→问答）
- 语音输入（ASR）+ 语音输出（TTS）
- 项目选择交互（项目介绍阶段）
- 状态可视化：录音中/识别中/思考中/播报中

**项目训练（占位）**：
- 围绕单个项目的专项训练
- V2：schema 预留 + UI 入口，具体逻辑 V2.1 迭代

### 6.2 项目与简历（Projects & Resumes）

**定位**：用户的"素材库"。

**简历**：
- 上传/粘贴 → 自动解析（联系信息/教育/工作/技能/项目）
- 手动编辑所有字段
- 重新解析

**项目**：
- 从简历解析生成 or 手动创建
- 独立管理（编辑/删除）
- 多简历复用

### 6.3 复盘（Review）

**定位**：用户的"成长镜"。

| 复盘类型 | 触发 | 输入 | 输出 |
|:---|:---|:---|:---|
| 面试复盘 | 面试结束自动触发 | 完整 transcript（含 phase + project_id） | 分阶段评估 + 项目匹配度 + 问答点评 + 总评 |
| 项目复盘 | 用户手动触发 | 项目信息 + 用户自述 | 叙述质量评估 + 改进建议 |
| 自定义复盘 | 用户手动触发 | 任意文本 | 通用表达评估 + 改进建议 |

**面试官意图解读**：每个问题标注"为什么这么问""你的回答触及/遗漏了哪些考察点"。

### 6.4 探索（Explore）

**定位**：用户的"情报站"。V2 占位。

- 面经浏览（schema + UI 入口）
- 公司风格（schema + UI 入口）
- 岗位图谱（schema 预留）
- 技术趋势（schema 预留）
- 高频题榜（schema 预留）

---

## 7. 语音模型接入

V1 后端已完成火山 ASR/TTS 协议适配，V2 前端完成端到端打通。

**输入（ASR）**：Web Audio API 采集 PCM → WebSocket `/api/voice/asr` → 火山 ASR → partial 实时展示 → final 可编辑确认 → 提交

**输出（TTS）**：LLM 文本 → `POST /api/voice/tts` → 火山 TTS → 前端播放 → 播报状态可视化 → 支持打断/关闭

---

## 8. UX 需求文档

> 原则：**只描述功能、交互流程和状态变化，不规定视觉设计**。第三方前端团队可自由设计 UI。

### 8.1 文档结构

```
docs/ux/
├── _navigation.md         # 路由表、页面清单、权限
├── training.md            # 训练模块 UX
├── projects-resumes.md    # 项目与简历模块 UX
├── review.md              # 复盘模块 UX
├── explore.md             # 探索模块 UX
└── _glossary.md           # 术语表
```

### 8.2 导航与路由

**全局导航**：
- 仪表盘 /dashboard
- 训练 /training
- 项目与简历 /projects
- 复盘 /reviews
- 探索 /explore
- 设置 /settings

**路由表**：

| 模块 | 路由 | 功能 |
|:---|:---|:---|
| 训练 | /training | 训练首页（开始新训练/继续进行中） |
| | /training/interview/new | 新建模拟面试（选岗位/目标公司/关联简历） |
| | /training/interview/:id | 模拟面试进行中 |
| 项目与简历 | /projects | 项目列表（手动创建入口） |
| | /projects/:id | 项目详情（编辑/删除） |
| | /projects/new | 手动创建项目 |
| | /resumes | 简历列表（上传/粘贴入口） |
| | /resumes/:id | 简历详情（展示所有信息板块） |
| | /resumes/:id/edit | 简历编辑（所有字段可编辑） |
| 复盘 | /reviews | 复盘列表（按类型过滤） |
| | /reviews/:id | 复盘详情 |
| | /reviews/new | 新建复盘（选类型：项目/自定义） |
| 探索 | /explore | 探索首页 |
| | /explore/experiences | 面经列表 |
| | /explore/companies | 公司列表 |

### 8.3 各模块 UX 需求（功能+交互+状态）

#### 8.3.1 训练模块（training.md）

**训练首页（/training）**
- 功能：展示进行中的训练（如有）、快捷开始新训练、历史训练列表
- 交互：点击"开始模拟面试" → /training/interview/new
- 空状态：无历史训练时展示引导文案

**新建模拟面试（/training/interview/new）**
- 功能：选择岗位（下拉）、输入目标公司（文本，可选）、选择关联简历（下拉，可选）
- 交互：提交后创建 session → 跳转到进行中页面
- 错误状态：岗位未选时阻止提交

**模拟面试进行中（/training/interview/:id）**
- **布局要求**：顶部显示当前阶段和进度，主区域展示对话流，底部/侧边是语音交互控件
- **阶段切换**：
  - 自我介绍阶段：提示"请进行自我介绍"，无项目列表
  - 项目介绍阶段：展示项目选择列表（从简历/直接关联的项目中加载），用户选择或语音指定项目
  - 问答阶段：展示当前问题，无项目列表
- **语音交互**：
  - 录音状态：需要可视化反馈（如波形、颜色变化等，具体样式自由）
  - ASR 识别中：需要 loading 状态
  - 识别完成：展示文本，允许用户编辑后确认提交
  - TTS 播报中：需要播放状态反馈
  - 支持打断播报（随时开始新录音）
  - 支持关闭语音（纯文本模式，设置持久化）
- **控制按钮**：
  - 主交互：开始/停止录音
  - 辅助：下一题（问答阶段）、结束面试、重复问题
- **状态持久化**：刷新页面后应恢复当前面试状态

**状态流转**：
```
idle → recording → asr_processing → confirming → llm_thinking → tts_playing → idle
  ↑________________________[打断播报]_________________________________________________|
  
阶段内循环：self_intro → [过渡] → project_drill → [过渡] → q_and_a → [结束]
```

#### 8.3.2 项目与简历模块（projects-resumes.md）

**简历列表（/resumes）**
- 功能：展示所有简历卡片（标题、来源格式、项目数量、解析状态）、上传/粘贴入口
- 交互：点击卡片 → 详情页；点击删除 → 确认弹窗
- 空状态：引导上传第一份简历

**简历详情（/resumes/:id）**
- 功能：按板块展示简历所有信息：
  - 联系信息（姓名、邮箱、电话）
  - 个人简介
  - 教育经历（列表，每项：学校/专业/学位/时间）
  - 工作经历（列表，每项：公司/职位/时间/描述）
  - 技能（tag 列表）
  - 项目（卡片列表，点击跳转项目详情）
- 交互：点击"编辑" → 编辑页；点击"重新解析" → 触发重新解析

**简历编辑（/resumes/:id/edit）**
- 功能：所有字段可编辑
  - 联系信息：文本输入
  - 个人简介：文本域
  - 教育经历：可增删改（表单列表）
  - 工作经历：可增删改（表单列表）
  - 技能：可增删改（tag 输入）
  - 项目：可调整顺序、移除、添加已有项目
- 交互：保存后返回详情页

**项目列表（/projects）**
- 功能：展示所有项目卡片（名称、角色、关键词数量、关联简历数）、手动创建入口
- 交互：点击卡片 → 详情页
- 空状态：引导创建第一个项目

**项目详情（/projects/:id）**
- 功能：展示项目信息（名称/时间/角色/概述/关键词/关联简历）
- 交互：编辑/删除/开始项目训练

**手动创建项目（/projects/new）**
- 功能：表单填写（名称/时间/角色/概述/关键词）
- 关键词输入：支持多 tag 输入（逗号或回车分隔）

#### 8.3.3 复盘模块（review.md）

**复盘列表（/reviews）**
- 功能：所有复盘卡片（类型/时间/关联训练或项目）、按类型过滤（面试/项目/自定义）
- 交互：点击卡片 → 详情页

**复盘详情（/reviews/:id）**
- 功能展示（面试复盘为例）：
  - 概览：训练类型、时间、总时长
  - 分阶段评估：
    - 自我介绍：时长、内容完整性、结构清晰度
    - 项目介绍：每个项目的"简历描述 vs 面试讲述"匹配度
    - 问答：每道题的点评
  - 能力雷达图（5 轴）
  - 面试官意图解读（每个问题的"为什么这么问"）
  - 总评
- 交互：展开/收起各板块

**新建复盘（/reviews/new）**
- 功能：选择复盘类型（项目/自定义）→ 填写信息 → 生成复盘

#### 8.3.4 探索模块（explore.md）

**探索首页（/explore）**
- 功能：四个入口卡片（面经浏览/公司风格/岗位图谱/技术趋势）
- 空状态/占位：展示"即将上线"或 mock 数据

**面经列表（/explore/experiences）**
- 功能：面经卡片列表（标题/公司/岗位/浏览量）、搜索/过滤
- 交互：点击卡片 → 面经详情（V2.1）

**公司列表（/explore/companies）**
- 功能：公司卡片列表（名称/面试风格摘要）
- 交互：点击卡片 → 公司详情（V2.1）

---

## 9. 数据模型变更

### 9.1 新增/修改表

```sql
-- 项目（独立表，原 resume_projects 升级）
projects {
  id, owner_id, name, period, role, summary, keywords(json),
  source, source_resume_id, created_at, updated_at
}

-- 简历（扩展结构化字段）
resumes {
  id, owner_id, title,
  raw_text, source_format, parsed_at,
  contact_name, contact_email, contact_phone, contact_location,
  summary,
  educations(json),      -- [{ school, major, degree, period }]
  experiences(json),     -- [{ company, title, period, description }]
  skills(json),          -- [{ name, level? }]
  project_ids(json),     -- uuid[]
  created_at, updated_at
}

-- 训练会话（原 interview_sessions 泛化）
training_sessions {
  id, owner_id,
  type: "interview" | "project_drill" | "custom",
  position, target_company, resume_id,
  project_ids(json),     -- 直接关联的项目
  status, started_at, ended_at, created_at
}

-- 训练回合（增加 phase 和 project_id）
training_turns {
  id, session_id, index, kind, text, audio_meta(json),
  phase: "self_intro" | "project_drill" | "q_and_a",
  project_id, question_id,
  created_at
}

-- 面经/公司画像（探索模块占位）
experiences { id, title, company, position, content, source, tags, view_count, created_at }
company_profiles { id, name, description, interview_style, positions(json), tags(json), updated_at }
```

### 9.2 删除

- `resume_projects` 表
- `interview_sessions` 表（迁移为 `training_sessions`）
- `turns` 表（迁移为 `training_turns`）
- `level` 字段（所有表）

---

## 10. API 变更

### 10.1 新增/修改

```
# 项目（独立 CRUD）
GET|POST       /api/projects
GET|PATCH|DELETE /api/projects/:id

# 简历（扩展字段）
POST   /api/resumes              -- 解析后生成 Resume + Projects
GET    /api/resumes              -- 列表
GET    /api/resumes/:id          -- 详情（含所有结构化字段）
PATCH  /api/resumes/:id          -- 编辑（含 educations/experiences/skills/project_ids）
POST   /api/resumes/:id/reparse  -- 重新解析

# 训练（统一入口，含阶段信息）
GET|POST       /api/training
GET|POST       /api/training/:id/{start,answer,end}

# 复盘（泛化）
POST   /api/reviews              -- 手动创建复盘（项目/自定义）

# 探索
GET    /api/experiences
GET    /api/companies
```

### 10.2 移除

```
/api/interviews/*   → /api/training/*
PATCH /api/resumes/:id/projects/:pid → PATCH /api/projects/:id
```

---

## 11. 实施节奏（约8周）

| Phase | 内容 | 周期 |
|:---|:---|:---|
| 1 | 数据库迁移（简历扩展+项目独立+训练泛化）+ API 重构 | 2周 |
| 2 | 项目与简历模块（完整信息编辑+简历组装） | 1周 |
| 3 | 面试阶段化（3阶段流程+项目选择交互） | 1.5周 |
| 4 | 语音接入（录音+ASR+TTS+状态可视化） | 1.5周 |
| 5 | 复盘泛化（分阶段报告+项目匹配度+意图解读） | 1周 |
| 6 | 探索占位 + UX 文档输出 | 0.5周 |
| 7 | 联调 + 打磨 | 0.5周 |

---

## 12. 成功指标

| 指标 | V2 目标 |
|:---|:---|
| 语音面试完成率 | >50% |
| 简历信息完整度 | >80%用户简历含教育/工作/技能 |
| 项目介绍阶段使用率 | >70%（即用户主动选择项目介绍） |
| 逐题点评查看率 | >60% |
| 7日留存 | 较V1 +20% |

---

## 13. 风险

| 风险 | 缓解 |
|:---|:---|
| 数据库迁移复杂（简历字段大幅扩展） | 完整迁移脚本+备份+渐进式字段填充 |
| 面试阶段化增加复杂度 | 阶段间过渡清晰，允许用户跳过 |
| 语音+阶段化同时推进 | 先完成阶段化（文本），再叠加语音 |
| 简历解析精度不足 | 解析失败时 fallback 到手动填写 |
| 第三方前端理解偏差 | UX 文档包含交互流程图+状态机+用户故事 |
