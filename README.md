# Tsumugi Loom

Tsumugi Loom 是一个基于 Vue 3、TypeScript 和 Vite 的前端探索项目，用来验证“侧边栏管理多个 workflow + 主画布展示当前 workflow”的单页工作台体验。

当前应用聚焦于本地内存里的 workflow studio：用户可以创建具名 workflow、在侧边栏切换当前活动 workflow，并在主区域查看由 Vue Flow 渲染的 seeded 画布。

## Current Capabilities

1. 在侧边栏创建 workflow，并自动切换到新建项。
2. 在侧边栏查看 workflow 列表、节点数和边数，并切换活动项。
3. 在主区域显示当前 workflow 的标题、指标卡和 Vue Flow 画布。
4. 在没有活动 workflow 时显示空状态，引导用户从侧边栏创建第一条 workflow。

## Runtime Shape

1. App.vue 作为薄组合层，只负责连接 workflow feature 组件与顶层 composable。
2. useWorkflowStudio 统一管理 workflow 集合、活动 workflow 和创建对话框开关。
3. WorkflowSidebar、WorkflowCanvasPanel 和 CreateWorkflowDialog 分别承担列表、详情画布和创建表单的页面级职责。
4. workflow 领域数据仍驻留在本地内存中，不包含持久化、后端 API 或多人协作。

更详细的边界、目录职责和数据流说明见 ARCHITECTURE.md。

## Development

1. pnpm install
2. pnpm dev

常用命令：

1. pnpm test:logic
2. pnpm test:ui
3. pnpm build
4. pnpm test:all
