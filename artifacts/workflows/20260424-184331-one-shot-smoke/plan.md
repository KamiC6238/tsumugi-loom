# Plan Artifact

Workflow ID: 20260424-184331-one-shot-smoke
Plan Status: needs_clarification
Goal: 验证 plan json 与 clarification scaffold

## Source User Request

本轮只用于验证 workflow scaffold 是否已经能够同时输出 plan.md、plan.json 和 clarification.md，并确认在仍需澄清时 validate 会阻止进入 Coding。

## Problem

需要确认新的 planning artifacts 不只是被创建出来，而且当计划仍处于待澄清状态时，workflow 会被明确 gate 住。

## Scope

1. 使用新 scaffold 创建一个 smoke workflow。
2. 将其填成结构完整但仍需澄清的 plan 样例。

## Out of Scope

1. 不进入实际 Coding。
2. 不生成 reconciliation 产物。

## Constraints

1. 需要使用新的 plan.json 和 clarification.md 结构。
2. 需要让失败原因来自 clarification gate，而不是 TODO 或 schema 结构错误。

## Assumptions

1. 当前 smoke workflow 允许只作为门禁验证样例存在。
2. validate 应把 needs_clarification 视为不能进入 Coding 的阻塞状态。

## Open Questions

1. 当前是否需要同时实现新的 workflow 子命令来处理 clarification loop。

## Task Breakdown

1. 创建新的 smoke workflow。
2. 用完整内容填充 plan.md、plan.json 和 clarification.md。
3. 运行 validate，确认 gate 生效。

## Acceptance Criteria

1. plan.md 和 plan.json 结构完整且状态一致。
2. clarification.md 为 open。
3. validate 失败原因明确指向 needs_clarification gate。

## Test Strategy

1. 运行 `pnpm loom:workflow:validate -- 20260424-184331-one-shot-smoke`。
2. 检查输出中是否明确说明 workflow 不能进入 Coding。

## Docs Impact

1. 本次主要验证 workflow 机制，不修改 canonical docs。
2. 如有需要，只把结果保留为 smoke-test 参考。

## Relevant Knowledge Base Slices

- [ ] ARCHITECTURE.md
- [ ] docs/CONVENTIONS.md
- [ ] docs/DOMAIN.md
- [ ] TSUMUGI_LOOM_DISCUSSION_SUMMARY.zh-CN.md
- [ ] TSUMUGI_LOOM_KNOWLEDGE_BASE_PROPOSAL.zh-CN.md

## Handoff Notes for Coding

当前 workflow 不应进入 Coding；需要先解决澄清问题，再把 Plan Status 调整为 ready。