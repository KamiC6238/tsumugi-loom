# ARCHITECTURE

状态：2026-04-29 文档拆分后的业务地图

## 1. 文档职责

`ARCHITECTURE.md` 是 Tsumugi Loom 的项目业务地图。它负责回答三个问题：

1. 当前系统边界是什么。
2. 每个业务模块由哪些代码和文档负责。
3. Agent 在变更某个模块前应该先读哪份文档。

它承载高层业务地图。具体模块的术语、状态约束、用户可见行为、数据流和测试依据，写入 `docs/` 下对应文档。

当前文档类型分工如下：

1. 业务地图：`ARCHITECTURE.md`，记录系统边界、模块关系、跨模块约束和文档路由。
2. 模块行为文档：记录单个功能模块的职责、用户契约、状态模型、数据流和测试依据。
3. 支撑文档：记录仓库结构、工具链、workflow artifact 和验证入口等跨模块事实。
4. 回合产物：`artifacts/workflows/` 承载单次开发回合的 plan、实现、测试、review 和临时上下文。

推荐 Agent 工作方式：先读本文件确认变更归属，再读路由表中的目标模块文档；如果变更改变了稳定业务事实，同步更新对应模块文档。

## 2. 项目范围

这个仓库当前是 Tsumugi Loom 的前端探索项目，技术栈以 Vue 3、TypeScript 和 Vite 为主，并结合 Tailwind CSS 4、shadcn-vue / Reka UI 以及 Vue Flow 搭建交互壳层。

当前实现目标是验证一个“侧边栏管理多个 workflow + 主画布展示当前 workflow + 全局 skill catalog 选择 + GitHub issues 任务入口”的本地单页应用体验。

当前用户可见能力：

1. 创建具名 workflow，并在侧边栏查看、切换活动 workflow。
2. 为新建 workflow 生成本地 seeded 节点与边，并在主区域用 Vue Flow 展示。
3. 点击当前 workflow 的节点后，在右侧 Drawer 中修改节点名称并同步画布标签。
4. 从 `.github/skills` 读取全局 skill catalog，在 Skills 面板中按 macro/node 分类展示并切换添加状态。
5. 在节点 Drawer 中从已添加的 node skills 中选择节点 skill。
6. 从 Tasks 面板选择本地 GitHub 仓库目录，解析 `.git/config`，通过 GitHub issues API 展示 open issues。
7. 在 issue detail 中选择 workflow 后，通过本地 Copilot runner endpoint 提交 workflow Run；Run 请求要求 workflow 每个节点都已配置 skill。
8. 通过 `scripts/loom/copilot-runner.mjs` 在浏览器外创建 run artifact，并为每个节点启动新的 Copilot CLI session。
9. 把 GitHub selected repository、PAT 和 light/dark 颜色偏好分别保存在 localStorage。
10. 用 Vitest 和 Playwright 覆盖状态逻辑、主题偏好、GitHub tasks 状态、workflow run 派生逻辑与关键 UI 交互。

## 3. 文档路由表

| 变更区域 | 先读文档 | 相关代码入口 | 什么时候更新文档 |
| --- | --- | --- | --- |
| workflow 创建、侧边栏、活动 workflow、画布、节点 Drawer | [docs/workflow-studio.md](docs/workflow-studio.md) | `src/App.vue`, `src/composables/useWorkflowStudio.ts`, `src/composables/useWorkflow.ts`, `src/stores/workflows.ts`, `src/lib/workflows.ts`, `src/components/workflow-studio/` | 用户契约、状态归属、节点保存规则或面板切换行为变化时 |
| skill catalog、Skills 面板、macro/node 分类、节点 skill assignment | [docs/skills-catalog.md](docs/skills-catalog.md) | `src/lib/skills.ts`, `src/stores/skills.ts`, `src/components/workflow-studio/SkillsPanel.vue`, `src/components/workflow-studio/WorkflowNodeDrawer.vue`, `.github/skills/` | skill 解析、默认分类、添加规则或节点可选 skill 规则变化时 |
| GitHub repository 选择、PAT、issues API、Tasks 面板、issue workflow Run | [docs/github-tasks.md](docs/github-tasks.md) | `src/lib/github.ts`, `src/lib/workflowRuns.ts`, `src/stores/githubTasks.ts`, `src/stores/workflowRuns.ts`, `src/components/workflow-studio/TasksPanel.vue`, `scripts/loom/copilot-runner.mjs` | repository 解析、API 契约、localStorage key、错误处理、issue UI 或本地 runner 契约变化时 |
| light/dark 颜色模式、主题持久化、Sidebar 品牌区切换 | [docs/color-mode.md](docs/color-mode.md) | `src/composables/useColorMode.ts`, `src/main.ts`, `src/style.css`, `src/components/workflow-studio/ThemeModeToggle.vue` | 主题状态、DOM 同步、localStorage key 或 UI 切换契约变化时 |
| 目录职责、工具链、workflow artifacts、长期文档归属 | [docs/project-structure.md](docs/project-structure.md) | `src/`, `tests/`, `scripts/loom/`, `artifacts/workflows/`, `docs/` | 新增顶层目录、改变文档归属、改变 workflow artifact 约定时 |
| 测试入口、覆盖范围、验证策略 | [docs/validation-map.md](docs/validation-map.md) | `tests/logic/`, `tests/ui/`, `vitest.config.ts`, `playwright.config.ts`, `package.json` | 新增测试层级、改变测试命令、改变模块验证责任时 |
| 跨模块边界、产品范围、全局稳定事实 | `ARCHITECTURE.md` | 全项目 | 系统边界、模块关系或文档路由变化时 |

