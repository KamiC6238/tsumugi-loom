# Code Change Summary

Workflow ID: 20260425-143708-vue-flow-sidebar-workflows

## Scope

1. 用 workflow 管理页替换默认 Vite 起始页，实现左右布局、sidebar、多 workflow 创建与切换。
2. 抽离 workflow 状态与示例 graph 生成逻辑，便于 Vitest 覆盖。
3. 接入 Vue Flow 样式与画布渲染。
4. 把 create 按钮和弹窗从手写 primitive 切换为 shadcn-vue 生成组件。

## Changed Files

1. src/App.vue：实现 sidebar、detail panel、Vue Flow 画布与 shadcn-vue create dialog。
2. src/lib/workflows.ts：新增 workflow 状态模型和示例节点/边生成逻辑。
3. src/style.css：导入 Vue Flow 必需样式。
4. src/components/ui/button/*、src/components/ui/dialog/*、src/components/ui/input/*、src/components/ui/label/*：通过 shadcn-vue CLI scaffold 生成。
5. package.json 与 pnpm-lock.yaml：由 shadcn-vue scaffold 补充 @vueuse/core 依赖。
6. tests/logic/workflow-state.test.ts：新增 workflow 状态逻辑测试。
7. tests/ui/workflow-sidebar.spec.ts：新增 sidebar create/switch 关键路径 UI 测试。

## Key Decisions

1. workflow 状态放在 src/lib/workflows.ts，以纯函数形式表达创建与切换规则，而不是把决策逻辑散落在模板事件处理里。
2. 右侧画布使用每个 workflow 独立的 seeded nodes/edges，满足“创建后显示 vue-flow”与“可切换不同 workflow”的最小产品要求。
3. 虽然首版对话框曾用轻量自实现快速验证交互，但在收到用户反馈后改回 shadcn-vue 生成组件，以与仓库既有 UI 体系保持一致。
4. Vue Flow graph payload 挂在 shallowRef 中，避免 App.vue 上出现过深类型展开导致的 TS2589。

## Validation

1. pnpm build：通过。
2. pnpm test:logic：通过。
3. pnpm test:ui：通过。