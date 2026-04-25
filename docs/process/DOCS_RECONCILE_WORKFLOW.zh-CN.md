# Docs Reconcile Workflow

这份文档定义 Docs Reconciler 阶段如何把单次 workflow 的结果，增量沉淀进项目 knowledge base。

## 1. 目标

Docs Reconciler 的职责不是自由写文档，而是：

1. 读取最新 workflow 的显式 artifacts。
2. 从中抽取稳定事实。
3. 把事实路由到正确的 canonical docs 目标。
4. 生成 run knowledge 和 reconciliation 报告。

## 2. Knowledge Base Model

当前仓库的 knowledge base 采用分层模型：

1. ARCHITECTURE 是顶层地图，记录系统边界、目录职责和主要结构。
2. docs/CONVENTIONS.md 记录跨切面的规则和实现约束。
3. docs/DOMAIN.md 记录产品或业务语义。
4. docs/decisions/ 记录稳定设计决策。
5. docs/generated/run-knowledge/ 保留每次 workflow 的完整运行摘要。

默认情况下，Docs Reconciler 应优先更新已有分支，而不是自动发明新的知识库分支。

## 3. 执行顺序

对一个已完成的 workflow 执行以下步骤：

1. 读取 manifest.json、plan.md、plan.json、code-change.md、test-report.md、review.md、final-summary.md 和 knowledge-delta.json。
2. 检查 knowledge-delta.json 中 candidate facts 是否与本轮实际实现、测试和 review 结论一致。
3. 为每条 candidate fact 选择目标：ARCHITECTURE、CONVENTIONS、DOMAIN、decisions/ 或仅保留在 generated run knowledge。
4. 先运行 pnpm loom:workflow:validate -- <workflow-id>。
5. validate 通过后运行 pnpm loom:workflow:reconcile -- <workflow-id>。
6. 输出本轮新增 canonical facts、跳过项和仍需人工确认的候选项。

## 4. Target Routing Rules

1. 涉及系统地图、目录结构、模块边界的事实进入 ARCHITECTURE。
2. 涉及 review 规则、测试纪律、编码约束、流程门禁的事实进入 CONVENTIONS。
3. 涉及产品语义、业务概念、用户可见能力的事实进入 DOMAIN。
4. 涉及长期 tradeoff 或明确架构取舍的事实进入 decisions/。
5. 只对本次 workflow 有意义的总结继续留在 generated run knowledge。

## 5. 写回原则

1. canonical docs 只吸收稳定事实，不吸收一次性调试痕迹。
2. 写回必须是 target-scoped update，不是整篇重写。
3. 已存在的事实应跳过重复写入。
4. 如果目标不明确，宁可保留在 candidate facts 或 generated run knowledge，也不要写错地方。

## 6. Completion Contract

一个 workflow 的 Docs Reconciler 阶段完成后，应满足：

1. workflow validate 已通过。
2. docs/generated/run-knowledge/<workflow-id>.md 已生成。
3. artifacts/workflows/<workflow-id>/reconciliation.md 已生成。
4. manifest.json 已推进到 knowledge_base_updated。
5. 本轮新增的 canonical updates 可以被用户清楚追踪。
