# ByteReady 前端 UX 交付需求文档

> 面向第三方前端工程师的功能 / 数据交付包。后端契约（路由 + 响应字段）已固定，本文档约束**功能完整性**、**技术栈一致性**与**示例数据形态**，不约束视觉细节、布局像素与组件实现方式。

---

## 0. 技术栈（必须一致）

| 层 | 选型 | 说明 |
|---|---|---|
| 构建 | Vite 6 | `pnpm create vite` 初始化 |
| 框架 | React 19 + TypeScript 5 | 函数组件 + hooks，禁止类组件 |
| 路由 | react-router-dom 7 | 仅 `Routes`/`Route`/`Link`/`Navigate`/`useParams`/`useSearchParams`/`useNavigate` |
| 样式 | Tailwind CSS v4（`@tailwindcss/vite`） | 不引入额外 UI 框架（不要 antd/MUI/shadcn） |
| 图标 | lucide-react | 全站唯一图标库 |
| 图表 | recharts 3 | 仅趋势页用 LineChart |
| 包管理 | pnpm（workspace） | 共享类型从 `@byteready/shared` 直接 import TS 源码 |

**依赖白名单**（`apps/web/package.json`）:
```json
{
  "@byteready/shared": "workspace:*",
  "lucide-react": "^1.14.0",
  "react": "^19.0.0",
  "react-dom": "^19.0.0",
  "react-router-dom": "^7.15.0",
  "recharts": "^3.8.1"
}
```
不要引入 zustand/redux/react-query/swr/axios/dayjs/lodash 等。状态管理用 React 自带 `useState`/`useContext`/`useEffect`，HTTP 用 `fetch`，时间用 `new Date(...)`/`toLocaleDateString('zh-CN')`。

**全局约定**：
- 所有 API 走相对路径 `/api/...`（Vite proxy 已配置），禁止写绝对 URL。
- 所有 `fetch` 必须带 `credentials: 'include'`（cookie 鉴权）。
- 所有响应统一信封 `ApiResponse<T>`（见第 1 节）。
- 文案中文为主，按下方"UI 文案约定"表对齐。
- 暗色主题为默认（参考现有 `bg-slate-950 / text-slate-100` 这一档色系），不要做 light theme。

---

## 1. 全局基础设施

### 1.1 ApiResponse 信封

```ts
// 来自 @byteready/shared
type ApiResponse<T> =
  | { success: true; data: T; meta?: { total?: number; page?: number; limit?: number } }
  | { success: false; error: { code: string; message: string; details?: unknown } }
```

成功响应示例：
```json
{ "success": true, "data": { "id": "abc" }, "meta": { "total": 42, "page": 1, "limit": 20 } }
```

失败响应示例：
```json
{ "success": false, "error": { "code": "VALIDATION", "message": "请求体必须是 JSON" } }
```

### 1.2 鉴权与会话

- Cookie 鉴权（HttpOnly），登录 / 注册 / 登出端点会自动 set/clear cookie。
- 启动时调用 `GET /api/me` 自检，并把返回的 `User` 缓存进 `localStorage` 的 `br_user`，用于离线 / 首屏闪烁缓解。
- 未登录访问受保护页时跳 `/login`。
- `User` 形状：`{ id: string; email: string; name: string | null }`。

### 1.3 路由表（必须全部覆盖）

| 路径 | 页面 | 权限 |
|---|---|---|
| `/login` | 登录 / 注册 | 公开 |
| `/` | 重定向 | 已登录→`/dashboard`，未登录→`/login` |
| `/dashboard` | 仪表盘 | 登录 |
| `/resumes` | 简历列表 + 选中态详情 | 登录 |
| `/resumes/:id` | 简历完整详情（独立页） | 登录 |
| `/resumes/:id/edit` | 简历编辑表单 | 登录 |
| `/projects/:id` | 项目（用户简历项目）详情 | 登录 |
| `/training` | 训练中心列表 | 登录 |
| `/training/new` | 新建训练表单 | 登录 |
| `/training/:id` | 模拟面试运行页（核心） | 登录 |
| `/reviews` | 复盘列表 + 趋势图 | 登录 |
| `/reviews/:id` | 复盘详情（阶段 + 整面） | 登录 |
| `/explore` | 探索 hub（4 模块聚合） | 登录 |
| `/explore/experiences` | 面经列表 | 登录 |
| `/explore/experiences/:id` | 面经详情 | 登录 |
| `/explore/trends` | 行业趋势列表 | 登录 |
| `/explore/trends/:id` | 趋势详情 | 登录 |
| `/explore/projects` | 学习项目列表 | 登录 |
| `/explore/projects/:id` | 学习项目详情 | 登录 |
| `/explore/questions` | 题库搜索 | 登录 |
| `/explore/companies` | 重定向到 `/explore/experiences` | 登录 |
| `*` | 404 NotFound | - |

### 1.4 Layout

- 已登录页面统一带左侧 sidebar：Logo、五个一级导航（仪表盘 / 简历 / 训练 / 复盘 / 探索）、底部用户信息 + 登出按钮。
- 主内容区有顶部 padding，最大宽度内层容器，自适应。
- 登录页不带 sidebar。

### 1.5 ErrorBoundary

包裹所有路由的根 ErrorBoundary，发生未捕获错误时显示降级 UI（一行错误提示 + "刷新"按钮），不要白屏。

### 1.6 useApi（数据 hook）

实现一个简单的 GET 缓存 hook：
```ts
useApi<T>(url: string | null, opts?: { ttl?: number }): { data: T | null; loading: boolean; refresh(): void; error: string | null }
```
- `url === null` 时不发请求（用于条件请求）。
- 内存级缓存（`Map<url, { data, ts }>`），TTL 默认 0（不缓存），调用方按需指定。
- 提供 `invalidateKey(url)` 工具，写操作（POST/PATCH/DELETE）后调用以让相关 GET 在下次刷新。
- 自动跟随 `url` 变化重新请求。

### 1.7 UI 文案约定

| 状态 | 文案 |
|---|---|
| 加载中 | "加载中..." |
| 空列表 | "还没有 XXX" / "暂无 XXX" |
| 错误 | "网络错误，请重试" / 后端返回的 `error.message` |
| 删除二次确认 | `confirm('确定删除...？')` 即可，不需要做精美 modal |
| 时间显示 | `new Date(ts).toLocaleDateString('zh-CN')` |

### 1.8 颜色语义

| 用途 | 色调 |
|---|---|
| 训练相关（主行动） | emerald |
| 项目 / 简历 | blue / slate |
| 复盘 / 评分 | amber |
| 探索 hub | purple |
| 面经 | purple |
| 趋势 | emerald |
| 学习项目（探索） | amber |
| 题库 | rose |
| 错误 / 失败 | red |
| 中性 | slate |

