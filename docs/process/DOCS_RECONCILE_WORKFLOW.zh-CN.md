# Docs Reconcile Workflow

这份文档定义可选的 Docs Reconciler 阶段如何把单次 workflow 的结果增量沉淀进项目 knowledge base。

## 1. 目标

Docs Reconciler 执行以下工作：

1. 读取显式 workflow 产物。
2. 提取稳定事实。
3. 为事实选择 canonical docs 目标。
4. 生成 run knowledge 与 reconciliation 报告。

## 2. 输入

执行 Docs Reconciler 时准备以下输入：

1. `manifest.json`
2. `plan.md`
3. `code-change.md`
4. `test-report.md`
5. `review.md`
6. `knowledge-delta.json`

`knowledge-delta.json` 记录 candidateFacts、affectedAreas、evidence、recommendedTargets 和 reviewRequired。

## 3. 执行顺序

对一个 workflow 执行以下步骤：

1. 确定目标 workflow。
2. 读取 workflow 产物与相关 canonical docs。
3. 准备或更新 `knowledge-delta.json`。
4. 运行 `pnpm loom:workflow:validate -- <workflow-id>`。
5. 运行 `pnpm loom:workflow:reconcile -- <workflow-id>`。
6. 汇总本轮 canonical updates、generated run knowledge 与人工继续判断项。

## 4. Target Routing Rules

1. 系统地图、目录结构、模块边界进入 ARCHITECTURE。
2. 流程约束、测试纪律、review 规则进入 CONVENTIONS。
3. 产品语义、业务概念、用户可见能力进入 DOMAIN。
4. 长期 tradeoff 和明确架构取舍进入 decisions/。
5. 单次 workflow 的完整上下文进入 generated run knowledge。

## 5. 写回原则

1. canonical docs 吸收稳定事实。
2. 写回采用 target-scoped update。
3. 已存在事实保持去重。
4. 需要人工继续判断的候选项记录在 reconciliation 结果中。

## 6. Completion Contract

Docs Reconciler 完成后，应满足：

1. `docs/generated/run-knowledge/<workflow-id>.md` 已生成。
2. `artifacts/workflows/<workflow-id>/reconciliation.md` 已生成。
3. manifest 状态已推进到 `knowledge_base_updated`。
4. 用户可以清楚追踪本轮 canonical updates。
