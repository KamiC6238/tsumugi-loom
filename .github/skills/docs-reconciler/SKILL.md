---
name: docs-reconciler
description: 'Incrementally update the project knowledge base from a completed workflow. Use for docs reconciler, reconcile, knowledge base update, update knowledge base, knowledge-delta, run knowledge, canonical docs update, architecture update, conventions update, domain update, and workflow summary ingestion.'
argument-hint: '已完成的 workflow-id，或当前需要把最新 workflow 增量写回 knowledge base 的开发回合'
user-invocable: true
---

# Docs Reconciler

## When to Use

在以下场景使用这个 skill：

1. 一个 workflow 已完成 Coding、Test 和 Review，准备把结果沉淀进 knowledge base。
2. 需要根据最新 workflow 的 artifacts 增量更新 ARCHITECTURE、CONVENTIONS、DOMAIN、ADR 或 generated run knowledge。
3. 需要补齐或修正 knowledge-delta.json，而不是手写整篇文档总结。
4. 需要让用户在每个 workflow 结束后执行一次稳定的 knowledge ingestion 流程。

## What This Skill Produces

这个 skill 的目标不是自由改写文档，而是驱动一次受控的 knowledge reconciliation。

它应当：

1. 明确本轮 workflow 要写回哪些稳定事实。
2. 更新或补齐 knowledge-delta.json。
3. 生成 docs/generated/run-knowledge/<workflow-id>.md。
4. 生成 artifacts/workflows/<workflow-id>/reconciliation.md。
5. 只把稳定、可归档的事实写回对应 canonical docs。

## Knowledge Base Model

这个仓库的 knowledge base 采用“地图 + 分支”模型：

1. ARCHITECTURE 是顶层地图，记录系统边界、主要目录职责、稳定结构和跨模块关系。
2. CONVENTIONS 记录跨切面的工程规则、工作流约束和实现约定。
3. DOMAIN 记录产品语义、业务概念和用户可见能力。
4. decisions/ 记录需要长期保留的明确取舍。
5. generated run knowledge 保留每次 workflow 的完整运行摘要，不直接当作 canonical facts。

如果后续出现新的稳定知识分支，例如组件目录、测试目录、工具目录的专门文档，应先把它当作显式目标设计出来，再由 Docs Reconciler 对该目标做 target-scoped 更新；不要在一次 workflow 中随意扩张 knowledge tree。

## Preconditions

开始前必须确认：

1. 目标 workflow 已有完整的 manifest.json、plan.md、plan.json、code-change.md、test-report.md、review.md、final-summary.md 和 knowledge-delta.json。
2. review.md 已经给出最终结论：要么 approved，要么第 3 轮后以 proceed_with_known_issues 继续。
3. workflow validate 可以通过，或当前任务就是修正 knowledge-delta 直到 validate 通过。
4. 只写入已验证的稳定事实，不把一次性调试信息当作长期知识。

## Procedure

1. 确定目标 workflow：优先使用用户给出的 workflow-id；如果没有，读取 artifacts/workflows 下最新的已完成 workflow。
2. 读取 manifest.json、plan.md、plan.json、code-change.md、test-report.md、review.md、final-summary.md、knowledge-delta.json，以及相关 canonical docs。
3. 从本轮 workflow 中提取稳定事实，而不是摘要聊天过程。
4. 按 [Docs Reconcile Workflow](../../../docs/process/DOCS_RECONCILE_WORKFLOW.zh-CN.md) 判断每条事实应进入 ARCHITECTURE、CONVENTIONS、DOMAIN、ADR，还是只保留在 generated run knowledge。
5. 更新 knowledge-delta.json，确保 candidateFacts、affectedAreas、evidence 和 recommendedTargets 与本轮实现一致。
6. 先运行 pnpm loom:workflow:validate -- <workflow-id>；如果失败，先修正 artifacts，不直接 reconcile。
7. validate 通过后运行 pnpm loom:workflow:reconcile -- <workflow-id>。
8. 向用户汇报本轮新增了哪些 canonical facts、跳过了哪些候选项，以及哪些问题仍需要人工决定。

## Routing Rules

1. 结构边界、目录职责、系统地图进入 ARCHITECTURE。
2. 跨目录规则、流程约束、测试或 review 纪律进入 CONVENTIONS。
3. 产品能力、业务术语、用户价值进入 DOMAIN。
4. 明确 tradeoff、长期架构决策进入 decisions/。
5. 只对单次 workflow 有意义的上下文进入 generated run knowledge，不写进 canonical docs。

## Output Rules

1. 不整篇重写 ARCHITECTURE、CONVENTIONS 或 DOMAIN。
2. 不把未验证的推测写成 canonical fact。
3. 不把 code diff 逐行转写成知识库。
4. 不把 generated run knowledge 当成 canonical docs 的替代物。
5. 如果 candidate fact 的目标不清楚，先在 reconciliation 结果里标记出来，而不是硬写进错误文档。

## References

1. [Docs Reconcile Workflow](../../../docs/process/DOCS_RECONCILE_WORKFLOW.zh-CN.md)
2. [Workflow Automation](../../../docs/process/WORKFLOW_AUTOMATION.zh-CN.md)
3. [ARCHITECTURE](../../../ARCHITECTURE.md)
