# Code Change Summary

Workflow ID: 20260425-103459-canvas-node-drawer-rename

## Scope

1. 为 workflow 画布节点增加点击选中与右侧 Drawer 编辑能力。
2. 复用 shadcn-vue Drawer primitive，而不是用 Dialog 伪装抽屉。
3. 在 workflow 切换时清理节点编辑态，并补上对应 UI 回归。

## Changed Files

1. package.json：新增 vaul-vue 依赖，供 shadcn-vue Drawer primitive 使用。
2. pnpm-lock.yaml：锁定新增依赖。
3. src/components/ui/drawer/*：通过 shadcn-vue CLI 添加 Drawer primitive。
4. src/composables/useWorkflowStudio.ts：新增 selected node、drawer open 状态与节点改名动作，并在 workflow 切换/新建时清理节点编辑态。
5. src/components/workflow-studio/WorkflowCanvasPanel.vue：把 Vue Flow 的 node-click 显式 emit 给父层。
6. src/components/workflow-studio/WorkflowNodeDrawer.vue：新增右侧节点编辑抽屉，复用 Drawer、Button、Input、Label 组合表单与动作。
7. src/App.vue：保持组合层职责，连接 canvas、drawer 与 composable 事件流。
8. tests/ui/workflow-sidebar.spec.ts：覆盖节点点击打开 Drawer、保存后改名、带空白输入保存后的 trim 同步，以及 workflow 切换/点击 Close 两条清理节点编辑态路径。

## Key Decisions

1. 采用 shadcn-vue 官方 Drawer primitive，并保持 primitive 代码尽量接近生成结果；业务样式和交互放在 WorkflowNodeDrawer.vue。
2. selected node 只存 node id，由 composable 基于 activeWorkflow 派生当前选中节点，维持单一数据源。
3. Drawer 设为非模态，保证抽屉打开时仍可从 sidebar 切换 workflow，从而满足“切换 workflow 时清理节点编辑态”的交互要求。
4. 节点改名继续复用 src/lib/workflows.ts 已有的 renameWorkflowNode 纯函数，不重复引入第二套状态更新逻辑。

## Validation

1. 定向 Playwright 回归：tests/ui/workflow-sidebar.spec.ts 通过，5/5 tests passed。
2. Test Case Reviewer：approved，新增/修改测试的 coverage 对当前风险切片足够。