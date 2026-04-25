# Code Change Artifact

Workflow ID: 20260425-095256-vue-flow-mvp-five-node-dag-spike

## Files Changed

1. package.json 与 pnpm-lock.yaml：新增 @vue-flow/core、@vue-flow/background、@vue-flow/controls、@vue-flow/minimap 依赖。
2. src/lib/workflowGraph.ts：新增五节点 DAG 的纯 TypeScript 模型和摘要函数。
3. src/components/StageNode.vue：新增 Vue Flow 自定义节点卡片，用于表达阶段状态与输出。
4. src/App.vue：替换 starter 页面，接入 Vue Flow 画布、节点详情、运行摘要和选中态同步逻辑。
5. src/style.css：重写页面与画布样式，建立 spike 所需的视觉层。
6. tests/logic/workflow-graph.test.ts：新增图模型的 Vitest 逻辑测试。
7. tests/ui/workflow-spike.spec.ts：新增主交互路径的 Playwright UI 测试。
8. playwright.config.ts：修正 webServer 启动命令，使 Vite 实际监听 Playwright 期待的 4173 端口。
9. scripts/loom/_shared.mjs：导出 canonicalWorkflowNodeIds，并让 knowledge delta scaffold 复用统一节点 id 集合。
10. scripts/loom/workflow.mjs：补充 test-review approved gate、knowledge-delta 最小结构校验，以及 sourceNodeIds 一致性校验。
11. tests/logic/workflow-validation.test.ts：新增 validateWorkflow 的逻辑测试，覆盖有效 bundle、test-review gate 和 knowledge-delta 结构校验。

## Behavioral Changes

1. 首页现在展示一个固定的五节点 DAG 画布，而不再是默认的 Vite/Vue 起始页。
2. 默认选中当前运行节点 Coding，并在详情面板中展示当前节点合同、输出和 gate 信息。
3. 侧栏点击和画布节点点击都会同步更新选中节点。
4. 画布不再显示误导性的连线 handles，强化 strict DAG read-only MVP 语义。
5. UI 测试现在能实际启动 Vite dev server 并验证主交互路径。
6. workflow validate 现在会明确阻止 test-review 非 approved 的 ready workflow，并会拦截缺少 knowledge-delta 最小字段的 bundle。

## Implementation Notes

1. 把五节点和连接关系集中到 workflowGraph.ts，避免把领域常量散落在 Vue 组件里。
2. 画布仍保持 fixed DAG，而不是直接做可编辑编排器；运行时回退和 gate 目前通过状态表达，而不是通过真正的图回环表达。
3. 选中态以 App 的 selectedStageId 为单一来源，再映射到 Vue Flow 节点 selected，消除画布与详情面板不同步的问题。
4. Playwright webServer 直接使用 pnpm exec vite，避免 pnpm script 参数传递造成的端口漂移。
5. scripts 层引入 canonicalWorkflowNodeIds，避免前端 DAG 与 artifact sourceNodeIds 再次漂移。
6. workflow validation 的新增逻辑通过复制现有有效 workflow bundle 并注入无效输入来测试，避免只靠手工 validate 产生假绿。

## Follow-up Risks

1. 当前仍是前端 spike；节点执行、会话隔离、artifact IO 和重试语义尚未落成真正 runtime。
2. 画布仍是固定布局，后续若进入可编辑 DAG，需要补更细的图约束、布局和持久化设计。
3. 本次 workflow 没有申报 candidate facts，因此尚未触发 Docs Reconciler 对 canonical docs 的写回。
4. workflow validate 仍然没有把 top-level confidence 真正用于 reconcile 写回决策，知识治理策略后续还需继续收敛。
