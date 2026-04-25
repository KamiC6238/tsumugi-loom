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
3. 如果任务涉及新增 UI、表单、弹窗、按钮、输入框、列表、导航或其他组件组合，先判断当前仓库是否已有可复用组件体系；本仓库默认优先检查 `shadcn-vue` 及 `src/components/ui/` 下已存在的组件，而不是直接计划自定义组件实现。
4. 在 plan 中明确记录组件复用策略：哪些部分应直接复用 `shadcn-vue`、哪些部分需要基于现有组件组合、哪些部分在确认无可复用组件后才允许自定义实现，以及对应理由。
5. 按 [plan markdown template](./assets/plan-artifact-template.md) 生成 `plan.md`。
6. 检查 `Task Breakdown`、`Acceptance Criteria` 和 `Test Strategy` 是否足够支撑后续 Coding、Testing 和 Review。
7. 必要时参考 [example user request](./assets/example-user-request.md) 和 [example plan](./assets/example-plan.md)。

## Writing Rules

1. 用精炼语言重述用户意图，并保留实现所需背景。
2. 显式写出关键假设和未决问题。
3. 在 `Open Questions` 中记录尚未解决的问题。
4. 涉及 UI 的任务拆分必须先写清组件来源与复用策略，优先复用仓库现有 `shadcn-vue` 组件，再考虑新增自定义组件。
5. 让 Acceptance Criteria 保持可验证。
6. 让 `plan.md` 可以直接作为后续阶段的交接输入。

## Planning Contract

本轮 Plan 阶段遵守以下约定：

1. 交付物是 `plan.md`。
2. 未决问题记录在 `plan.md` 的 `Open Questions` 段落中。
3. 如果任务涉及 UI 组件，`plan.md` 必须写明是否复用 `shadcn-vue` 或现有 `src/components/ui/` 组件；只有在确认不可复用时，才可把自定义组件实现写入 plan。
4. 完成后的 `plan.md` 直接交给 Coding 阶段使用。

## Handoff Contract

当 `plan.md` 交给 Coding 时，应满足：

1. Coding 不需要回看原始聊天记录才能理解任务。
2. Coding 知道当前范围、约束和执行边界。
3. Test 和 Review 可以直接基于 `plan.md` 理解预期结果。
4. `plan.md` 是 Plan 阶段唯一必需的交接物。
5. Task Breakdown 中的每个 step 都应能被后续 Coding 阶段单独消费，并判断是否需要 TDD。
6. 涉及 UI 的 step 必须已经在 plan 中明确组件复用决策，尤其要说明是否使用 `shadcn-vue`，避免 Coding 阶段临时造轮子。