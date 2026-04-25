---
name: plan-writer
description: 'Convert freeform user requirements, ambiguous feature requests, or rough product ideas into a single structured plan before coding. Use for planning, scope definition, constraints extraction, task breakdown, acceptance criteria, and coding handoff.'
argument-hint: '用户需求、功能想法或当前需要结构化的任务描述'
user-invocable: true
---

# Plan Writer

## When to Use

在以下场景使用这个 skill：

1. 用户给出的需求是自然语言、口语化或不完整的。
2. 还没有结构化的 plan.md，但已经准备进入实现阶段。
3. 需要把原始需求转换成 Coding 可直接消费的 plan.md。
4. 需要在 Coding 前显式写清范围、约束、任务拆分和验收标准。

## What This Skill Produces

这个 skill 产出一个结构化的 `plan.md`，供 Coding、Testing 和 Review 直接消费。

它应当：

1. 保留用户真实意图。
2. 去掉聊天噪音和非结构化描述。
3. 显式写出范围、约束、假设和待澄清问题。
4. 产出可以交给 Coding 的任务拆分和验收标准。
5. 把 `plan.md` 作为 Plan 阶段的交接物。

## Procedure

1. 读取用户需求和相关 knowledge base 切片。
2. 识别目标、问题、范围、约束、假设和未决问题。
3. 按 [plan markdown template](./assets/plan-artifact-template.md) 生成 `plan.md`。
4. 检查 `Task Breakdown`、`Acceptance Criteria` 和 `Test Strategy` 是否足够支撑后续 Coding、Testing 和 Review。
5. 必要时参考 [example user request](./assets/example-user-request.md) 和 [example plan](./assets/example-plan.md)。

## Writing Rules

1. 用精炼语言重述用户意图，并保留实现所需背景。
2. 显式写出关键假设和未决问题。
3. 在 `Open Questions` 中记录尚未解决的问题。
4. 让任务拆分保持动作导向，便于 Coding 接手。
5. 让 Acceptance Criteria 保持可验证。
6. 让 `plan.md` 可以直接作为后续阶段的交接输入。

## Planning Contract

本轮 Plan 阶段遵守以下约定：

1. 交付物是 `plan.md`。
2. 未决问题记录在 `plan.md` 的 `Open Questions` 段落中。
3. 范围、约束、任务拆分和验收标准写清后，即可完成 Plan 阶段。
4. 完成后的 `plan.md` 直接交给 Coding 阶段使用。

## Handoff Contract

当 `plan.md` 交给 Coding 时，应满足：

1. Coding 不需要回看原始聊天记录才能理解任务。
2. Coding 知道当前范围、约束和执行边界。
3. Test 和 Review 可以直接基于 `plan.md` 理解预期结果。
4. `plan.md` 是 Plan 阶段唯一必需的交接物。
5. Task Breakdown 中的每个 step 都应能被后续 Coding 阶段单独消费，并判断是否需要 TDD。