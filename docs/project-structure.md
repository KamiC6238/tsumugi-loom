# Project Structure And Ownership

状态：2026-04-29 当前实现基线

文档类型：支撑文档

## Purpose

本文档帮助 Agent 根据目录和文件职责快速定位变更范围。它记录仓库结构、长期文档归属、workflow artifact 约定和工具链入口。

## Top-Level Ownership

1. `src/`：前端运行时代码。
2. `src/composables/`：页面级状态编排与组合逻辑。
3. `src/stores/`：Pinia store 层，当前承载 workflow 会话状态、全局 added skills 状态与 GitHub tasks 状态。
4. `src/lib/`：与视图解耦的纯状态与辅助逻辑，包括 workflow 状态变换、skill catalog 解析与 GitHub tasks helper。
5. `src/components/`：workflow feature 组件和可复用 UI 组件。
6. `src/components/ui/`：shadcn-vue / Reka UI / Vaul 相关 UI 原语封装。
7. `tests/logic/`：Vitest 逻辑测试和组件接线测试。
8. `tests/ui/`：Playwright 端到端 UI 测试。
9. `public/` 与 `src/assets/`：静态资源。
10. `scripts/loom/`：workflow 脚本自动化入口，当前包含本地 Copilot runner，负责浏览器外 workflow Run 执行。
11. `artifacts/workflows/`：每次开发回合生成的显式 workflow 产物，如 plan、review、test-report 与 knowledge delta。
12. `artifacts/runs/`：本地 runner 生成的 issue workflow Run 产物，包含 input snapshot、skill snapshot、节点 prompt、日志和 node-result。
13. `docs/`：长期维护的模块文档和支撑文档。
14. `ARCHITECTURE.md`：项目业务地图和文档路由入口。
15. `README.md`：项目定位、入口说明和高层使用方式。

## Runtime Source Routing

| 变更目标 | 主要目录或文件 | 对应长期文档 |
| --- | --- | --- |
| Workflow shell、Sidebar、Canvas、Drawer | `src/App.vue`, `src/composables/useWorkflowStudio.ts`, `src/components/workflow-studio/`, `src/stores/workflows.ts`, `src/lib/workflows.ts` | [workflow-studio.md](workflow-studio.md) |
| Skill catalog 和 skill 添加状态 | `.github/skills/`, `src/lib/skills.ts`, `src/stores/skills.ts`, `SkillsPanel.vue`, `WorkflowNodeDrawer.vue` | [skills-catalog.md](skills-catalog.md) |
| GitHub Tasks 和 workflow Run | `src/lib/github.ts`, `src/lib/workflowRuns.ts`, `src/stores/githubTasks.ts`, `src/stores/workflowRuns.ts`, `TasksPanel.vue`, `scripts/loom/copilot-runner.mjs` | [github-tasks.md](github-tasks.md) |
| Color mode | `src/composables/useColorMode.ts`, `ThemeModeToggle.vue`, `src/style.css`, `src/main.ts` | [color-mode.md](color-mode.md) |
| 测试策略与验证入口 | `tests/logic/`, `tests/ui/`, `vitest.config.ts`, `playwright.config.ts`, `package.json` | [validation-map.md](validation-map.md) |

## Documentation Ownership

1. `ARCHITECTURE.md` 记录系统边界、模块职责、跨模块关系和稳定结构。
2. `docs/workflow-studio.md` 记录 workflow 工作台模块内部语义、约束、职责和行为。
3. `docs/skills-catalog.md` 记录 skill catalog、分类、添加状态和节点 assignment 约束。
4. `docs/github-tasks.md` 记录 GitHub repository 选择、issues API、PAT 和 Tasks 面板契约。
5. `docs/color-mode.md` 记录主题偏好、localStorage key 和 document root 同步规则。
6. `docs/project-structure.md` 记录目录职责、文档归属和 workflow artifact 约定。
7. `docs/validation-map.md` 记录测试入口、覆盖范围和模块验证归属。
8. `artifacts/workflows/` 记录单次 workflow 的上下文、验证结果和回合内说明；长期稳定事实归入对应长期文档。

## Tooling And Frameworks

1. 应用框架：Vue 3、TypeScript、Vite。
2. 状态管理：Pinia。
3. 画布：Vue Flow。
4. 样式：Tailwind CSS 4、shadcn-vue / Reka UI、项目级 `src/style.css` 变量。
5. 图标：`lucide-vue-next`。
6. 逻辑测试：Vitest，配置在 `vitest.config.ts`。
7. UI 测试：Playwright，配置在 `playwright.config.ts`。
8. 构建入口：`pnpm build`。
9. 本地 Copilot runner：`pnpm runner:copilot` 启动真实 Copilot CLI runner；`pnpm runner:copilot:dry-run` 启动只写 artifact、不调用 Copilot CLI 的 dry-run runner。

## Workflow Artifacts

1. `artifacts/workflows/README.md` 是 workflow artifact 的说明入口。
2. 每个 workflow 回合使用独立时间戳目录。
3. 已存在的回合目录通常包含 `plan.md`、`code-change.md`、`tdd-cycle.md`、`test-report.md`、`test-review.md`、`review.md` 和 `manifest.json`。
4. artifact 可以作为事实依据，但稳定事实需要回写到 `ARCHITECTURE.md`、`README.md` 或 `docs/` 下对应长期文档。
5. `artifacts/runs/<run-id>/` 由本地 Copilot runner 生成，保存 issue workflow Run 的 input、skill snapshot、节点 prompt/log/result 和 run manifest；这些是执行记录，不替代 `artifacts/workflows/` 的开发回合产物。

## Change Guidance For Agents

1. 新增功能前，先从 `ARCHITECTURE.md` 找到模块归属。
2. 修改某个模块时，同时读取该模块文档和 [validation-map.md](validation-map.md)。
3. 变更跨越多个模块时，分别更新每个模块文档；`ARCHITECTURE.md` 保持业务地图职责。
4. 新增顶层目录、新增长期文档类型或改变 artifact 约定时，更新本文档和 `ARCHITECTURE.md` 的路由表。
