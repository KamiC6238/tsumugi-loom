# TDD Cycle Artifact

Workflow ID: 20260425-103459-canvas-node-drawer-rename
Coding Skill: .github/skills/tdd-coding-writer/SKILL.md

## Task Coverage

1. Plan Task 2: 扩展 workflow composable，集中管理 selected node、drawer open 状态与节点重命名动作。
2. Plan Task 3: 通过 shadcn-vue 补齐 Drawer primitive，更新画布节点点击上抛，并新增 WorkflowNodeDrawer.vue。
3. Plan Task 4: 补强 UI 回归，覆盖节点改名与 workflow 切换时清理节点编辑态。

## Step 1

### Plan Task

Plan Task 3: 补齐 shadcn-vue Drawer primitive。

### Test Tool

Alternative validation

### Test Value Decision

这一层是官方 shadcn-vue 生成的 UI primitive，主要风险在生成结果是否能无误接入当前仓库，而不是组件内部业务规则，因此不新增产品级测试，改用 CLI 生成结果与局部类型检查做等价验证。

### RED

not-applicable。没有新的业务规则需要先造失败测试。

### GREEN

通过 shadcn-vue CLI 添加 src/components/ui/drawer/*，并引入 vaul-vue 作为依赖，为右侧节点编辑抽屉提供标准 primitive。

### REFACTOR

保留生成文件的官方结构，不在 primitive 层做额外定制，把业务样式和事件留在 feature 组件处理。

### Status

completed via alternative validation

## Step 2

### Plan Task

Plan Task 2 + Plan Task 3: 接入节点点击、drawer 状态与重命名主链路。

### Test Tool

Focused Playwright regression

### Test Value Decision

“点击画布节点打开抽屉并立即改名”是本轮最高风险用户路径，tests/ui/workflow-sidebar.spec.ts 已经存在对应行为用例，最适合作为 RED 到 GREEN 的护栏。

### RED

复用现有 Playwright 用例 opens a node drawer from the canvas and renames the clicked node 作为失败护栏；在实现前，这条路径缺少节点点击上抛和 drawer 状态管理，无法通过。

### GREEN

扩展 src/composables/useWorkflowStudio.ts，增加 selectedNode、isNodeDrawerOpen、openNodeDrawer、setNodeDrawerOpen 和 renameSelectedNode；更新 src/components/workflow-studio/WorkflowCanvasPanel.vue 把 Vue Flow 的 node-click 显式 emit 给父层；新增 src/components/workflow-studio/WorkflowNodeDrawer.vue，并在 src/App.vue 中完成组合接线。

### REFACTOR

将 selected node 保持为 composable 的单一数据源，Drawer 组件只接收 props 和 emit 事件；保存后保持抽屉打开，避免把业务动作和关闭行为耦合在一起。

### Status

approved by focused regression

## Step 3

### Plan Task

Plan Task 4: 补强 workflow 切换时的节点编辑态清理验证。

### Test Tool

Focused Playwright regression + Test Case Reviewer

### Test Value Decision

仅断言“切到别的 workflow 后抽屉不可见”会产生假绿，因为 active workflow 变化本身就会让旧节点消失；要验证真正的清状态，需要覆盖“切走再切回仍然关闭，直到再次点击节点才重开”。

### RED

新增 workflow 切换用例后，首次版本只能证明抽屉在切换后隐藏；Test Case Reviewer 指出这不能区分“已清空 selected node”与“只是当前 workflow 下找不到旧节点”的差异。

### GREEN

将测试扩展为：打开 Orders Intake 节点抽屉，切到 Approval Loop，再切回 Orders Intake，断言抽屉保持关闭，只有再次点击节点才重新打开；同时把 Drawer 调整为非模态，以允许 sidebar 在抽屉打开时继续切换 workflow。随后根据 Review gate 的反馈，再补一条“点击 Close 后切走再切回仍保持关闭”的 UI 回归，并把带空白输入的保存断言补成 trim 后的真实标签。

### REFACTOR

保持现有 role、label 和文本定位方式，只增强状态断言链路，避免引入额外的测试实现细节耦合。

### Status

approved by Test Case Reviewer

## Final Checks

1. 定向 Playwright 回归：tests/ui/workflow-sidebar.spec.ts 通过，5/5 tests passed。
2. Drawer primitive 局部错误检查：src/components/ui/drawer 无错误。