---

## 2. 页面功能清单

### 2.1 LoginPage（`/login`）

**功能**
- 登录 / 注册切换（同一表单，注册多一个"姓名"可选字段）
- 邮箱（required, type=email）、密码（required, minLength=6）
- 提交时禁用按钮，显示 loading
- 错误提示：邮箱密码错误 / 邮箱已存在 / 网络错误
- 登录成功后 `navigate('/dashboard')`

**端点**
- `POST /api/auth/login` body: `{ email, password }`
- `POST /api/auth/register` body: `{ email, password, name? }`
- 响应 data: `{ id, email, name }`

---

### 2.2 DashboardPage（`/dashboard`）

**功能**
- 顶部 4 张卡片入口：训练 / 简历 / 复盘 / 探索（带图标 + 一句话副标题）
- "近期训练"区块：最多展示最新 5 条训练（type 不限），状态徽章（待开始 / 进行中 / 已结束），已结束的可直接点击进入复盘
- 空态：引导"开始第一场训练"链接到 `/training/new`

**端点**
- `GET /api/training` → `TrainingSummary[]`（见第 3 节）

---

### 2.3 ResumesPage（`/resumes`）

**布局**：左右双栏。左侧简历列表（约 280px 宽），右侧选中简历的详情。

**左侧功能**
- 标题"我的简历" + "粘贴"按钮
- 上传区（拖拽 + 点击）：仅 PDF/DOCX，<= 10MB，超出或类型错给红色提示条
- 粘贴模式（按钮切换）：标题输入 + 多行内容输入 + 保存 / 取消
- 简历列表：标题、来源（PDF/DOCX/粘贴）、创建日期、是否已解析、hover 出删除按钮
- 默认选中第一条

**右侧功能**（选中后展示）
- 简历头：标题、来源、解析状态；"重新解析" + "编辑"按钮
- 联系信息（姓名 / 邮箱 / 电话 / 所在地）
- 个人简介
- 教育经历列表（学校 + 专业 + 学位 + 时段）
- 工作经历列表（公司 + 职位 + 时段 + 描述）
- 技能 chip 流式排列
- 项目列表（双列卡片，每张卡片可点击进 `/projects/:id`，hover 出删除项目按钮）

**端点**
- `GET /api/resumes` → `Resume[]`
- `GET /api/resumes/:id` → `ResumeDetail`
- `POST /api/resumes`（multipart/form-data 上传文件 / JSON 粘贴）
- `POST /api/resumes/:id/reparse`
- `DELETE /api/resumes/:id`
- `DELETE /api/projects/:id`（删除单个项目）

---

### 2.4 ResumeDetailPage（`/resumes/:id`）

只读完整详情页，结构同 ResumesPage 右侧，区别：
- 顶部"返回简历列表"
- 项目区改为"项目经历"列表，每项是简略卡片（不必点进 `/projects/:id`）

---

### 2.5 ResumeEditPage（`/resumes/:id/edit`）

**功能**
- 表单编辑：标题 / 联系人字段 / 个人简介
- 教育经历、工作经历、技能：每行可增可减，行内编辑
- 顶部"保存"按钮，保存中禁用 + loading 文案
- 保存成功后 `navigate('/resumes/:id')`

**端点**
- `GET /api/resumes/:id`
- `PATCH /api/resumes/:id` body：完整更新字段

---

### 2.6 ProjectDetailPage（`/projects/:id`）

属于"用户简历中的项目"详情页，**不是探索的学习项目**。

**功能**
- 顶部返回 + 标题 + "开始项目训练"按钮（跳 `/training/new`）
- 项目概述（角色、概述、技术关键词 chip）
- 元信息卡（来源 / 创建时间 / 来源简历链接）
- "相关模拟经历"：列出和该项目关联的训练 session（type 显示为整面 / 项目问答 / 自我介绍 / 随机问答；按状态徽章；进行中跳 `/training/:id`，已结束跳 `/reviews/:id`）
- "相关学习项目"：探索的学习项目卡片网格，点击跳 `/explore/projects/:id`

**端点**
- `GET /api/projects/:id`
- `GET /api/projects/:id/related-training`
- `GET /api/projects/:id/related-explore`

---

### 2.7 TrainingPage（`/training`）

**功能**
- 标题 + "开始模拟面试"主行动按钮
- "进行中的训练"高亮卡片（如果有 `status === 'running'`）：显示岗位 + 当前阶段 + "继续"按钮
- 历史训练列表（含全部状态）；状态徽章；"开始" / "复盘"按钮
- 顶部右侧"刷新"按钮（手动 invalidate 缓存）

**端点**
- `GET /api/training`

---

### 2.8 NewTrainingPage（`/training/new`）

**功能**（单列表单）
1. 训练类型（4 选 1）：整面面试 / 自我介绍 / 项目问答 / 随机问答
2. 目标岗位（chip 单选）：frontend / backend / algorithm / data / ai
3. 目标公司（可选 input）
4. 岗位描述 JD（可选 textarea，AI 据此调整出题）
5. 关联简历（可选 select）
6. 关联项目（多选 checkbox，仅当类型为整面 / 项目问答时显示；项目问答时**必填**）
7. "开始训练"按钮：成功后 `navigate('/training/:id')`

**端点**
- `GET /api/resumes` → 简历下拉源
- `GET /api/projects` → 项目多选源
- `POST /api/training` body: `{ type, position, target_company?, job_description?, resume_id?, project_ids? }`
  → 返回 `{ id, type, position, status, createdAt }`

---

### 2.9 InterviewRunPage（`/training/:id`）⭐ 核心页

整面 / 单阶段模拟面试运行界面，类聊天 UI。

**Header**
- 岗位 + 训练类型徽章 + 状态文本（待开始 / 进行中 / 已结束）+ 当前阶段徽章
- 录音中徽章（红色脉冲）/ 播放中徽章（绿色）
- 右侧按钮：
  - 未开始：「开始面试」
  - 进行中：TTS 开关（Volume2/VolumeX）+「跳过」+「结束」
  - 已结束：无

**对话区**（`max-h` 滚动，新增 turn 自动滚到底）
- 系统消息（kind=`system`）：灰色细字居中
- 面试官消息（kind=`interviewer_main` / `interviewer_followup`）：左对齐，slate-800 底
- 候选人消息（kind=`candidate`）：右对齐，emerald 底
- 每条消息上方角色标签（"面试官" / "你"）+ 当前阶段（如"自我介绍"）
- 等待回复时显示"面试官思考中..."占位

