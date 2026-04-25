# Plan

Workflow ID: 20260425-171832-refactor-app-vue
Goal: 按 Vue 组合式最佳实践拆分 App.vue，同时保持现有 workflow 页面行为不变。

## Source User Request

用户要求按照仓库内的 Vue 与 vue-best-practices skill，对当前的 App.vue 做一次结构性重构。重构目标不是增加新功能，而是让实现更符合 Vue 3 Composition API 的职责边界和数据流约束，同时保留现有 workflow sidebar、创建弹窗和 canvas 展示行为。当前页面已经有稳定的逻辑测试和 Playwright UI 测试，可作为这次重构的行为护栏。计划需要先明确组件复用策略，再把 root 组件降为组合层。

## Problem

当前 App.vue 同时承担 workflow 状态编排、创建弹窗表单、sidebar 列表渲染和右侧详情画布渲染四类职责。根组件过大，导致数据流和局部状态边界不清晰，不符合 vue-best-practices 对“entry/root component 以组合层为主”的要求，也让后续维护和扩展变得更脆弱。

## Scope

1. 把 App.vue 重构为薄组合层，只负责组装 feature 组件与顶层状态接口。
2. 提取 workflow 页面需要的 feature 组件与 composable，明确 props down / events up 的数据流。
3. 保持现有 sidebar、创建 workflow、切换 active workflow、右侧 canvas/empty state 的用户行为与文案契约不变。

## Out of Scope

1. 不改变 workflow 数据模型、节点种子规则或 select/create 的业务语义。
2. 不新增持久化、删除、重命名、拖拽排序等功能。
3. 不替换现有 shadcn-vue primitive，也不做视觉改版。

## Constraints

1. 继续使用 Vue 3 Composition API 与 script setup，遵守 vue-best-practices 的 must-read 参考要求。
2. 组件通信必须保持显式、可类型化；根组件不再持有多块模板细节。
3. 测试阶段仍需执行仓库默认全量验证：pnpm test:logic 与 pnpm test:ui；若可行再补 pnpm build / pnpm test:all。

## Component Reuse Strategy

1. 继续直接复用现有 src/components/ui 下的 Button、Dialog、Input、Label，不自定义新的基础交互 primitive。
2. 新增的自定义实现仅限 workflow feature 层组件与 composable：这些是页面级职责切分，不是 UI primitive 的重复造轮子。

## Assumptions

1. 当前现有逻辑测试与 UI 测试已经足以覆盖本次“结构不改行为”的主要回归风险。
2. 创建弹窗中的输入草稿状态可以下沉到对话框组件内部，而 workflow 领域状态仍由顶层 composable 统一编排。

## Open Questions

1. 无。

## Task Breakdown

1. 设计组件边界与复用策略：保留现有 shadcn-vue primitives，规划 App.vue、workflow composable、sidebar、detail panel、create dialog 的单一职责与数据契约。
2. 提取 workflow feature composable，集中管理 workflowState、activeWorkflow、dialog open 状态和领域动作，让 App.vue 只消费组合后的状态与事件处理器。
3. 提取 sidebar、canvas detail、create dialog 子组件，并保持测试依赖的文案、aria 属性和 data-testid 不变。
4. 用现有逻辑测试、UI 测试和构建命令验证重构未引入行为回归，并把结果写入 workflow artifacts。

## Acceptance Criteria

1. App.vue 变为薄组合层，不再直接承载 sidebar 列表、detail 画布和创建表单的完整实现。
2. workflow 页面仍能创建 workflow、自动切换 active workflow，并在 sidebar 中切换已有 workflow。
3. 现有测试依赖的按钮名称、标题、说明文案、aria-pressed 和 data-testid 契约保持可用。
4. 重构后通过 logic、ui 与至少一个构建级验证，证明拆分没有改变用户可见行为。

## Test Strategy

1. 优先复用现有 tests/logic/workflow-state.test.ts 与 tests/ui/workflow-sidebar.spec.ts 作为 focused regression checks，不为纯结构重排机械新增低价值测试。
2. 运行 pnpm test:logic、pnpm test:ui 与 pnpm build；如环境允许，再运行 pnpm test:all 作为汇总验证。

## Docs Impact

1. 本轮主要更新 workflow artifacts，不修改 README 或架构文档。
2. 若 review 阶段发现值得沉淀的 Vue 组件边界约束，再决定是否写入 repo memory。

## Handoff Notes for Coding

优先把组件地图固定下来：App.vue 作为组合层；workflow composable 负责领域状态与动作；sidebar 组件只接收 workflow 列表、active id 与 create/select 事件；detail panel 组件只接收 active workflow 并渲染 header、metrics、canvas/empty state；create dialog 组件复用现有 Dialog/Input/Button/Label，并通过显式事件把新名称提交给父层。先做最小切分，不改测试文案和行为，再立刻跑现有窄测试验证。若拆分后第一轮验证失败，先在当前切片内修正契约漂移，不扩散到新的功能改动。