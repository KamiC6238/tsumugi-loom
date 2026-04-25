# TDD Cycle Artifact

Workflow ID: 20260425-143708-vue-flow-sidebar-workflows
Coding Skill: .github/skills/tdd-coding-writer/SKILL.md

## Task Coverage

1. Plan Task 1: 设计 workflow 数据模型与创建/选中逻辑，提炼可测试的纯函数帮助实现多 workflow 管理。
2. Plan Task 2: 重写顶层页面，加入 sidebar、create 模态、workflow 列表和右侧条件渲染的 vue-flow 画布。
3. Plan Task 3: 为 workflow 管理逻辑编写 Vitest 测试，为创建和切换的核心用户路径编写 Playwright 测试。

## Step 1

### Plan Task

Plan Task 1 + Plan Task 3: workflow 状态模型与 Vitest 逻辑测试。

### Test Tool

Vitest

### Test Value Decision

workflow 创建、空白输入保护、自动选中和多 workflow 切换都属于状态决策与回归风险点，值得做产品级逻辑测试。

### RED

先写 tests/logic/workflow-state.test.ts。首次执行 pnpm test:logic tests/logic/workflow-state.test.ts 时，失败原因为 ../../src/lib/workflows 模块不存在；之后根据 reviewer 反馈移除了对固定 id 和节点数量的过度绑定，再补强空白名 no-op 与图数据独立性断言。

### GREEN

新增 src/lib/workflows.ts，提供 createEmptyWorkflowState、appendWorkflow、selectWorkflow、getActiveWorkflow 和示例节点/边生成逻辑，使 workflow-state 测试全部转绿。

### REFACTOR

根据 Test Case Reviewer 两轮 changes_requested，进一步把测试收敛到状态契约：改为使用真实生成 id、验证 graph payload 存在且独立、验证已有 workflow 状态下的空白名称 no-op。

### Status

approved

## Step 2

### Plan Task

Plan Task 2 + Plan Task 3: sidebar 页面、create dialog、vue-flow 画布与 Playwright UI 测试。

### Test Tool

Playwright

### Test Value Decision

创建 workflow、自动切换、sidebar 互斥选中态以及右侧画布随 active workflow 切换，都是直接面向用户的关键交互路径，适合用产品级 UI 测试覆盖。

### RED

先写 tests/ui/workflow-sidebar.spec.ts。首次执行 pnpm test:ui tests/ui/workflow-sidebar.spec.ts 时失败于找不到 Create workflow 按钮，说明页面尚未实现；之后 reviewer 要求补强 active panel 与画布内容切换断言，以及空白输入不可保存的场景。中途首次实现的自定义弹窗还暴露了 Save workflow 点击被底层 empty state 拦截的问题。

### GREEN

重写 src/App.vue，接入 sidebar、右侧 detail panel、Vue Flow 画布和 create dialog；修复弹窗层级问题后，Playwright 窄测试转绿。随后根据用户反馈，用 shadcn-vue scaffold 生成 Button、Dialog、Input、Label 组件，并将 create 按钮与弹窗重构为 shadcn 组件实现，保持同一组 UI 测试继续通过。

### REFACTOR

把 workflow 状态容器从深层 ref 改成 shallowRef，以避免 Vue 对 vue-flow 节点数据做过深类型展开；同时保留自定义视觉层，但不再手写底层 dialog/button/input primitive。

### Status

approved

## Final Checks

1. pnpm test:logic tests/logic/workflow-state.test.ts: 通过，5/5 tests passed。
2. pnpm test:ui tests/ui/workflow-sidebar.spec.ts: 通过，2/2 tests passed。
3. pnpm build: 通过。