# TDD Cycle Artifact

Workflow ID: 20260425-095256-vue-flow-mvp-five-node-dag-spike
Coding Skill: .github/skills/tdd-coding-writer/SKILL.md

## Task Coverage

1. T1 定义五节点图模型。
2. T2 接入 Vue Flow 画布。
3. T3 补齐逻辑测试。
4. T4 修正选中态与只读语义。
5. T5 补齐 UI 测试与构建验证。
6. T6 收紧 workflow validate 的 artifact 门禁，确保 test-review 与 knowledge-delta 合同被真正校验。

## Step

### Plan Task

T1 + T2 + T5 + T6: 定义五节点图模型、接入 Vue Flow 画布、补齐验证，并收紧 workflow validate 门禁。

### Test Tool

vitest 和 playwright

### RED

先为纯图模型新增 Vitest 用例，覆盖五节点顺序、连接关系、摘要计算、lookup、防御性拷贝和状态标签。随后新增 Playwright 用例，覆盖默认选中节点、侧栏点击切换、画布点击切换，以及 strict DAG 不应暴露 handles。UI 测试第一次执行时先后暴露出 webServer 启动超时和浏览器缺失，属于环境层失败；在行为层上，独立 code review 还暴露了画布高亮与详情选中不同步的问题。

### GREEN

新增 src/lib/workflowGraph.ts 作为纯 TypeScript 图模型，再用 src/App.vue 和 src/components/StageNode.vue 接入 Vue Flow 画布、节点详情和运行摘要。为修复行为缺陷，把节点选中态统一收敛到 App 的单一状态源，显式把 selected 写回 Vue Flow 节点，并移除只读 DAG 不需要的 handles。为修复测试环境问题，把 Playwright webServer 命令改成 pnpm exec vite --host 127.0.0.1 --port 4173，并安装 Playwright 浏览器运行时。

### REFACTOR

把五节点阶段和连接关系集中进 workflowGraph 模块，避免 UI 直接散落领域常量。补充更完整的逻辑测试和 UI 测试，确保后续演进时既能守住模型合同，也能守住主交互路径。把第 5 节点命名统一为 Docs Reconciler，使视觉合同与仓库文档一致。进一步收紧 workflow validate，对 test-review verdict 和 knowledge-delta 最小结构建立明确门禁，并用临时克隆 workflow bundle 的逻辑测试直接验证这些门禁。

### Status

approved

## Final Checks

1. pnpm test:logic tests/logic/workflow-graph.test.ts 通过，7/7 测试通过。
2. pnpm test:logic tests/logic/workflow-validation.test.ts 通过，5/5 测试通过。
3. pnpm test:ui tests/ui/workflow-spike.spec.ts 通过，1/1 Playwright 用例通过。
4. pnpm build 通过，vue-tsc -b 和 Vite production build 均成功。
5. pnpm loom:workflow:validate -- 20260425-095256-vue-flow-mvp-five-node-dag-spike 通过。