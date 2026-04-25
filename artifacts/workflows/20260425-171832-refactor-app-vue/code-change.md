# Code Change Summary

Workflow ID: 20260425-171832-refactor-app-vue

## Scope

1. 把 App.vue 从大体量页面组件重构为纯组合层。
2. 抽出 workflow feature composable，集中管理领域状态与动作。
3. 抽出 sidebar、detail panel、create dialog 三个 feature 组件，并继续复用现有 shadcn-vue primitives。

## Changed Files

1. src/App.vue：改为只负责组合 workflow feature 组件与顶层状态接口。
2. src/composables/useWorkflowStudio.ts：新增 workflow 页面领域 composable，封装创建弹窗开关、workflow 创建与切换。
3. src/components/workflow-studio/WorkflowSidebar.vue：承载品牌区、create 按钮与 workflow 列表。
4. src/components/workflow-studio/WorkflowCanvasPanel.vue：承载 active workflow header、metrics、canvas 与 empty state。
5. src/components/workflow-studio/CreateWorkflowDialog.vue：承载创建 workflow 的对话框与输入草稿状态。

## Key Decisions

1. 继续复用 src/components/ui 下现有 Button、Dialog、Input、Label，不新增基础 UI primitive。
2. workflow 领域状态仍由顶层 composable 统一管理；仅把对话框输入草稿下沉到 CreateWorkflowDialog 组件内部，缩小状态边界。
3. App.vue 不再直接持有 sidebar/detail/dialog 的完整模板与样式，只负责按 props down / events up 连接 feature 组件。
4. 不修改 src/lib/workflows.ts、现有测试契约和用户可见文案，优先把这次改动控制为“结构重排而非行为变更”。

## Validation

1. 定向 Playwright 回归：tests/ui/workflow-sidebar.spec.ts 通过，2/2 tests passed。