**输入区**
- 三态切换：
  1. **idle**：单行输入框 + 麦克风按钮（仅在浏览器支持 SpeechRecognition 时显示）+ 发送按钮；Enter 发送
  2. **recording**：红色脉冲条 + "正在聆听..." + "停止录音"按钮
  3. **confirming**：识别结果以多行 textarea 呈现，可编辑；"确认提交" / "重新录音"两个按钮
- 浏览器不支持语音识别时，麦克风按钮隐藏，错误条显示"当前浏览器不支持语音识别，请使用文本输入"

**TTS（语音播报）**
- TTS 开关默认开启
- 提交回答 → 收到面试官回复 → 调 `POST /api/voice/tts` 拿到音频 blob → `new Audio(URL.createObjectURL(blob))` 播放 → 播放完才允许下一轮输入
- 状态机：`idle → recording → confirming → processing → playing → idle`

**已结束态**
- 隐藏输入区
- 居中按钮"查看复盘报告"，跳 `/reviews/:id`

**端点**
- `GET /api/training/:id` → `TrainingDetail`（含 `turns[]`）
- `POST /api/training/:id/start`
- `POST /api/training/:id/answer` body: `{ text }` → `{ decision: 'continue' | 'end', reply?: string }`
- `POST /api/training/:id/end`
- `POST /api/voice/tts` body: `{ text }` → 二进制音频流（`response.blob()`）

**State 标签映射**
```ts
{
  IDLE: '准备中', SELF_INTRO: '自我介绍',
  PROJECT_SINGLE_1: '项目深挖 1', PROJECT_SINGLE_2: '项目深挖 2', PROJECT_CROSS: '项目交叉',
  QNA_TECH: '技术问答', QNA_ALGO: '算法', QNA_SCENE: '场景设计',
  END: '已结束',
}
```

**Type 标签映射**
```ts
{ full: '整面', self_intro: '自我介绍', project_qa: '项目问答', random_qa: '随机问答' }
```

---

### 2.10 ReviewsPage（`/reviews`）

包含两个区块：

**Trends 区块**
- 视图模式切换：`阶段趋势` / `整面趋势`
- 阶段模式下再选阶段类型：自我介绍 / 项目问答 / 随机问答
- 折线图（recharts LineChart）：横轴 = 第 N 场，纵轴 = 分数
  - 阶段趋势：纵轴范围 `[0, 5]`，多条线代表各维度
  - 整面趋势：纵轴 `[0, dataMax]`，3 条线（总分 / 阶段间连贯性 / JD 匹配度）
- 数据不足空态："还没有足够的复盘数据"

**复盘列表区块**
- 类型筛选下拉（全部 / 整面 / 自我介绍 / 项目问答 / 随机问答）
- 列表项：类型标签（带颜色区分）+ 岗位 + 日期 + 公司（可选） + "查看复盘"链接
- 仅展示 `status === 'ended'` 的训练

**端点**
- `GET /api/training` → 过滤 `status === 'ended'`
- `GET /api/trends/phase?phaseType=self_intro|project_qa|random_qa`
- `GET /api/trends/full`

---

### 2.11 ReviewPage（`/reviews/:id`）

**头部**
- 返回链接 + "整面复盘" / "XX复盘"标题 + 元数据（岗位 / 公司 / 日期）

**原始对话开关**（折叠）
- 点击展开后显示 `training.turns[]` 全部对话，按 kind 染色（候选人 / 面试官 / 追问 / 系统）

**Tab 切换**（仅整面：`阶段复盘 (N)` / `整面复盘`；非整面只显示阶段复盘）

**阶段复盘 Tab**
- 卡片列表（可点击展开 / 收起）
- 每张卡片头部：阶段名（带阶段色）+ 总分（X.X / 5.0）+ coachVersion
- 展开后内容：
  1. 各维度评分：维度名 + 进度条（emerald）+ 数值 + 权重
  2. 阶段评价（一段文本）
  3. 面试官反思（一段文本）
  4. 改进建议列表（带 high/medium/low 优先级徽章）
  5. 本阶段对话（折叠在卡片内）
  6. 生成时间

**整面复盘 Tab**
- 各阶段表现（横向进度条列表）
- 双卡片：阶段间连贯性 / JD 匹配度（大数字展示）
- 整体技术画像（一段文本）
- 优先级提升建议列表（高 / 中 / 低 徽章）
- 总评 + 整面总分（X.X / 5.0）

**端点**
- `GET /api/training/:id`
- `GET /api/training/:id/phase-reviews`
- `GET /api/training/:id/full-review`

---

### 2.12 ExplorePage（`/explore`）⭐ Hub

四模块横向 hub，用同一搜索词 + 同一 tag 联动筛选 4 个 section。

**布局**
- 顶部 H1 + 一句话总数（共 N 条）
- 全局搜索框（300ms debounce）
- 全局 tag 条（最多 30 个高频 tag，按出现次数倒序，标 count）；点击切换；点击"全部"或再次点同一 tag 取消
- 主体：2 列 grid，4 个 section 卡片：
  1. 面经（icon=BookOpen，紫色）
  2. 行业趋势（icon=TrendingUp，绿色）
  3. 学习项目（icon=Rocket，琥珀色）
  4. 题库搜索（icon=Award，玫红色）

**每个 Section 卡片**
- 头部：图标 + 标题 + 总数 + "查看全部"链接（带筛选条件透传到列表页 URL）
- Facet 子筛选（仅当条目>0 且 facet count > 1）：
  - 面经按"面试轮次"
  - 趋势按"领域"（category）
  - 项目按"语言"（language）
  - 题库无 facet
- 子卡列表：每个 section 最多 6 条预览
- 空态文案区分：tag 过滤无结果 / 完全无数据

**子卡内容**
- 面经：公司徽章（带公司色）+ 轮次 + 岗位 + 难度 ★ + 标题 + 内容预览（line-clamp-2）
- 趋势：分类徽章 + 面向角色 + 相关度 X/10+ + 标题 + 描述
- 项目：语言 + 分类 + stars（>=1000 用 "1.2k" 格式）+ 影响分 X/10 + 名称 + 描述
- 题库：题目 + 答案预览（带眼睛图标）

**端点**
- `GET /api/explore/hub?q=&tag=` → `HubData`（见第 3 节）

---

### 2.13 ExperiencesPage（`/explore/experiences`）

**功能**
- 顶部 H1 + "返回探索"
- **公司筛选条**：横向流式 chip，每个公司带颜色圆点 + 名称 + 数量；选中后显示公司详情卡（公司色背景、interviewStyle 风格语录、industry、description）
- **搜索 + 标签 / 结果筛选**（标签按 category 分组：技术 / 流程 / 岗位 / 其他）
- 列表：每条卡片含公司徽章、轮次、面试形式、结果徽章（passed/failed/pending/ghosted 各有独立色）、岗位、标题、预览、tags、浏览量、难度
- 分页（每页 10 条）

