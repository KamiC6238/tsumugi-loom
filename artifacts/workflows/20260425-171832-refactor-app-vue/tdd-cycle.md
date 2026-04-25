# TDD Cycle Artifact

Workflow ID: 20260425-171832-refactor-app-vue
Coding Skill: .github/skills/tdd-coding-writer/SKILL.md

## Task Coverage

1. Plan Task 1: 设计组件边界与复用策略。
2. Plan Task 2: 提取 workflow feature composable 与领域动作。
3. Plan Task 3: 提取 sidebar、canvas detail、create dialog 子组件并保持测试契约不变。

## Step 1

### Plan Task

Plan Task 1 + Plan Task 2: 根组件瘦身与 composable 抽取。

### Test Tool

Alternative validation

### Test Value Decision

这一步是结构重排，不引入新的业务规则；新增产品级测试的价值低，主要风险来自既有用户路径回归，因此采用已有回归测试作为等价验证，而不是机械补新测试。

### RED

not-applicable。未新增新功能或新决策点，不先造新的失败测试。

### GREEN

新增 src/composables/useWorkflowStudio.ts，把 workflowState、activeWorkflow、dialog open 状态和创建/切换动作统一收敛；App.vue 改为只负责组合组件。

### REFACTOR

将创建弹窗输入草稿状态下沉到 CreateWorkflowDialog.vue，减少顶层临时状态；同时把 sidebar、detail panel、dialog 样式按组件归位，保证每个组件只有单一职责。

### Status

completed via alternative validation

## Step 2

### Plan Task

Plan Task 3: feature 组件拆分后的行为回归验证。

### Test Tool

Existing Playwright regression

### Test Value Decision

tests/ui/workflow-sidebar.spec.ts 已覆盖创建 workflow、自动切换、空白名禁用和 active canvas 切换，是当前最贴近用户风险的验证面，优先级高于新增结构性测试。

### RED

not-applicable。复用既有回归测试作为重构护栏，而不是编写新的失败测试。

### GREEN

重构完成后立即执行 tests/ui/workflow-sidebar.spec.ts，对话框、sidebar 与 detail panel 的交互路径保持通过。

### REFACTOR

将 App.vue 的模板和样式缩减到布局壳层，确保 root component 保持 composition surface 角色。

### Status

approved by focused regression

## Final Checks

1. 定向 Playwright 回归：通过，2/2 tests passed。