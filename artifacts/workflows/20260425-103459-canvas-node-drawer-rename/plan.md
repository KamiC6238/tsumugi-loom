# Plan

Workflow ID: 20260425-103459-canvas-node-drawer-rename
Goal: 让 flow 画布里的节点都可点击，并在右侧 drawer 中修改节点名称。

## Source User Request

用户要求把当前 Vue Flow 画布从“只展示节点”升级为“所有节点都可点击”。点击任意节点后，页面右侧需要弹出一个 drawer 组件，用户可以在 drawer 中修改该节点的名称。现有页面已经具备 workflow 创建、切换与画布展示能力，但还没有节点级的选中与编辑交互。

## Problem

当前实现只把 active workflow 的 nodes/edges 传给 VueFlow 渲染，画布组件没有向外暴露节点点击事件，也没有任何“当前被编辑节点”的状态。节点名称只在 workflow 创建时播种，之后无法在 UI 中修改，因此右侧也不存在节点编辑入口。

## Scope

1. 为 active workflow 增加节点点击后的编辑状态，并保持 workflow 列表和创建流程原样可用。
2. 在画布区域接入节点点击事件，把被点击的节点透传给上层状态。
3. 新增一个右侧 drawer 组件，用于展示当前节点并编辑节点名称。
4. 保存后立即把新的节点名称回写到当前 workflow 的节点数据，并同步反映在 Vue Flow 画布上。

## Out of Scope

1. 不新增节点、删除节点、编辑边、拖拽持久化或后端保存。
2. 不改动 workflow 左侧 sidebar 的创建/切换交互与视觉语言。
3. 不自定义新的 drawer primitive；若仓库当前缺少 Drawer，则通过 shadcn-vue 生成标准 Drawer 组件后复用。

## Constraints

1. 继续使用 Vue 3 Composition API 与 script setup，遵守显式 props down / events up。
2. 优先复用 shadcn-vue 与现有 src/components/ui 下的 Drawer、Button、Input、Label；若 Drawer 尚未存在，先通过 shadcn-vue CLI 补齐，再由 feature 层组合使用。
3. 领域状态仍由 composable 统一管理，避免让 App.vue 回退成大组件。
4. Testing 阶段至少执行 pnpm test:logic 与 pnpm test:ui，并把结果写回 workflow artifact。

## Component Reuse Strategy

1. 优先复用 shadcn-vue 官方 Drawer 组件体系；若 src/components/ui 下尚无 Drawer，则通过 shadcn-vue CLI 生成 Drawer、DrawerContent、DrawerHeader、DrawerFooter 等标准子组件，而不是用 Dialog 伪装。
2. 复用现有 Button、Input、Label 处理节点名称编辑表单和动作按钮。
3. 仅新增 workflow feature 层组件 WorkflowNodeDrawer.vue，用来承载节点编辑表单与业务事件；UI primitive 仍由 src/components/ui/drawer 提供。

## Component Map

1. App.vue：保持为组合层，负责连接 WorkflowSidebar、WorkflowCanvasPanel、CreateWorkflowDialog 与新的 WorkflowNodeDrawer。
2. useWorkflowStudio.ts：作为单一数据源，管理 workflows、activeWorkflow、create dialog 状态，以及 selected node / node editor open 状态与重命名动作。
3. WorkflowCanvasPanel.vue：继续负责 active workflow header、metrics 与 VueFlow 渲染，并向父层显式 emit node-click。
4. src/components/ui/drawer/*：提供 shadcn-vue Drawer primitive，承载右侧抽屉的 overlay、content 与关闭行为。
5. WorkflowNodeDrawer.vue：接收当前节点与 open 状态，基于 Drawer primitive 展示表单并通过事件把重命名与关闭动作抛回父层。

## Assumptions

1. 切换 active workflow 时，若当前选中的节点不属于新 workflow，应关闭 drawer 并清空节点编辑状态，避免跨 workflow 残留。
2. 节点名称保存时应忽略空白值，保持现有“空白名不提交”的表单约束风格。
3. Vue Flow 默认节点文本在 Playwright 中可通过可见文本定位，适合作为 UI 回归断言的一部分。

## Open Questions

1. 无。

## Task Breakdown

1. 在 src/lib/workflows.ts 中补充节点重命名的纯函数，并在 tests/logic/workflow-state.test.ts 中为节点名称更新规则补充高价值逻辑测试。
2. 扩展 src/composables/useWorkflowStudio.ts，集中管理 selected node / drawer open 状态，并提供 node click、drawer close、rename node 动作。
3. 通过 shadcn-vue CLI 添加 Drawer primitive（若缺失），并更新 src/components/workflow-studio/WorkflowCanvasPanel.vue，使其把 Vue Flow 的 node-click 显式 emit 给父层；新增 WorkflowNodeDrawer.vue 复用 Drawer/Input/Button/Label 组合右侧编辑抽屉。
4. 更新 App.vue 连接新的 drawer 数据流，并补充 tests/ui/workflow-sidebar.spec.ts，覆盖“点击节点打开 drawer 并修改节点名称”的用户路径。
5. 在 Coding 阶段先做窄验证，再在 Testing 阶段执行 pnpm test:logic 与 pnpm test:ui，并记录结果。

## Acceptance Criteria

1. 选中任意 active workflow 节点时，会在页面右侧打开一个可见的 drawer 编辑面板。
2. drawer 中会展示当前节点名称，并允许用户修改为新的非空名称。
3. 保存后，Vue Flow 画布中的该节点名称会立即更新，且不影响其他 workflow 或其他节点。
4. 切换 workflow 或关闭 drawer 后，不会残留旧节点的编辑状态。
5. 现有创建 workflow、切换 workflow、空白名禁用保存的行为仍保持通过。

## Test Strategy

1. 逻辑层：为节点重命名规则补充 Vitest，覆盖成功重命名、空白名忽略和未知节点/未知 workflow 的无副作用路径。
2. UI 层：补充 Playwright 路径，验证点击节点打开 drawer、输入新名称并保存后，画布文本同步更新。
3. Testing 阶段执行 pnpm test:logic 与 pnpm test:ui；若环境允许，再补充 pnpm build 作为额外构建级验证。

## Docs Impact

1. 本轮优先更新 workflow artifacts；默认不改 README 与架构文档。

## Handoff Notes for Coding

先把“节点名称更新”收敛成纯函数，确保状态更新规则可以被直接测试，然后再把 selected node / drawer 状态接入 composable。UI 侧优先确认并复用 shadcn-vue Drawer；若仓库里还没有对应 primitive，先用 CLI 生成到 src/components/ui/drawer，再由 WorkflowNodeDrawer.vue 承接业务表单。App.vue 必须保持组合层角色；如果需要新增模板细节，优先落到 WorkflowCanvasPanel.vue、src/components/ui/drawer 或新的 WorkflowNodeDrawer.vue。第一轮实质性改动后，立刻运行最窄的逻辑或 UI 校验，而不是继续扩散改动面。