**URL 同步**
- 所有筛选状态都同步到 query string（`search`/`companyId`/`result`/`tagIds`/`page`），刷新可恢复
- ExplorePage 的"查看全部"链接会带 `search` 参数过来

**端点**
- `GET /api/explore/experiences?companyId=&tagIds=a,b&result=&search=&page=&limit=`
- `GET /api/explore/companies`
- `GET /api/explore/tags`

---

### 2.14 ExperienceDetailPage（`/explore/experiences/:id`）

**功能**
- 返回 + 顶部头卡：公司徽章（点击带 companyId 跳列表）+ 轮次 + 形式 + 结果 + 标题 + 岗位
- 元信息：日期 / 难度 / 浏览量 / 来源链接（外链）
- Tags 行
- "题目 / 面经内容"卡片（保留换行 `whitespace-pre-wrap`）
- "参考答案 / 要点"卡片（绿色调，可选）
- "相关行业趋势"列表（点击跳趋势详情）
- "相关学习项目"列表（点击跳项目详情）
- **CrossRefBlock**：通过共同 tag 关联到的其他 4 类条目（面经 / 趋势 / 项目 / 题库），按类型归组

**端点**
- `GET /api/explore/experiences/:id` → `ExperienceDetail`

---

### 2.15 ExploreTrendsPage（`/explore/trends`）

**功能**
- 顶部 H1 + 返回链接
- 推荐开关条：当用户至少有一份简历时启用"按简历推荐"按钮（toggleable）；推荐时显示推荐角色 + 缺口列表
- 分类 chip 切换（基于结果聚合）
- 趋势卡片列表，每张卡：分类徽章 + 年份 + 面向角色 + 标题 + 描述 + 相关度大数字 + 关键技术 chip + 面试热点摘要

**端点**
- `GET /api/explore/trends`
- `GET /api/explore/trends/recommend?resumeId=...`（推荐模式）

---

### 2.16 ExploreTrendDetailPage（`/explore/trends/:id`）

**区块**（按顺序）
- 返回
- 头卡：分类 + 年份 + 面向角色 + 标题（带 TrendingUp 图标）+ 描述 + 相关度大数字
  - 关键技术 chip
  - tags
- 面试热点（琥珀色，可选）
- 市场影响（青色，可选）
- 关键要点（bullet 列表）
- 学习建议（琥珀色）
- 参考链接（多条用逗号分隔的 url，全部展示为外链）
- 相关学习项目列表
- CrossRefBlock

**端点**
- `GET /api/explore/trends/:id` → `TrendDetail`

---

### 2.17 ExploreProjectsPage（`/explore/projects`）

**功能**
- 顶部 H1 + 返回
- 推荐开关（同趋势页）
- 双层 chip 筛选：项目类型（Quick Win / Weekend Build / Deep Dive）+ 编程语言
- 项目卡列表：类型徽章（带专属色）+ 难度 + 语言 + 分类 + 名称（带外链图标如有 githubUrl） + 描述 + 影响分 + 技术栈 chip（最多 5 个，多了显示 +N）+ stars/forks

**端点**
- `GET /api/explore/projects`
- `GET /api/explore/projects/recommend?resumeId=...`

---

### 2.18 ExploreProjectDetailPage（`/explore/projects/:id`）

**区块**
- 返回
- 头卡：类型徽章 + 难度 + 语言 + 分类 + 时间预估 + 面向角色 + 名称 + 描述 + 影响分大数字
  - GitHub 外链 + stars + forks
  - 技术栈 chip + gapAddressed（紫色 chip 带 Target 图标）
  - tags
- 学习路径建议（绿色，可选）
- 核心功能（双列 chip 网格）
- 技术亮点（青色，bullet）
- 实现步骤（编号步骤列表）
- 简历描述模板（绿色卡 + "复制"按钮，复制成功 2s 后变回普通态）
- 参考链接（仅当 sourceUrl ≠ githubUrl）
- 相关行业趋势列表
- CrossRefBlock

**端点**
- `GET /api/explore/projects/:id` → `ProjectDetail`

---

### 2.19 QuestionSearchPage（`/explore/questions`）

**功能**
- 顶部返回 + 搜索框（关键词必填）+ 搜索按钮
- URL `?q=...` 自动触发首次搜索
- 结果计数 + 当前页
- 卡片列表（点击展开 / 收起单条答案，answer 用 `whitespace-pre-wrap` 保留换行）
- 分页（默认 limit=20）
- 空态："未找到相关题目"

**端点**
- `GET /api/questions/search?q=&page=&limit=` → `QaItem[]` + meta

---

### 2.20 NotFoundPage（`*`）

简单 404 + 返回首页链接即可。

---

## 3. 数据形态与示例（接口契约）

> 所有响应外层都是 `ApiResponse<T>`。下方仅给出 `data` 字段。

### 3.1 用户

```json
// GET /api/me
{ "id": "u_001", "email": "demo@byteready.dev", "name": "演示用户" }
```

### 3.2 简历列表

```json
// GET /api/resumes  →  Resume[]
[
  {
    "id": "r_001",
    "title": "李同学-后端工程师简历",
    "sourceFormat": "pdf",
    "parsedAt": 1746840000000,
    "createdAt": 1746840000000
  },
  {
    "id": "r_002",
    "title": "粘贴简历测试",
    "sourceFormat": "paste",
    "parsedAt": null,
    "createdAt": 1746926400000
  }
]
```

### 3.3 简历详情

```json
// GET /api/resumes/:id
{
  "id": "r_001",
  "title": "李同学-后端工程师简历",
  "sourceFormat": "pdf",
  "parsedAt": 1746840000000,
  "createdAt": 1746840000000,
  "contact": {
    "name": "李雨桐",
    "email": "yutong.li@example.com",
    "phone": "+86 138-0000-0001",
    "location": "杭州"
  },
  "summary": "3 年后端经验，专注分布式系统与高并发场景，主导过日均 200w 订单量的支付链路改造。",
  "educations": [
    { "school": "浙江大学", "major": "计算机科学", "degree": "本科", "period": "2017.09-2021.06" }
  ],
  "experiences": [
    {
      "company": "字节跳动",
      "title": "后端工程师",
      "period": "2021.07-至今",
      "description": "负责支付清算系统的稳定性建设，主导从单库迁移到分库分表方案，QPS 提升 5x。"
    }
  ],
  "skills": [
    { "name": "Go", "level": "精通" },
    { "name": "PostgreSQL" },
    { "name": "Kafka" },
    { "name": "Redis" }
  ],
  "projects": [
    {
      "id": "p_001",
      "name": "支付清算系统重构",
      "period": "2023.03-2023.09",
      "role": "Tech Lead",
      "summary": "将单库订单系统拆分为按用户哈希的 32 分片集群，引入 Kafka 削峰，P99 从 800ms 降到 120ms。",
      "keywords": ["分库分表", "Kafka", "Go", "Redis", "MySQL"],
      "source": "resume"
    },
    {
      "id": "p_002",
      "name": "实时风控引擎",
      "period": "2022.06-2022.12",
      "role": "核心开发",
      "summary": "基于 Flink 的规则引擎，支持百万规则秒级生效，日均处理 50 亿事件。",
      "keywords": ["Flink", "规则引擎", "实时计算"],
      "source": "resume"
    }
  ]
}
```

