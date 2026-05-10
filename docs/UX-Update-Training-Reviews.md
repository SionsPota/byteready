# 前端 UX 更新说明：训练页与复盘页职责重构

> 本文档记录 2026-05-10 对训练页（`/training`）、复盘页（`/reviews`）及 Dashboard（`/dashboard`）的职责重新分配。
> 后端 API 契约**无任何变更**，所有端点、响应字段、鉴权方式保持原样。

---

## 变更概要

| 变更项 | 原行为 | 新行为 |
|--------|--------|--------|
| **训练页** | 训练历史列表 + 「开始模拟面试」跳转 | 直接配置并启动一场训练（表单入口） |
| **复盘页** | 仅展示 `ended` 训练的趋势 + 复盘列表 | 趋势 + **全部状态**训练历史（统一入口） |
| **Dashboard** | 4 卡片 + 近期 5 场训练列表 | 4 卡片 + 「进行中训练」横幅（条件显示） |
| **新建训练页** | 独立表单页 `/training/new` | **删除**，合并入 `/training` |
| **简历关联** | 可选 | **必选**（前端校验） |
| **项目选择** | 全局项目列表 | 与所选简历联动，仅显示该简历下的项目 |

---

## 1. 页面详细变更

### 1.1 TrainingPage（`/training`）—— 训练启动页

**职责**：用户打开训练页即可直接配置并启动一场模拟训练，无需额外跳转。

**布局**（从上到下）：

1. **进行中训练横幅**（有 `status === 'running'` 时显示）
   - 显示岗位 + 当前阶段 +「继续」按钮
   - 点击跳 `/training/:id`

2. **训练配置表单**（主体）
   - **选择简历**（下拉 select，必选）
     - 无简历时显示引导卡片（跳 `/resumes`）
   - **训练类型**（4 选一，默认「整面面试」）
   - **目标岗位**（5 个 chip 单选：frontend/backend/algorithm/data/ai）
   - **目标公司**（可选 input）
   - **岗位 JD**（可选 textarea）
   - **关联项目**（多选 checkbox，仅当类型为「整面面试」或「项目问答」时显示）
     - **项目问答类型必填项目**
     - 项目列表来源于**所选简历的 `projects` 字段**（GET `/api/resumes/:id`）
   - **开始训练**按钮（loading 态 + 错误提示）

3. **底部入口**
   - 「查看训练历史与复盘 →」文字链接，跳 `/reviews`

**API**：
- `GET /api/training` — 检测 running 会话
- `GET /api/resumes` — 简历下拉源
- `GET /api/resumes/:id` — 取该简历的项目列表（`data.projects[]`）
- `POST /api/training` — 创建训练会话

**路由变更**：`/training/new` 重定向到 `/training`。

---

### 1.2 ReviewsPage（`/reviews`）—— 复盘 Hub（趋势 + 全量历史）

**职责**：统一查看训练表现趋势与**全部**训练历史（已结束 / 进行中 / 待开始）。

**布局**：

1. **训练表现趋势**（保留原有）
   - 视图切换：阶段趋势 / 整面趋势
   - 阶段趋势下再选阶段类型（自我介绍 / 项目问答 / 随机问答）
   - recharts LineChart

2. **训练历史**（重构重点）
   - **筛选栏**：
     - 类型筛选：全部 / 整面面试 / 自我介绍 / 项目问答 / 随机问答
     - **新增** 状态筛选：全部 / 已结束 / 进行中 / 待开始
   - **列表项**（每条显示）：
     - 类型标签（带色）+ 岗位 + 日期 + 公司（如有）
     - 状态徽章
     - 操作按钮（根据状态）：
       - `ended` → 「查看复盘」→ `/reviews/:id`
       - `running` → 「继续」→ `/training/:id`
       - `pending` → 「开始」→ `/training/:id`

**API**：
- `GET /api/training` — 取全部训练（不再过滤 `ended`）
- `GET /api/trends/phase?phaseType=...` — 阶段趋势数据
- `GET /api/trends/full` — 整面趋势数据

