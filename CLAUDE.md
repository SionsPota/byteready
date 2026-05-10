# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ByteReady 是一个 TypeScript 全栈骨架，面向 2026/05/10 的现场挑战赛。前端 Vite + React 19 + Tailwind v4，后端 Hono on Node 22，pnpm monorepo 管理。挑战赛侧重 AI 能力集成（LLM / 语音 / 图像 / RAG），所有外部模型 API Key 都通过仓库根 `.env` 注入到后端。

## Repository Layout

```
apps/
  web/      @byteready/web      Vite + React 19 + Tailwind v4 前端
  server/   @byteready/server   Hono on Node 22 后端
packages/
  shared/   @byteready/shared   前后端共享类型与 ApiResponse 信封
.local/     本地屏蔽目录（.gitignore）。PROJECT_PREP.md 在这里——含外部 API 鉴权细节与
            真实凭证，仅供参考，不要拷贝它的内容到任何被提交的文件
```

## Common Commands

```bash
# 首次安装（root 执行）
pnpm install

# 同时跑前后端（推荐）
pnpm dev

# 单独跑
pnpm dev:web      # http://localhost:5173
pnpm dev:server   # http://localhost:8787

# 类型检查（所有 workspace）
pnpm typecheck

# 格式化
pnpm format
pnpm format:check

# 前端构建
pnpm --filter @byteready/web build
pnpm --filter @byteready/web preview
```

## Architecture Notes

### 跨包引用：源码直出，无构建步骤
`packages/shared` 的 `package.json` 把 `exports` 直接指向 `./src/index.ts`。Vite 与 tsx 都能原生消费 TS，因此整个 monorepo 不需要先构建 shared 再消费。**后果**：不要给 shared 加构建脚本（会让 IDE 与运行时分叉）；shared 里也不要写运行时副作用代码（前端 tree-shake 会受影响）。

### 后端运行模式：tsx 全程，没有 dist
`apps/server` 的 `start` 也用 `tsx src/index.ts`，**没有** `tsc -> node dist/...` 这一步。这是为了避免 monorepo 里 `@byteready/shared` 的 TS 源码导出在 Node 运行时无法解析的问题。要部署到生产，直接 `pnpm --filter @byteready/server start`，或在容器里跑 `tsx`。如果以后真要切换成预编译产物，shared 也要一起改成发布编译产物。

### 前后端连接：Vite 代理 /api
`apps/web/vite.config.ts` 把 `/api/*` 代理到后端。代理目标端口在启动时通过 `loadEnv` 从仓库根 `.env` 的 `SERVER_PORT` 读取，无该变量时默认 `8787`。**前端必须用 `/api/...` 相对路径**调用后端，不要写绝对 URL，这样开发与生产同源。生产部署时，由反向代理（或后端静态托管）把 `/api` 与 `/`（前端构建产物）放在同一域名下。

修改后端端口：只改 `.env` 里的 `SERVER_PORT` 即可，前后端会自动同步。

### API 响应信封
所有后端 JSON 必须用 `@byteready/shared` 的 `ApiResponse<T>`。新路由用 `ok(data)` / `err(code, message)` 辅助函数，不要手写裸对象。`apps/server/src/index.ts` 里已有全局 `notFound` 与 `onError`，新增路由不需要重复处理这两类。

### Env 加载
**只有一个 `.env`，在仓库根目录**。`apps/server/src/env.ts` 用相对路径 `../../../.env` 显式加载（无论 CWD 是哪里都能找到）。前端不要读 `.env`，所有外部 API Key 必须经后端代理调用——前端只跟 `/api/*` 说话。

## Conventions

### 提交信息
- 标准 Conventional Commits + 中文描述：`<type>(<scope>): <中文>`
- 常见 scope：`web` / `server` / `shared`；纯工程配置可省略 scope
- 例：`feat(server): 接入 Kimi 对话流式接口` / `fix(web): 修复健康检查 race condition`
- 原子化但别太碎：一个逻辑改动一个 commit；不要为了"小"把一个特性拆成 10 个 commit
- 不加 emoji、不加 Co-Authored-By（用户全局配置已禁用 attribution）

### 凭证与本地屏蔽
- 真实 API Key **只**进 `.env`（已 `.gitignore`）
- `.env.example` 必须保持占位符（`sk-xxx...` / `xxxx-xxxx-xxxx`），不要贴真实值
- `.local/` 是本地参考材料目录，里面任何内容都不要被引用进被提交的源码或文档
- 改动 `.env.example` 时要同步改 `apps/server/src/env.ts`（如果新增了 required key）

### TypeScript
- 所有 workspace 的 `tsconfig.json` 都 `extends "../../tsconfig.base.json"`
- 前端走 project references（`tsconfig.json` → `tsconfig.app.json` + `tsconfig.node.json`），改 build/typecheck 配置注意改对文件
- base config 开了 `noUncheckedIndexedAccess`：`arr[i]` 和 `obj[key]` 默认是 `T | undefined`，不要 `!` 强断，先 narrow

### 端口
- web `5173`、server 默认 `8787`（受 `.env` 中 `SERVER_PORT` 覆盖）
- Vite proxy 通过 `loadEnv` 自动同步 server 端口；改端口只需改 `.env`

## External APIs (配置在 .env)

后端集成时，所有外部凭证从 `process.env` 读取（参考 `apps/server/src/env.ts` 的 `requireEnv` 辅助）。详细鉴权方式、协议、参考 Python 客户端代码在 `.local/PROJECT_PREP.md`——**只读参考，不要在提交的代码里 import 或引用 `.local/` 路径**。

| 用途 | 服务商 | 关键 env |
|------|--------|---------|
| LLM 对话 | Moonshot Kimi（OpenAI 兼容） | `KIMI_API_KEY` / `KIMI_BASE_URL` / `KIMI_MODEL` |
| 文生图 | SiliconFlow（Tongyi-MAI/Z-Image-Turbo） | `SILICONFLOW_API_KEY` / `SILICONFLOW_IMAGE_MODEL` |
| Embedding / Rerank | SiliconFlow（BAAI/bge-*） | `SILICONFLOW_EMBEDDING_MODEL` / `SILICONFLOW_RERANK_MODEL` |
| TTS 语音合成 | 火山引擎豆包 2.0（WebSocket 二进制） | `VOLCENGINE_API_KEY` / `VOLCENGINE_TTS_*` |
| ASR 语音识别 | 火山引擎 SeedASR（WebSocket 二进制） | `VOLCENGINE_API_KEY` / `VOLCENGINE_ASR_*` |

火山 TTS / ASR 是自定义二进制 WebSocket 协议（不是普通 JSON over WS），实现时优先参考 `.local/PROJECT_PREP.md` 里的 Event 表与帧格式，别照网上的旧版 `X-Api-App-Key` 文档——**新版控制台只用 `X-Api-Key`**。