### 3.4 项目（用户简历项目）详情

```json
// GET /api/projects/:id
{
  "id": "p_001",
  "name": "支付清算系统重构",
  "period": "2023.03-2023.09",
  "role": "Tech Lead",
  "summary": "...",
  "keywords": ["分库分表", "Kafka", "Go"],
  "source": "resume",
  "sourceResumeId": "r_001",
  "createdAt": 1746840000000,
  "updatedAt": 1746840000000
}

// GET /api/projects/:id/related-training  →  RelatedTraining[]
[
  {
    "id": "t_001",
    "type": "project_qa",
    "position": "backend",
    "targetCompany": "美团",
    "status": "ended",
    "createdAt": 1746926400000
  }
]

// GET /api/projects/:id/related-explore  →  { items: RelatedExploreProject[] }
{
  "items": [
    {
      "id": "ep_007",
      "name": "shardingsphere",
      "description": "分布式数据库中间件生态系统",
      "language": "Java",
      "category": "数据库",
      "stars": 19800,
      "impactScore": 9,
      "tags": ["分库分表", "中间件"]
    }
  ]
}
```

### 3.5 训练列表 / 详情

```json
// GET /api/training  →  TrainingSummary[]
[
  {
    "id": "t_001",
    "type": "full",
    "position": "backend",
    "targetCompany": "美团",
    "jobDescription": null,
    "resumeId": "r_001",
    "projectIds": ["p_001"],
    "status": "ended",
    "currentState": "END",
    "currentPhase": null,
    "parentSessionId": null,
    "startedAt": 1746926400000,
    "endedAt": 1746930000000,
    "createdAt": 1746926400000
  },
  {
    "id": "t_002",
    "type": "self_intro",
    "position": "backend",
    "targetCompany": null,
    "resumeId": "r_001",
    "projectIds": [],
    "status": "running",
    "currentState": "SELF_INTRO",
    "createdAt": 1747012800000
  }
]

// GET /api/training/:id  →  TrainingDetail
{
  "id": "t_001",
  "type": "full",
  "position": "backend",
  "targetCompany": "美团",
  "resumeId": "r_001",
  "projectIds": ["p_001"],
  "status": "ended",
  "currentState": "END",
  "projectsDiscussed": ["p_001"],
  "topicsCovered": ["分库分表", "Kafka"],
  "currentProjectId": null,
  "currentTopic": null,
  "startedAt": 1746926400000,
  "endedAt": 1746930000000,
  "createdAt": 1746926400000,
  "turns": [
    {
      "id": "tn_01",
      "index": 0,
      "kind": "system",
      "text": "面试已开始",
      "phase": null,
      "state": "IDLE",
      "projectId": null,
      "topic": null,
      "questionId": null,
      "createdAt": 1746926400000
    },
    {
      "id": "tn_02",
      "index": 1,
      "kind": "interviewer_main",
      "text": "你好，请先做个 1 分钟的自我介绍。",
      "phase": "self_intro",
      "state": "SELF_INTRO",
      "projectId": null,
      "topic": null,
      "questionId": null,
      "createdAt": 1746926460000
    },
    {
      "id": "tn_03",
      "index": 2,
      "kind": "candidate",
      "text": "您好，我是李雨桐，毕业于浙大计算机系，目前在字节做后端 3 年...",
      "phase": "self_intro",
      "state": "SELF_INTRO",
      "createdAt": 1746926520000
    },
    {
      "id": "tn_04",
      "index": 3,
      "kind": "interviewer_followup",
      "text": "刚才提到了支付清算重构，能讲下分片键的选择思路吗？",
      "phase": "project_single",
      "state": "PROJECT_SINGLE_1",
      "projectId": "p_001",
      "topic": "分库分表",
      "createdAt": 1746926580000
    }
  ]
}

// POST /api/training/:id/answer body: { text: "..." }  →  AnswerResponse
{
  "decision": "continue",
  "reply": "明白了。那如果热点用户单点 QPS 超过分片承载能力，你会怎么处理？",
  "currentState": "PROJECT_SINGLE_1"
}
// 当 decision === 'end' 时无 reply
```

### 3.6 复盘

```json
// GET /api/training/:id/phase-reviews  →  PhaseReview[]
[
  {
    "id": "pr_01",
    "phaseType": "self_intro",
    "phaseIndex": 0,
    "scores": [
      { "dimension": "结构化表达", "score": 4.2, "weight": 30, "weighted": 1.26, "evidence": "用了'背景-亮点-当前关注'三段式" },
      { "dimension": "技术深度", "score": 3.8, "weight": 40, "weighted": 1.52, "evidence": "提到了分库分表但未量化收益" },
      { "dimension": "岗位匹配", "score": 4.5, "weight": 30, "weighted": 1.35, "evidence": "明确表达对支付方向的兴趣" }
    ],
    "totalScore": 4.13,
    "evaluation": "整体表达流畅，结构清晰。建议在亮点项目部分加上量化指标。",
    "interviewerReflection": "候选人语速适中，关键词覆盖完整，但缺少 STAR 中的 R（结果数据）。",
    "improvementSuggestions": [
      { "priority": "high", "suggestion": "在自我介绍中加入 1-2 个量化指标（如 QPS 提升 5x、P99 降低 80%）" },
      { "priority": "medium", "suggestion": "压缩个人背景部分至 15 秒以内" }
    ],
    "rubricVersion": "v3-phase",
    "coachVersion": "introduction-coach",
    "generatedAt": 1746930000000
  },
  {
    "id": "pr_02",
    "phaseType": "project_qa",
    "phaseIndex": 1,
    "scores": [
      { "dimension": "技术深度", "score": 4.0, "weight": 40, "weighted": 1.6, "evidence": "分片键选择讲清楚了哈希均匀性" },
      { "dimension": "权衡分析", "score": 3.5, "weight": 30, "weighted": 1.05, "evidence": "未对比 range vs hash 方案" },
      { "dimension": "落地经验", "score": 4.5, "weight": 30, "weighted": 1.35, "evidence": "数据迁移双写方案描述完整" }
    ],
    "totalScore": 4.0,
    "evaluation": "项目细节扎实，但欠缺方案对比。",
    "interviewerReflection": "回答时多次跳过追问的关键点，需要训练'被打断后回到主线'。",
    "improvementSuggestions": [
      { "priority": "high", "suggestion": "复习常见分片策略（hash/range/lookup）的取舍" }
    ],
    "rubricVersion": "v3-phase",
    "coachVersion": "interview-coach",
    "generatedAt": 1746930000000
  }
]

// GET /api/training/:id/full-review  →  FullReview | null
{
  "id": "fr_01",
  "phaseScoresSummary": [
    { "phaseType": "self_intro", "score": 4.13, "duration": 120000 },
    { "phaseType": "project_qa", "score": 4.0, "duration": 1500000 },
    { "phaseType": "random_qa", "score": 3.6, "duration": 900000 }
  ],
  "coherenceScore": 4.2,
  "jdMatchScore": 3.9,
  "overallPersona": "扎实的后端工程师，擅长系统稳定性，权衡分析需加强；适合中后期高并发业务团队。",
  "consolidatedImprovements": [
    { "priority": "high", "sourcePhases": ["self_intro", "project_qa"], "suggestion": "强化量化表达和方案对比" },
    { "priority": "medium", "sourcePhases": ["random_qa"], "suggestion": "补强分布式一致性算法基础" }
  ],
  "overallEvaluation": "整体表现良好，建议补强权衡分析与基础理论后冲击 P6。",
  "overallScore": 3.95,
  "generatedAt": 1746930000000
}
```

