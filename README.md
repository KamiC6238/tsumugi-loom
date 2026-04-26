# Tsumugi Loom

Tsumugi Loom 是一个基于 Vue 3、TypeScript 和 Vite 的前端探索项目，用来验证“侧边栏管理多个 workflow + 主画布展示并轻量编辑当前 workflow + 全局 skill catalog 选择”的单页工作台体验。

当前应用聚焦于本地 workflow studio：用户可以创建具名 workflow、在侧边栏切换当前活动 workflow、在主区域查看由 Vue Flow 渲染的 seeded 画布，也可以打开全局 Skills 面板，从仓库 `.github/skills` 中查看并添加 macro/node skills，并在右侧 drawer 中编辑被点击节点的名称与可用 node skill。Workflow 数据仍驻留在本地内存中，用户添加的 skills 由 Pinia store 承载。

## Current Capabilities

1. 在侧边栏创建 workflow，并自动切换到新建项。
2. 在侧边栏查看 workflow 列表、节点数和边数，并切换活动项。
3. 在主区域显示当前 workflow 的标题、指标卡和可点击的 Vue Flow 画布。
4. 点击画布中的节点，在右侧 drawer 中修改节点名称，并立即同步到画布。
5. 从侧边栏打开全局 Skills 面板，按 macro/node 查看 `.github/skills` 中的 skill 卡片并切换添加状态。
6. 在节点 drawer 中从已添加的 node skills 中选择当前节点的 skill。
7. 在没有活动 workflow 时显示空状态，引导用户从侧边栏创建第一条 workflow。

## Runtime Shape

1. App.vue 作为薄组合层，只负责连接 workflow feature 组件与顶层 composable。
2. useWorkflowStudio 统一管理 workflow 集合、活动 workflow、全局 skills 面板状态、创建对话框开关，以及当前选中节点和 drawer 编辑态；已添加 skill ids 由 Pinia skills store 持有并通过 useWorkflowStudio 下发给页面组件。
3. WorkflowSidebar、WorkflowCanvasPanel、SkillsPanel、CreateWorkflowDialog 和 WorkflowNodeDrawer 分别承担列表、详情画布、全局 skill catalog、创建表单与节点编辑抽屉的页面级职责。
4. workflow 领域数据与节点编辑态仍驻留在本地内存中，added skills 为 Pinia 会话状态，不包含持久化、后端 API 或多人协作。

更详细的边界、目录职责和数据流说明见 ARCHITECTURE.md。

## Development

1. pnpm install
2. pnpm dev

常用命令：

1. pnpm test:logic
2. pnpm test:ui
3. pnpm build
4. pnpm test:all
