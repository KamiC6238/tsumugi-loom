# Plan Artifact Schema Reference

这个 reference 是给 planning skill 使用的快速检查表。

## Required Fields

1. `plan.md` 中的 Plan Status
2. `plan.json` 中的 workflowId
3. `plan.json` 中的 planStatus
4. `plan.json` 中的 goal
5. `plan.json` 中的 sourceUserRequest
6. `plan.json` 中的 problem
7. `plan.json` 中的 scope
8. `plan.json` 中的 outOfScope
9. `plan.json` 中的 constraints
10. `plan.json` 中的 assumptions
11. `plan.json` 中的 openQuestions
12. `plan.json` 中的 taskBreakdown
13. `plan.json` 中的 acceptanceCriteria
14. `plan.json` 中的 testStrategy
15. `plan.json` 中的 docsImpact
16. `plan.json` 中的 relevantKnowledgeBaseSlices
17. `plan.json` 中的 handoffNotesForCoding
18. `clarification.md` 中的 Clarification Status

## Decision Rules

使用 `ready`：

1. 可以定义明确范围。
2. 可以给出任务拆分。
3. 可以给出验收标准和验证方式。

使用 `needs_clarification`：

1. 缺少会影响实现方向的关键事实。
2. 范围和约束仍然模糊。
3. 无法稳定定义完成条件。

Clarification 规则：

1. 如果 `planStatus = needs_clarification`，clarification.md 必须是 `open`。
2. 如果 `planStatus = ready`，clarification.md 只能是 `not_needed` 或 `resolved`。

## Quality Checks

1. 不把原始聊天记录原样交给 Coding。
2. 不隐藏关键假设。
3. Scope 和 Out of Scope 不混淆。
4. Task Breakdown 是动作导向而不是泛泛描述。
5. Acceptance Criteria 可观察、可验证。
6. Handoff Notes 能让 Coding 不必重新解释需求。
7. plan.md 和 plan.json 的状态一致。