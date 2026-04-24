---
name: plan-writer
description: 'Convert freeform user requirements, ambiguous feature requests, or rough product ideas into structured planning artifacts before coding. Use for planning, scope definition, constraints extraction, clarification, task breakdown, acceptance criteria, plan.json schema output, and coding handoff.'
argument-hint: '用户需求、功能想法或当前需要结构化的任务描述'
user-invocable: true
---

# Plan Writer

## When to Use

在以下场景使用这个 skill：

1. 用户给出的需求是自然语言、口语化或不完整的。
2. 还没有结构化的 plan.md，但已经准备进入实现阶段。
3. 需要把原始需求转换成 Coding 可直接消费的 PlanArtifact。
4. 需要判断当前任务是 `ready` 还是 `needs_clarification`。

## What This Skill Produces

这个 skill 的产出不是代码，而是一组结构化 planning artifacts。

它应当：

1. 保留用户真实意图。
2. 去掉聊天噪音和非结构化描述。
3. 显式写出范围、约束、假设和待澄清问题。
4. 产出可以交给 Coding 的任务拆分和验收标准。
5. 同时产出：
   1. `plan.md`
   2. `plan.json`
   3. `clarification.md`

## Procedure

1. 读取用户需求和相关 knowledge base 切片。
2. 识别目标、问题、范围、约束和明显缺口。
3. 决定 `Plan Status`：
   1. 如果存在阻塞性信息缺口，使用 `needs_clarification`。
   2. 如果信息已足够进入实现，使用 `ready`。
4. 按 [plan markdown template](./assets/plan-artifact-template.md) 生成 `plan.md`。
5. 按 [plan json template](./assets/plan-artifact-template.json) 生成 `plan.json`。
6. 按 [clarification template](./assets/clarification-artifact-template.md) 生成 `clarification.md`。
7. 用 [schema reference](./references/plan-artifact-schema.md) 检查字段是否完整。
6. 必要时参考 [example user request](./assets/example-user-request.md) 和 [example plan](./assets/example-plan.md)。

## Output Rules

1. 不把原始聊天记录原样传给 Coding。
2. 不隐藏关键假设。
3. 不把待澄清问题写成既定事实。
4. `plan.md` 和 `plan.json` 的状态必须一致。
5. 如果状态是 `needs_clarification`，clarification.md 必须是 `open`。
6. 任务拆分必须是动作导向，便于 Coding 接手。
7. Acceptance Criteria 必须可验证。

## Ready vs Needs Clarification

使用 `ready` 的条件：

1. 目标清楚。
2. 作用范围清楚。
3. 主要约束已知。
4. 可以给出可执行任务拆分。

使用 `needs_clarification` 的条件：

1. 缺少会改变实现方向的关键信息。
2. 作用范围无法判断。
3. 验收标准无法定义。

对应输出要求：

1. `plan.json.planStatus = needs_clarification`
2. `plan.md` 写同样状态
3. `clarification.md` 使用 `Clarification Status: open`

## Handoff Contract

当 PlanArtifact 交给 Coding 时，应满足：

1. Coding 不需要回看原始聊天记录才能理解任务。
2. Coding 知道什么能做、什么不能做。
3. Test 和 Review 可以直接基于 plan 理解预期结果。
4. `plan.json.planStatus = ready`
5. clarification.md 不是 `open`
6. Task Breakdown 中的每个 step 都应能被 `.github/skills/tdd-coding-writer/SKILL.md` 单独消费并进入 TDD 循环。