## 4. 运行时模块地图

当前浏览器运行时由以下模块协作：

1. App shell：`src/App.vue` 调用 `useWorkflowStudio`，在 workflow canvas、Skills 面板和 Tasks 面板之间切换。
2. Workflow Studio：负责 workflow 列表、创建、活动项、画布、节点 Drawer 和节点编辑态，详见 [docs/workflow-studio.md](docs/workflow-studio.md)。
3. Skills Catalog：负责从 `.github/skills` 读取 skill catalog、macro/node 分类、添加状态和节点 skill 候选，详见 [docs/skills-catalog.md](docs/skills-catalog.md)。
4. GitHub Tasks：负责本地 GitHub repository 选择、PAT、open issues 读取、issue detail 展示和 workflow Run 提交，详见 [docs/github-tasks.md](docs/github-tasks.md)。
5. Workflow Runs：负责从 issue + workflow 派生本地 runner payload，校验节点 skill 配置，并通过本地 Copilot runner 执行浏览器外 workflow。
6. Color Mode：负责 light/dark 偏好、根元素 class/data attribute 和 `color-scheme` 同步，详见 [docs/color-mode.md](docs/color-mode.md)。
7. UI primitives：`src/components/ui/` 封装 shadcn-vue / Reka UI / Vaul 相关基础组件，供 feature 组件组合使用。
8. Pure logic：`src/lib/` 承载与视图解耦的 workflow、skills、GitHub helper 和 workflow run payload 逻辑，是高价值逻辑测试的主要目标。
9. Pinia stores：`src/stores/` 承载本地会话状态、全局 added skills 状态、GitHub tasks 状态和 workflow run 提交状态。

## 5. 系统边界

浏览器运行时边界：

1. 单页 Vue 应用。
2. 基于 Pinia 的本地 workflow、added skills 与 GitHub tasks 状态管理。
3. 侧边栏、创建对话框、节点 Drawer、主画布、全局 Skills 面板和 GitHub Tasks 面板组成的 UI shell。
4. Vue Flow 工作流可视化渲染。
5. localStorage 中的颜色模式偏好、GitHub selected repository 和 PAT。

仓库支撑边界：

1. Vite 构建、本地测试与前端开发工具链。
2. workflow artifacts、长期文档和本地自动化脚本。
3. Vitest 逻辑测试与 Playwright UI 测试。
4. `scripts/loom/copilot-runner.mjs` 是浏览器外的本地执行边界，负责接收 allowlist origin 的 Run 请求、创建 `artifacts/runs/` 产物，并以新 Copilot CLI session 执行每个节点。

## 6. 跨模块稳定事实

这些事实影响多个模块，变更时应同步检查相关模块文档：

1. workflow 领域状态集中保存在 Pinia workflow store 的本地会话 state 中。
2. 每次新建 workflow 都生成固定结构的本地 seeded 节点和边。
3. 活动 workflow 由 `activeWorkflowId` 控制；Sidebar 负责发出切换事件。
4. 节点编辑态由 `useWorkflowStudio` 持有；当前选中节点从 active workflow 与 `selectedNodeId` 派生，Drawer 接收派生后的节点数据。
5. Skills 面板和 Tasks 面板都是全局面板；打开任一全局面板都会关闭节点 Drawer。
6. Skills 的 macro/node 分类影响节点 Drawer 候选项；节点 skill assignment 使用 node skills。
7. issue workflow Run 要求被选 workflow 的每个节点都有 skill assignment；缺失 skill 时前端禁用 Run。
8. 本地 runner 执行节点时不复用 Copilot CLI session，节点上下文通过 run artifact 显式传递。
9. GitHub tasks 的 selected repository 与 PAT 是独立的任务面板配置持久化。
10. 颜色模式由 `useColorMode` 独立管理，和 workflow 领域状态分开。

## 7. 持久化地图

| 状态 | Owner | 持久化位置 | 说明 |
| --- | --- | --- | --- |
| workflow 列表、active workflow、节点名称、节点 skill | `useWorkflowStore` | 本地会话内存 | 刷新后重新初始化 |
| added skill ids | `useSkillsStore` | 本地会话内存 | 当前作为会话内添加状态 |
| GitHub selected repository | `useGithubTasksStore` | `tsumugi-loom.github.selectedRepository` | Tasks 面板刷新后恢复 |
| GitHub PAT | `useGithubTasksStore` | `tsumugi-loom.github.authToken` | Tasks 面板刷新后恢复 |
| GitHub issues、loading、error | `useGithubTasksStore` | 运行时内存 | repository 或 token 变化后重新请求 |
| Workflow run submission | `useWorkflowRunsStore` | 运行时内存 | issue detail 中展示最近一次本地 runner 提交状态 |
| 颜色模式 | `useColorMode` | `tsumugi-loom-color-mode` | 同步到 document root |

## 8. 验证地图

高层验证入口：

1. `pnpm build`：类型检查和生产构建。
2. `pnpm test:logic`：运行 `tests/logic/**/*.test.ts`。
3. `pnpm test:ui`：运行 Playwright UI 测试。
4. `pnpm test:all`：串行运行逻辑测试和 UI 测试。

模块级测试归属和当前覆盖点见 [docs/validation-map.md](docs/validation-map.md)。