---

### 1.3 DashboardPage（`/dashboard`）—— 简化

**职责**：保留四大模块入口导航，移除重复的训练历史列表。

**布局**：

1. **进行中训练横幅**（有 running 会话时显示）
   - 同 TrainingPage 横幅样式

2. **四大模块入口卡片**（不变）
   - 训练（emerald）、简历（blue）、复盘（amber）、探索（purple）

---

### 1.4 已删除页面

| 文件 | 原路由 | 处理方式 |
|------|--------|----------|
| `NewTrainingPage.tsx` | `/training/new` | 删除；路由改为 `<Navigate to="/training" replace />` |

---

## 2. 路由表更新

| 路径 | 页面 | 备注 |
|------|------|------|
| `/training` | **TrainingPage**（新版） | 含表单 + 进行中 banner |
| ~~`/training/new`~~ | ~~NewTrainingPage~~ | **重定向到 `/training`** |
| `/training/:id` | InterviewRunPage | 不变 |
| `/reviews` | **ReviewsPage**（新版） | 趋势 + 全量历史 |
| `/reviews/:id` | ReviewPage | 不变 |
| `/dashboard` | **DashboardPage**（新版） | 移除近期训练列表 |

---

## 3. 组件变更清单

### 3.1 重写文件

- `apps/web/src/pages/TrainingPage.tsx`
  - 新增：简历必填校验、项目与简历联动、进行中 banner、底部历史入口
  - 移除：历史训练列表、独立「新建训练」按钮

- `apps/web/src/pages/ReviewsPage.tsx`
  - 新增：状态筛选、全量训练列表（含 running/pending）、分状态操作按钮
  - 移除：仅过滤 `ended` 的逻辑

- `apps/web/src/pages/DashboardPage.tsx`
  - 新增：进行中训练横幅
  - 移除：「近期训练」列表区块

### 3.2 删除文件

- `apps/web/src/pages/NewTrainingPage.tsx`

### 3.3 调整引用

- `apps/web/src/App.tsx`
  - 删除 `NewTrainingPage` import
  - `/training/new` 路由改为 `Navigate to="/training"`
- `apps/web/src/pages/ProjectDetailPage.tsx`
  - 两处 `/training/new` 链接改为 `/training`

---

## 4. 数据契约（无变更）

本次重构**未新增、未修改任何后端端点或响应字段**。所有 API 沿用 `UX-Handoff.md` 第 3 节定义。

关键数据结构参考：

```ts
// GET /api/training → TrainingSummary[]
interface TrainingSummary {
  id: string
  type: string          // 'full' | 'self_intro' | 'project_qa' | 'random_qa'
  position: string
  targetCompany: string | null
  status: string        // 'pending' | 'running' | 'ended'
  currentState?: string | null
  createdAt: number
}

// GET /api/resumes/:id → ResumeDetail（含 projects[]）
interface ResumeProject {
  id: string
  name: string
  role: string | null
  period: string | null
}

// POST /api/training body（不变）
{
  type: 'full' | 'self_intro' | 'project_qa' | 'random_qa'
  position: string
  target_company?: string
  job_description?: string
  resume_id?: string      // 前端现为必选，但后端仍保持可选
  project_ids?: string[]
}
```

---

## 5. 验收要点

- [ ] 打开 `/training` 直接看到配置表单，无需二次跳转
- [ ] 无简历时显示引导卡片，点击跳 `/resumes`
- [ ] 选中简历后，项目列表自动加载该简历的项目
- [ ] 训练类型为「项目问答」时，未选项目则提交按钮禁用
- [ ] `/reviews` 展示全部训练（含 pending / running），状态徽章正确
- [ ] `/reviews` 状态筛选器工作正常（全部 / 已结束 / 进行中 / 待开始）
- [ ] running 状态的训练在 `/training` 和 `/dashboard` 均显示横幅
- [ ] `/training/new` 自动重定向到 `/training`
- [ ] `pnpm typecheck` + `pnpm --filter @byteready/web build` 全绿
