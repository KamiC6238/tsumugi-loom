# Plan Structure

状态：当前 Plan 阶段结构说明

## 1. 目的

Plan 阶段把用户的自然语言需求转换成 Coding、Testing 和 Review 可直接消费的结构化 `plan.md`。

`plan.md` 用来完成以下工作：

1. 提炼目标。
2. 划定范围。
3. 记录约束与假设。
4. 记录 Open Questions。
5. 生成任务拆分、验收标准和测试策略。

## 2. 标准结构

`plan.md` 使用以下结构：

1. Workflow ID
2. Goal
3. Source User Request
4. Problem
5. Scope
6. Out of Scope
7. Constraints
8. Assumptions
9. Open Questions
10. Task Breakdown
11. Acceptance Criteria
12. Test Strategy
13. Docs Impact
14. Relevant Knowledge Base Slices
15. Handoff Notes for Coding

## 3. 写作要点

### 3.1 Source User Request

用简洁语言概括用户原始需求、背景和预期结果。

### 3.2 Problem

说明当前回合要解决的核心问题和原因。

### 3.3 Scope 与 Out of Scope

1. Scope 记录当前回合覆盖的内容。
2. Out of Scope 记录留给后续回合的内容。

### 3.4 Constraints 与 Assumptions

1. Constraints 记录当前回合必须遵守的边界。
2. Assumptions 记录当前 plan 成立所依赖的前提。

### 3.5 Open Questions

Open Questions 集中记录未决问题、当前采用的假设和下一步确认方向。

### 3.6 Task Breakdown

Task Breakdown 使用动作导向描述，让 Coding 可以逐 step 接手。

### 3.7 Acceptance Criteria 与 Test Strategy

1. Acceptance Criteria 定义完成条件。
2. Test Strategy 定义验证路径。

### 3.8 Docs Impact 与 Relevant Knowledge Base Slices

1. Docs Impact 记录本轮回合可能影响的文档层。
2. Relevant Knowledge Base Slices 记录计划编写时应读取的知识切片。

### 3.9 Handoff Notes for Coding

Handoff Notes 给 Coding 阶段明确优先级、执行边界和接手方式。

## 4. 完成条件

Plan 阶段完成时，`plan.md` 应满足：

1. 结构完整。
2. 范围、约束、任务拆分和验收标准清晰。
3. Open Questions 已集中记录。
4. Coding、Testing 和 Review 可以直接基于它理解当前回合目标。

## 5. 推荐生成方式

当前仓库推荐通过 workspace skill `.github/skills/plan-writer/SKILL.md` 生成 `plan.md`，并在开发过程中持续维护它。