### 3.7 复盘趋势

```json
// GET /api/trends/phase?phaseType=self_intro  →  Record<dimension, TrendPoint[]>
{
  "结构化表达": [
    { "sessionId": "t_001", "value": 4.2, "createdAt": 1746926400000 },
    { "sessionId": "t_005", "value": 4.5, "createdAt": 1747012800000 }
  ],
  "技术深度": [
    { "sessionId": "t_001", "value": 3.8, "createdAt": 1746926400000 },
    { "sessionId": "t_005", "value": 4.0, "createdAt": 1747012800000 }
  ],
  "岗位匹配": [
    { "sessionId": "t_001", "value": 4.5, "createdAt": 1746926400000 }
  ]
}

// GET /api/trends/full  →  Record<metric, TrendPoint[]>
{
  "overall_score": [
    { "sessionId": "t_001", "value": 3.95, "createdAt": 1746926400000 },
    { "sessionId": "t_010", "value": 4.20, "createdAt": 1747012800000 }
  ],
  "coherence_score": [
    { "sessionId": "t_001", "value": 4.2, "createdAt": 1746926400000 },
    { "sessionId": "t_010", "value": 4.4, "createdAt": 1747012800000 }
  ],
  "jd_match_score": [
    { "sessionId": "t_001", "value": 3.9, "createdAt": 1746926400000 },
    { "sessionId": "t_010", "value": 4.1, "createdAt": 1747012800000 }
  ]
}
```

### 3.8 探索 Hub

```json
// GET /api/explore/hub  →  HubData
{
  "allTags": [
    { "name": "分布式", "count": 18 },
    { "name": "Redis", "count": 12 },
    { "name": "AI 工程", "count": 11 },
    { "name": "系统设计", "count": 9 },
    { "name": "Go", "count": 8 }
  ],
  "sections": {
    "experiences": {
      "total": 24,
      "items": [
        {
          "id": "exp_001",
          "title": "字节跳动后端 3 面 - 分布式系统深挖",
          "contentPreview": "面试官从 Redis 持久化机制问起，逐步引导到分布式锁的实现，最后...",
          "companyName": "字节跳动",
          "companyColor": "#3B82F6",
          "position": "后端工程师",
          "interviewRound": "三面",
          "interviewType": "技术面",
          "difficulty": 4,
          "tags": ["Redis", "分布式锁", "系统设计"]
        },
        {
          "id": "exp_002",
          "title": "美团 SRE 一面 - K8s 调度器原理",
          "contentPreview": "重点考察 K8s 调度器的工作流程，scheduling framework 的扩展点...",
          "companyName": "美团",
          "companyColor": "#F59E0B",
          "position": "SRE",
          "interviewRound": "一面",
          "interviewType": "技术面",
          "difficulty": 5,
          "tags": ["Kubernetes", "云原生"]
        }
      ]
    },
    "trends": {
      "total": 12,
      "items": [
        {
          "id": "tr_001",
          "title": "AI Coding Agent 工程化落地",
          "category": "AI 工程",
          "description": "2026 年 AI Coding Agent 已从 PoC 进入生产环节，主流大厂面试越来越关注 RAG/工具调用/Eval 全链路理解。",
          "relatedRole": "全栈 / AI 工程师",
          "relevanceBase": 9,
          "tags": ["AI 工程", "Agent", "RAG"]
        }
      ]
    },
    "projects": {
      "total": 18,
      "items": [
        {
          "id": "ep_001",
          "name": "tinygrad",
          "description": "极简深度学习框架，<5000 行实现 PyTorch 大部分能力。",
          "language": "Python",
          "category": "深度学习",
          "stars": 27500,
          "impactScore": 9,
          "techStack": ["Python", "深度学习", "Autograd"],
          "tags": ["AI 工程", "底层原理"]
        }
      ]
    },
    "questions": {
      "total": 6420,
      "items": [
        {
          "id": 101,
          "question": "TCP 三次握手中，为什么第三次握手客户端要再发一次 ACK？",
          "answerPreview": "第三次握手用于确认服务端的发送能力。如果省略，服务端无法确认客户端是否真的能接收..."
        }
      ]
    }
  }
}
```

### 3.9 面经列表 / 详情

