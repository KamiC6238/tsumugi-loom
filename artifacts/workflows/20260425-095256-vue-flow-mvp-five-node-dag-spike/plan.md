# Plan Artifact

Workflow ID: 20260425-095256-vue-flow-mvp-five-node-dag-spike
Plan Status: ready
Goal: Spike a Vue Flow MVP for a five-node DAG workflow.

## Source User Request

用户明确说明当前项目要做 agent 编排工具，并希望先把最小可跑通的版本做出来。这个最小版本需要把 Plan、Coding、Test、Code Review 和增量更新 knowledge base 这些节点按顺序连接起来执行。用户进一步选择直接做一个 Vue Flow 的前端 spike，希望尽快把整套流程画出来并试用。这个回合的目标不是实现真正的 runtime，而是把当前仓库已有的 workflow automation 约束落成一个可交互的五节点 DAG 画布。

## Problem

当前仓库只有 Vue 壳层和 workflow automation 脚本，还没有一个能把五阶段流程表达成可点击、可检查、可验证的可视化执行合同。需要一个最小前端 spike 来验证 Vue Flow 是否适合承载这个 DAG MVP，同时保证图模型、主交互路径和测试门禁都可用。

## Scope

1. 引入 Vue Flow 并实现一个固定的五节点 DAG 画布，覆盖 Plan、Coding、Test、Review 和 Docs Reconciler。
2. 提供节点详情面板、当前激活节点摘要和只读 DAG 状态表达。
3. 为图模型补充 Vitest 逻辑测试，并为主交互路径补充 Playwright UI 测试。
4. 修正 Playwright webServer 配置，确保 UI 测试能够实际启动 Vite 服务并运行。
5. 收紧 workflow validate 的 artifact 门禁，确保 test-review 与 knowledge-delta 最小结构合同被真正校验。

## Out of Scope

1. 不实现真正的节点执行 runtime、agent session orchestration 或 DAG 调度引擎。
2. 不实现用户自定义增删节点、拖拽改线或可编辑图编排。
3. 不把这次 spike 直接扩展成完整的 artifact 执行器或 knowledge base 后端。

## Constraints

1. 必须遵守当前仓库已经定义好的五阶段边界：TDD 属于 Coding 内部纪律，Test 负责完整验证，Review 是硬 gate，Docs Reconciler 才能进入 knowledge base。
2. 需要保持严格五节点 DAG 的只读 MVP 语义，避免 UI 给出“可以自由改线”的错误暗示。
3. 需要在现有 Vue 3 + Vite + TypeScript 项目结构中最小接入，不重写仓库既有 workflow automation。

## Assumptions

1. 这次 spike 主要验证可视化表达和交互路径，底层执行仍由现有脚本、skill 和 reviewer agent 约束承担。
2. 用户当前优先级是尽快得到一版可试用的前端流程，而不是先做完整 runtime。
3. 逻辑测试和单条 UI 测试足以覆盖这次 spike 的核心合同。

## Open Questions

1. 无阻塞问题；本次已有足够信息进入实现。

## Task Breakdown

1. T1: 定义五节点 DAG 的纯 TypeScript 图模型，包含节点顺序、状态、输出和连接关系。
2. T2: 接入 Vue Flow，渲染固定五节点画布、节点卡片、详情面板和运行摘要。
3. T3: 补充 Vitest 逻辑测试，覆盖 DAG 顺序、摘要计算、lookup、防御性拷贝和状态标签合同。
4. T4: 修正画布选中态与详情面板的同步逻辑，并移除只读 DAG 不应暴露的 handles。
5. T5: 补充 Playwright UI 测试并修复 webServer 启动配置，确保 5 节点渲染与主交互路径可验证。
6. T6: 补充 workflow validate 的回归保护，覆盖 test-review approved gate、canonical sourceNodeIds 和 malformed candidateFacts 的 issue 化处理。

## Acceptance Criteria

1. 首页能够显示一个固定的五节点 DAG 画布，并清晰表达节点状态、阶段顺序和 handoff。
2. 详情面板与画布选中态保持同步，默认聚焦当前运行节点，侧栏点击和画布点击都能切换选中节点。
3. 画布不显示可编辑连线 handles，符合 strict DAG read-only MVP 语义。
4. Vitest 逻辑测试和 Playwright UI 测试均通过，且 production build 成功。

## Test Strategy

1. 运行 pnpm test:logic tests/logic/workflow-graph.test.ts 验证图模型合同。
2. 运行 pnpm test:ui tests/ui/workflow-spike.spec.ts 验证 5 节点渲染、默认选中和交互同步。
3. 运行 pnpm build 验证 Vue Flow 集成和生产构建通过。
4. 运行 pnpm test:logic tests/logic/workflow-validation.test.ts 与 pnpm loom:workflow:validate -- 20260425-095256-vue-flow-mvp-five-node-dag-spike，验证新的 artifact 门禁逻辑。

## Docs Impact

1. 这次主要是前端 spike 和 workflow artifact 补齐，不直接改 canonical docs。
2. 如后续确认 Vue Flow 成为正式画布层，再考虑把稳定事实写入 ARCHITECTURE 或 CONVENTIONS。

## Relevant Knowledge Base Slices

- [x] ARCHITECTURE.md
- [x] docs/CONVENTIONS.md
- [x] docs/DOMAIN.md
- [x] TSUMUGI_LOOM_DISCUSSION_SUMMARY.zh-CN.md
- [x] TSUMUGI_LOOM_KNOWLEDGE_BASE_PROPOSAL.zh-CN.md

## Handoff Notes for Coding

优先锁定五节点 DAG 的数据模型和主交互路径，再把 Vue Flow 作为只读画布层接入。Coding 阶段必须把选中态同步、strict DAG 无 handles、Vitest 覆盖图模型合同、Playwright 覆盖默认选中和点击切换作为硬交付项。若遇到 UI 测试环境问题，优先修正 Playwright 启动配置和浏览器依赖，而不是弱化测试范围。若 review 过程中发现前端 DAG 与 workflow artifacts 的合同漂移，应在同一回合内把 scripts/loom 的 validate 规则一并补齐。