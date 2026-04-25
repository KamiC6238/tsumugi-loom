---
name: docs-reconciler
description: 'Incrementally update the project knowledge base from a completed workflow. Use for docs reconciler, reconcile, knowledge base update, update knowledge base, knowledge-delta, run knowledge, canonical docs update, architecture update, conventions update, domain update, and workflow summary ingestion.'
argument-hint: '已完成的 workflow-id，或当前需要把最新 workflow 增量写回 knowledge base 的开发回合'
user-invocable: true
---

# Docs Reconciler

## When to Use

在以下场景使用这个 skill：

1. 一个 workflow 已完成 Plan、Coding、Testing 和 Review，准备把结果沉淀进 knowledge base。
2. 需要根据当前 workflow 的显式产物增量更新 ARCHITECTURE、CONVENTIONS、DOMAIN、ADR 或 generated run knowledge。
3. 需要准备或补齐 `knowledge-delta.json`。
4. 需要执行一次稳定的知识写回流程。

## What This Skill Produces

这个 skill 驱动一次受控的 knowledge reconciliation。

它应当：

1. 明确本轮 workflow 要写回哪些稳定事实。
2. 准备或更新 `knowledge-delta.json`。
3. 生成 `docs/generated/run-knowledge/<workflow-id>.md`。
4. 生成 `artifacts/workflows/<workflow-id>/reconciliation.md`。
5. 将稳定、可归档的事实写回对应 canonical docs。

## Knowledge Base Model

这个仓库的 knowledge base 采用“地图 + 分支”模型：

1. ARCHITECTURE 是顶层地图，记录系统边界、主要目录职责、稳定结构和跨模块关系。
2. CONVENTIONS 记录跨切面的工程规则、工作流约束和实现约定。
3. DOMAIN 记录产品语义、业务概念和用户可见能力。
4. decisions/ 记录需要长期保留的明确取舍。
5. generated run knowledge 保留每次 workflow 的完整运行摘要。

如果后续出现新的稳定知识分支，例如组件目录、测试目录、工具目录的专门文档，可先把它设计成显式目标，再由 Docs Reconciler 对该目标做 target-scoped 更新。

## Entry Contract

开始前确认：

1. 目标 workflow 已有 `manifest.json`、`plan.md` 和 `review.md`。
2. 当前 workflow 的实现和验证结果可以从 `code-change.md`、`test-report.md`、相关代码和相关测试中读取。
3. `knowledge-delta.json` 已存在，或当前回合会先创建它。
4. 本轮要写回的内容已经收敛为稳定事实。

## Procedure

1. 确定目标 workflow：优先使用用户给出的 workflow-id；如果没有，读取 artifacts/workflows 下最新的已完成 workflow。
2. 读取 `manifest.json`、`plan.md`、`code-change.md`、`test-report.md`、`review.md`、`knowledge-delta.json`，以及相关 canonical docs。
3. 如 `knowledge-delta.json` 尚未存在，先创建最小结构并补入 candidateFacts、affectedAreas、evidence 和 recommendedTargets。
4. 从本轮 workflow 中提取稳定事实。
5. 按 [Docs Reconcile Workflow](../../../docs/process/DOCS_RECONCILE_WORKFLOW.zh-CN.md) 为每条事实选择目标：ARCHITECTURE、CONVENTIONS、DOMAIN、ADR 或 generated run knowledge。
6. 运行 `pnpm loom:workflow:validate -- <workflow-id>`，确认当前产物结构可用。
7. 运行 `pnpm loom:workflow:reconcile -- <workflow-id>`，生成 run knowledge、reconciliation 报告，并写回 canonical docs。
8. 向用户汇报本轮新增的 canonical facts、保留在 generated run knowledge 的候选项，以及需要人工继续判断的路由项。

## Routing Rules

1. 结构边界、目录职责、系统地图进入 ARCHITECTURE。
2. 跨目录规则、流程约束、测试或 review 纪律进入 CONVENTIONS。
3. 产品能力、业务术语、用户价值进入 DOMAIN。
4. 明确 tradeoff、长期架构决策进入 decisions/。
5. 只对单次 workflow 有意义的上下文进入 generated run knowledge。

## Delivery Contract

1. canonical docs 吸收稳定事实。
2. generated run knowledge 保留单次 workflow 的完整上下文。
3. `knowledge-delta.json` 记录 candidateFacts、evidence 和推荐目标。
4. reconciliation 结果保留需要人工继续判断的候选项。
5. Docs Reconciler 完成后，用户可以清楚追踪本轮知识写回结果。

## References

1. [Docs Reconcile Workflow](../../../docs/process/DOCS_RECONCILE_WORKFLOW.zh-CN.md)
2. [Workflow Automation](../../../docs/process/WORKFLOW_AUTOMATION.zh-CN.md)
3. [ARCHITECTURE](../../../ARCHITECTURE.md)
