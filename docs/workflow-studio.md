# Workflow Studio Module

状态：2026-04-29 当前实现基线

文档类型：模块行为文档

## Purpose

Workflow Studio 是当前应用的主工作台模块，负责本地 workflow 的创建、选择、画布展示和节点编辑。它当前聚焦“多个 workflow 的侧边栏管理 + 当前 workflow 的可视化画布 + 节点 Drawer 编辑”的前端体验。

## Owned Sources

1. `src/App.vue`：页面组合层，在 workflow canvas、Skills 面板和 Tasks 面板之间切换。
2. `src/composables/useWorkflowStudio.ts`：页面级编排层，连接 workflow store、skills store 和局部 UI 状态。
3. `src/composables/useWorkflow.ts`：workflow store 门面，向页面暴露 workflows、activeWorkflowId、activeWorkflow 和 workflow 动作。
4. `src/stores/workflows.ts`：Pinia workflow store，持有 workflowState 会话状态。
5. `src/lib/workflows.ts`：纯函数状态层，负责创建空状态、追加 workflow、切换活动 workflow、节点改名、节点 skill assignment 更新和解析当前活动 workflow。
6. `src/components/workflow-studio/WorkflowSidebar.vue`：workflow 列表、创建入口、Skills/Tasks 入口和主题切换所在区域。
7. `src/components/workflow-studio/CreateWorkflowDialog.vue`：创建 workflow 的表单草稿和提交事件。
8. `src/components/workflow-studio/WorkflowCanvasPanel.vue`：活动 workflow 明细、Vue Flow 画布和节点点击事件。
9. `src/components/workflow-studio/WorkflowNodeDrawer.vue`：节点名称和节点 skill 的编辑界面。

## User-Facing Contract

1. 用户可以在侧边栏打开创建对话框并创建具名 workflow。
2. 新建 workflow 会成为当前 active workflow，并生成固定结构的 seeded 节点与边。
3. 侧边栏展示 workflow 列表、数量和当前选中状态；点击列表项会切换 active workflow。
4. 主区域在存在 active workflow 时展示 Vue Flow 画布；空 workflow 场景展示空状态。
5. 点击当前 active workflow 的节点会打开右侧 Drawer。
6. Drawer 中保存节点名称时会 trim 输入，并把节点 label 同步回画布。
7. Drawer 的 skill 候选来自已经添加的 node skills。
8. 打开 Skills 面板或 Tasks 面板会关闭当前节点 Drawer。
9. 从 Skills 面板或 Tasks 面板重新选择 workflow 时，右侧主区域回到 workflow canvas，并清理节点编辑态。

## State Model

1. workflow 领域状态由 Pinia workflow store 持有，页面组件通过 store 派生 workflow 列表。
2. `activeWorkflowId` 是活动 workflow 的唯一来源，`activeWorkflow` 由它派生。
3. `CreateWorkflowDialog` 只保存输入草稿；真正的创建动作委托给 `useWorkflowStudio.createWorkflow()`。
4. `useWorkflowStudio` 持有当前右侧面板状态、创建对话框开关和 `selectedNodeId`。
5. `selectedNode` 从 active workflow 与 `selectedNodeId` 派生，避免 Drawer 内保存过期节点副本。
6. workflow store 的 create/select/update/get node 动作返回成功布尔值，用来让页面编排层决定是否关闭对话框、切换面板或清理 Drawer。
7. 当前 workflow 数据保存在本地会话内存；刷新页面后 workflow、节点名称和节点 skill assignment 重新初始化。

## Data Flow

1. `App.vue` 调用 `useWorkflowStudio()` 获取状态和事件处理器。
2. `WorkflowSidebar` 依据 workflows 与 activeWorkflowId 渲染列表，并通过事件上报 create/select/open skills/open tasks 意图。
3. `CreateWorkflowDialog` 提交名称后发出 create 事件，`useWorkflowStudio` 委托 workflow store 生成 workflow 并激活它。
4. `WorkflowCanvasPanel` 接收 activeWorkflow，并把 nodes 与 edges 交给 Vue Flow 渲染。
5. `WorkflowCanvasPanel` 捕获节点点击后向上 emit nodeClick。
6. `useWorkflowStudio.openNodeDrawer()` 先确认节点属于当前 active workflow，再记录 `selectedNodeId`。
7. `WorkflowNodeDrawer` 保存时把新 label 和可选 node skill id 传回 `useWorkflowStudio.saveSelectedNode()`。
8. `saveSelectedNode()` 委托 workflow store 更新节点，再关闭 Drawer 并清理 `selectedNodeId`。

## Integration Points

1. 与 Skills Catalog 的交点是 Drawer 的 `addedNodeSkills` 候选列表和节点 `skillId` 保存规则。
2. 与 GitHub Tasks 的交点是右侧主区域面板切换；workflow 数据仍由 Workflow Studio 管理。
3. 与 Color Mode 的交点是 Sidebar 品牌区；主题状态由 Color Mode 管理。
4. 与 UI primitives 的交点是 Button、Dialog、Drawer、Input、Label、Select 等基础组件。

## Validation Basis

1. `tests/logic/workflow-state.test.ts` 覆盖 workflow 状态变换纯函数契约。
2. `tests/logic/workflow-store.test.ts` 覆盖 Pinia workflow store 与 `useWorkflow` 门面。
3. `tests/logic/workflow-studio.test.ts` 覆盖页面级 composable 的面板切换、skill 添加状态和节点保存规则。
4. `tests/logic/workflow-ui.test.ts` 覆盖 Sidebar、App、Drawer 等组件接线。
5. `tests/ui/workflow-sidebar.spec.ts` 覆盖创建 workflow、切换画布、节点 Drawer 改名、added node skill select 和从全局面板回到画布等关键交互。