```json
// GET /api/explore/experiences?...  →  PaginatedExperiences
{
  "total": 24,
  "page": 1,
  "limit": 10,
  "items": [
    {
      "id": "exp_001",
      "companyId": "co_bytedance",
      "companyName": "字节跳动",
      "companyColor": "#3B82F6",
      "title": "字节跳动后端 3 面 - 分布式系统深挖",
      "position": "后端工程师",
      "contentPreview": "面试官从 Redis 持久化机制问起...",
      "sourceUrl": "https://example.com/exp/001",
      "difficulty": 4,
      "result": "passed",
      "interviewDate": 1746048000000,
      "viewCount": 128,
      "interviewRound": "三面",
      "interviewType": "技术面",
      "createdAt": 1746048000000,
      "tags": [
        { "id": "tag_redis", "name": "Redis", "color": "#DC382D", "category": "tech" },
        { "id": "tag_dist", "name": "分布式锁", "color": "#A855F7", "category": "tech" }
      ]
    }
  ]
}

// GET /api/explore/experiences/:id  →  ExperienceDetail
{
  "id": "exp_001",
  "companyId": "co_bytedance",
  "companyName": "字节跳动",
  "companyColor": "#3B82F6",
  "title": "字节跳动后端 3 面 - 分布式系统深挖",
  "position": "后端工程师",
  "content": "Q1：聊一下 Redis 的持久化机制？\nQ2：如果让你设计一个分布式锁，你会怎么做？\n...",
  "answerKeyPoints": "1. Redis 持久化：RDB 快照 + AOF 日志，AOF 三种刷盘策略...\n2. 分布式锁：Redlock 算法 / 单 Redis SET NX PX...",
  "sourceUrl": "https://example.com/exp/001",
  "difficulty": 4,
  "result": "passed",
  "interviewDate": 1746048000000,
  "viewCount": 129,
  "interviewRound": "三面",
  "interviewType": "技术面",
  "createdAt": 1746048000000,
  "tags": [
    { "id": "tag_redis", "name": "Redis", "color": "#DC382D", "category": "tech" }
  ],
  "relatedTrends": [
    { "id": "tr_005", "title": "Redis 7 多线程演进", "category": "中间件", "description": "...", "relevanceBase": 7 }
  ],
  "relatedProjects": [
    {
      "id": "ep_011",
      "name": "redis-rs",
      "description": "Rust 实现的 Redis 客户端",
      "githubUrl": "https://github.com/redis-rs/redis-rs",
      "stars": 3500,
      "language": "Rust",
      "impactScore": 7
    }
  ],
  "relatedByTags": {
    "experiences": [{ "id": "exp_007", "title": "腾讯 PCG 二面", "companyName": "腾讯", "companyColor": "#10B981", "interviewRound": "二面" }],
    "trends": [{ "id": "tr_005", "title": "Redis 7 多线程演进", "category": "中间件", "relevanceBase": 7 }],
    "projects": [{ "id": "ep_011", "name": "redis-rs", "description": "...", "language": "Rust", "stars": 3500, "impactScore": 7 }],
    "questions": [{ "id": 101, "question": "Redis 持久化方式有哪几种？", "answerPreview": "RDB / AOF / 混合..." }]
  }
}
```

### 3.10 公司列表 / 全局标签

```json
// GET /api/explore/companies  →  Company[]
[
  {
    "id": "co_bytedance",
    "name": "字节跳动",
    "description": "互联网 / 短视频 / AI",
    "interviewStyle": "重项目深挖，喜欢追问到底层",
    "industry": "互联网",
    "color": "#3B82F6",
    "experienceCount": 8
  },
  {
    "id": "co_meituan",
    "name": "美团",
    "description": "本地生活 / 即时配送",
    "interviewStyle": "题目偏算法 + 系统设计组合拳",
    "industry": "互联网",
    "color": "#F59E0B",
    "experienceCount": 5
  }
]

// GET /api/explore/tags  →  Tag[]
[
  { "id": "tag_redis", "name": "Redis", "color": "#DC382D", "category": "tech" },
  { "id": "tag_kafka", "name": "Kafka", "color": "#000000", "category": "tech" },
  { "id": "tag_round_3", "name": "三面", "color": "#A855F7", "category": "process" },
  { "id": "tag_role_be", "name": "后端", "color": "#3B82F6", "category": "role" }
]
```

### 3.11 趋势列表 / 详情

```json
// GET /api/explore/trends  →  IndustryTrend[]
[
  {
    "id": "tr_001",
    "category": "AI 工程",
    "title": "AI Coding Agent 工程化落地",
    "description": "2026 年 AI Coding Agent 已从 PoC 进入生产...",
    "keyPoints": [
      "工具调用（function calling）已成为大模型必备能力",
      "Agent 落地需要 Eval 闭环，而不只是 Prompt 调优",
      "RAG 在长上下文模型出现后地位下降但仍主流"
    ],
    "learningAdvice": "建议从 LangChain / LlamaIndex 入手，先跑通端到端 demo，再深入 Eval 框架。",
    "sourceUrl": "https://x.com/example/123,https://blog.example/agent",
    "sourceTitle": "Anthropic Engineering Blog",
    "relatedSkills": ["LangChain", "LlamaIndex", "OpenAI SDK", "Anthropic SDK"],
    "relatedRole": "全栈 / AI 工程师",
    "relevanceBase": 9,
    "marketImpact": "2026 上半年大厂招聘对 'LLM 应用开发' 岗位需求同比 +180%。",
    "interviewHotspots": "Agent 工具调用流程、RAG vs 长上下文取舍、Eval 设计",
    "year": "2026",
    "tags": ["AI 工程", "Agent", "RAG"]
  }
]

// GET /api/explore/trends/:id  →  TrendDetail
// 在上面基础上增加：
// "relatedProjects": [
//   { "id": "...", "name": "...", "projectType": "weekend_build", "difficulty": "intermediate",
//     "description": "...", "impactScore": 8, "stars": 1200, "language": "Python",
//     "githubUrl": "https://..." }
// ],
// "relatedByTags": { ... }  // 同 ExperienceDetail.relatedByTags 结构

// GET /api/explore/trends/recommend?resumeId=...  →  RecommendData
{
  "items": [ /* IndustryTrend[]，每条多一个 score 字段表示推荐分 */ ],
  "role": "后端工程师",
  "gaps": ["AI 工程", "可观测性"]
}
```

### 3.12 学习项目列表 / 详情

