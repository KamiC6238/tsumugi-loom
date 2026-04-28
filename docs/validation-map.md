# Validation Map

状态：2026-04-29 当前实现基线

文档类型：支撑文档

## Purpose

本文档记录当前项目的验证入口和模块级覆盖归属，帮助 Agent 在变更后快速选择需要运行的测试。

## Commands

1. `pnpm build`：运行 `vue-tsc -b && vite build`，覆盖类型检查和生产构建。
2. `pnpm test:logic`：运行 Vitest，匹配 `tests/logic/**/*.test.ts`。
3. `pnpm test:logic:watch`：以 watch 模式运行 Vitest。
4. `pnpm test:ui`：运行 Playwright UI 测试。
5. `pnpm test:ui:headed`：以 headed 模式运行 Playwright。
6. `pnpm test:ui:install`：安装 Playwright 浏览器依赖。
7. `pnpm test:all`：串行运行 `pnpm test:logic && pnpm test:ui`。

## Test Layers

1. 纯逻辑测试：覆盖 `src/lib/` 的状态变换、parser、storage helper 和 API helper。
2. Store/composable 测试：覆盖 Pinia store、页面级 composable 和跨模块状态编排。
3. 组件接线测试：使用 Vue Test Utils 覆盖组件 props、emit、状态显示和面板切换。
4. UI 交互测试：使用 Playwright 覆盖真实浏览器中的关键用户路径。
5. 构建验证：通过 `pnpm build` 覆盖 TypeScript、Vue SFC 和 Vite build 集成。

## Module Coverage Map

| 模块 | 测试文件 | 覆盖重点 |
| --- | --- | --- |
| Workflow state | `tests/logic/workflow-state.test.ts` | workflow 状态变换纯函数契约 |
| Workflow store/useWorkflow | `tests/logic/workflow-store.test.ts` | Pinia store、active workflow 派生、节点更新 |
| Workflow studio composable | `tests/logic/workflow-studio.test.ts` | 全局面板、Tasks 面板、skill 添加状态、节点 skill 保存规则 |
| Workflow UI wiring | `tests/logic/workflow-ui.test.ts` | SkillsPanel、TasksPanel、Sidebar、App 与 Drawer 组件接线 |
| End-to-end workflow UI | `tests/ui/workflow-sidebar.spec.ts` | 创建 workflow、切换画布、Drawer 改名、skill select、全局面板返回画布 |
| Skills catalog | `tests/logic/skills.test.ts` | catalog 载入、frontmatter 解析、macro/node 分类、added node skill 过滤 |
| Skills store | `tests/logic/skills-store.test.ts` | 添加状态、未知 skill 防护、added node skills 派生 |
| GitHub helper | `tests/logic/github.test.ts` | remote 解析、`.git/config` repository 选择、issue normalization、pull request 过滤、storage helper |
| GitHub tasks store | `tests/logic/github-tasks-store.test.ts` | repository/token restore、public/authenticated fetch、empty/auth error、stale request 防护 |
| Color mode | `tests/logic/color-mode.test.ts` | localStorage 初始化、切换持久化、document root 同步、按钮图标和 aria label |

## Test Selection Guide

1. 只改 `src/lib/workflows.ts` 或 workflow store：优先跑 `pnpm test:logic`，必要时补 `pnpm build`。
2. 改 Sidebar、Canvas、Drawer 或 workflow 页面编排：跑 `pnpm test:logic`；用户路径变化时补 `pnpm test:ui`。
3. 改 skill parser、skills store、SkillsPanel 或 Drawer skill Select：跑 `pnpm test:logic`；影响真实交互时补 `pnpm test:ui`。
4. 改 GitHub repository 解析、API 请求、PAT 或 TasksPanel：跑 `pnpm test:logic`；影响面板交互时补 `pnpm test:ui`。
5. 改 color mode、全局样式变量或 ThemeModeToggle：跑 `pnpm test:logic` 和 `pnpm build`。
6. 改 Vite、TypeScript、Tailwind、Vue Flow 或 shadcn-vue 集成配置：至少跑 `pnpm build`，按影响面补测试。
7. 纯文档改动：检查 markdown 链接和文档路由。

## Playwright Runtime

1. Playwright 测试目录是 `tests/ui`。
2. UI 测试 baseURL 是 `http://127.0.0.1:4173`。
3. Playwright webServer 使用 `pnpm exec vite --host 127.0.0.1 --port 4173`。
4. 本地环境会复用已存在 server。
5. 当前只配置 `chromium` 项目。

## Maintenance Rules

1. 新增模块文档时，在本文档补充对应测试归属。
2. 新增测试文件时，更新 Module Coverage Map。
3. 改变 package scripts、Vitest include 或 Playwright 配置时，更新 Commands 或 Playwright Runtime。
4. 每条长期测试事实应能在测试文件或配置文件中找到依据。
