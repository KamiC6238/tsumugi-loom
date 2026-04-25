# Reconciliation Report

Workflow ID: 20260425-095256-vue-flow-mvp-five-node-dag-spike

## Goal

Spike a Vue Flow MVP for a five-node DAG workflow.

## Generated Run Knowledge

- docs/generated/run-knowledge/20260425-095256-vue-flow-mvp-five-node-dag-spike.md

## Candidate Canonical Updates

- ARCHITECTURE.md
  - 当前前端实现以固定五节点 DAG 模型驱动 Vue Flow 画布，并把 review artifact 解析结果接入阶段详情。
- docs/CONVENTIONS.md
  - ready workflow 的 validate 门禁现在要求 test-review 为 approved，并校验 review 第三轮放行规则、knowledge-delta 最小结构与 canonical sourceNodeIds。
- docs/DOMAIN.md
  - 当前 MVP 首页以只读五阶段 workflow 画布展示 Plan、Coding、Test、Review 和 Docs Reconciler，并支持节点或侧栏点击查看阶段目标、输出与 review handoff。

## Applied Canonical Updates

- ARCHITECTURE.md
  - already_present: 当前前端实现以固定五节点 DAG 模型驱动 Vue Flow 画布，并把 review artifact 解析结果接入阶段详情。
- docs/CONVENTIONS.md
  - already_present: ready workflow 的 validate 门禁现在要求 test-review 为 approved，并校验 review 第三轮放行规则、knowledge-delta 最小结构与 canonical sourceNodeIds。
- docs/DOMAIN.md
  - already_present: 当前 MVP 首页以只读五阶段 workflow 画布展示 Plan、Coding、Test、Review 和 Docs Reconciler，并支持节点或侧栏点击查看阶段目标、输出与 review handoff。

## Manual Review Checklist

- [ ] 是否有事实应该进入 ARCHITECTURE.md
- [ ] 是否有约定应该进入 docs/CONVENTIONS.md
- [ ] 是否有术语或产品规则应该进入 docs/DOMAIN.md
- [ ] 是否有关键取舍应该新增 ADR
- [ ] 是否有内容应继续仅保留在 generated run knowledge

## Source Design Inputs

- TSUMUGI_LOOM_DISCUSSION_SUMMARY.zh-CN.md
- TSUMUGI_LOOM_KNOWLEDGE_BASE_PROPOSAL.zh-CN.md