```json
// GET /api/explore/projects  →  LearningProject[]
[
  {
    "id": "ep_001",
    "name": "tinygrad",
    "projectType": "deep_dive",
    "difficulty": "advanced",
    "techStack": ["Python", "Autograd"],
    "gapAddressed": "深度学习底层原理",
    "description": "极简深度学习框架，<5000 行实现 PyTorch 大部分能力。",
    "impactScore": 9,
    "relatedRole": "AI 工程师",
    "githubUrl": "https://github.com/tinygrad/tinygrad",
    "stars": 27500,
    "forks": 3100,
    "language": "Python",
    "category": "深度学习",
    "tags": ["AI 工程", "底层原理"],
    "isInterviewRelated": true
  }
]

// GET /api/explore/projects/:id  →  ProjectDetail
{
  "id": "ep_001",
  "name": "tinygrad",
  "projectType": "deep_dive",
  "difficulty": "advanced",
  "timeEstimate": "2-4 周",
  "techStack": ["Python", "Autograd", "GPU"],
  "gapAddressed": "深度学习底层原理",
  "description": "极简深度学习框架...",
  "coreFeatures": ["反向传播", "GPU 加速", "ONNX 导入", "JIT 编译"],
  "techHighlights": [
    "用 5000 行 Python 实现完整 autograd",
    "支持 Apple Silicon Metal 后端"
  ],
  "implementationSteps": [
    "Fork 仓库并跑通 MNIST 示例",
    "阅读 ops.py 了解张量算子注册机制",
    "实现一个自定义算子（如 LayerNorm）",
    "在 README 写学习笔记 + Twitter 分享"
  ],
  "resumeTemplate": "复刻 tinygrad 框架并实现自定义 LayerNorm 算子；优化反向传播链路使训练速度提升 18%。",
  "impactScore": 9,
  "sourceUrl": "https://github.com/tinygrad/tinygrad",
  "relatedRole": "AI 工程师",
  "relatedSkills": ["Python", "深度学习", "Autograd"],
  "githubUrl": "https://github.com/tinygrad/tinygrad",
  "stars": 27500,
  "forks": 3100,
  "language": "Python",
  "category": "深度学习",
  "learningPath": "先看 mnist.py 跑通；再读 tensor.py / ops.py；最后看 jit.py。",
  "isInterviewRelated": true,
  "tags": ["AI 工程", "底层原理"],
  "relatedTrends": [
    { "id": "tr_001", "title": "AI Coding Agent 工程化落地", "category": "AI 工程", "description": "...", "relevanceBase": 9 }
  ],
  "relatedByTags": {
    "experiences": [],
    "trends": [],
    "projects": [],
    "questions": []
  }
}

// GET /api/explore/projects/recommend?resumeId=...  →  RecommendData
{
  "items": [ /* LearningProject[]，含 score */ ],
  "role": "后端工程师",
  "gaps": ["AI 工程"]
}
```

### 3.13 题库搜索

```json
// GET /api/questions/search?q=Redis&page=1&limit=20
// 注意 meta 信封：success/data/meta
{
  "success": true,
  "data": [
    {
      "id": 101,
      "question": "Redis 持久化方式有哪几种？分别有什么优劣？",
      "answer": "Redis 提供 RDB / AOF / 混合 三种持久化方式：\n- RDB：定时快照，恢复快但可能丢失最后一个时间窗口的数据。\n- AOF：追加日志...",
      "source": "byteready-qa-dataset"
    }
  ],
  "meta": { "total": 142, "page": 1, "limit": 20 }
}
```

### 3.14 语音 TTS

```http
POST /api/voice/tts
Content-Type: application/json

{ "text": "好的，那我们进入下一道题。" }

→ 200 OK
Content-Type: audio/mpeg
（二进制 MP3 流，前端用 response.blob() 接收）
```

---

## 4. 验收清单

### 4.1 必须实现的页面（20 个）

✅ 全部按第 1.3 节路由表实现，**任何页面缺失都是不通过**。

### 4.2 必须实现的核心交互

- [ ] 登录态 cookie 自检 + localStorage 缓存（避免首屏跳登录闪烁）
- [ ] 简历上传：拖拽 + 点击双通道，PDF/DOCX，10MB 限制，错误提示
- [ ] 简历粘贴：标题 + 内容
- [ ] 简历重新解析（含确认弹窗）
- [ ] 训练运行页三态语音输入（idle/recording/confirming）+ 浏览器降级
- [ ] 训练运行页 TTS 播放（拿 blob → Audio 播放，播放完才允许下一轮）
- [ ] 训练运行页跳过 / 结束（结束含 confirm 弹窗）
- [ ] 训练新建：项目问答类型必选项目（按钮 disable）
- [ ] 复盘趋势图：阶段 / 整面双视图、recharts LineChart
- [ ] 复盘卡片折叠展开
- [ ] 复盘原始对话折叠
- [ ] 探索 hub：搜索 debounce 300ms、tag 联动 4 个 section
- [ ] 探索 hub 每个 section 自带 facet 子筛选
- [ ] 面经列表：URL 同步、公司筛选、tag 分类筛选、分页
- [ ] 面经 / 趋势 / 项目详情末尾都有 CrossRefBlock（4 类标签关联条目）
- [ ] 趋势 / 项目列表的"按简历推荐"开关（依赖至少 1 份简历）
- [ ] 项目详情"复制简历模板"按钮（成功 2s 反馈）
- [ ] 题库搜索：URL `?q=` 自动搜索、分页、答案展开

### 4.3 必须实现的非功能性

- [ ] 全部 fetch 带 `credentials: 'include'`
- [ ] 全部 API 路径相对 `/api/...`
- [ ] 暗色主题（slate-950 系）+ Tailwind v4
- [ ] 浏览器原生 SpeechRecognition 检测降级
- [ ] 中文文案 + `toLocaleDateString('zh-CN')`
- [ ] 所有金额 / 数量大于 1000 的 stars 用 `xxx.xk` 格式
- [ ] 所有响应处理 `success === false` 分支
- [ ] 所有列表都有空态文案
- [ ] 删除类操作有 `confirm` 确认

### 4.4 不要做的

- ❌ 不要写自定义 modal / toast 系统（用 `confirm` / 红色提示条即可）
- ❌ 不要引入第三方组件库
- ❌ 不要做国际化（i18n）
- ❌ 不要做 light 主题
- ❌ 不要做移动端适配（桌面优先，min-width 1024px 即可）
- ❌ 不要把 API key 写到前端
- ❌ 不要给 `/api/voice/tts` 加缓存

---

## 5. 开发顺序建议

> 仅供参考，不强制。

1. **基建**：Vite + React + TS + Tailwind v4 + react-router-dom + lucide-react + recharts；Layout + ErrorBoundary + AuthProvider + useApi + ApiResponse 类型
2. **登录链路**：LoginPage + 鉴权 hook
3. **简历模块**：ResumesPage（左右栏）+ ResumeDetailPage + ResumeEditPage + ProjectDetailPage
4. **训练模块**：TrainingPage + NewTrainingPage + InterviewRunPage（最复杂，建议放在简历之后）
5. **复盘模块**：ReviewsPage（含趋势图）+ ReviewPage
6. **探索模块**：ExplorePage（hub）→ Experiences/Trends/Projects 三套列表+详情 → QuestionSearchPage → CrossRefBlock 嵌入
7. **Dashboard + NotFound**

每完成一个模块，请用 demo 账号（后端会 seed）走一遍端到端验收。

---

## 6. 联系契约

- 后端契约负责人提供：本文档 + `@byteready/shared` 包（含 `ApiResponse` 与若干 schema）
- 后端会随时联调，但不接受"端点缺字段"的反向需求 —— 字段不够可以申请新字段，已有字段必须用上
- 截稿前 3 天会冻结后端契约；前端最终交付物：可在 `pnpm dev` 起来后通过全部第 4 节验收清单的 SPA。
