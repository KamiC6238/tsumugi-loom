---
name: code-review-writer
description: 'Review completed implementation changes with an independent code review gate. Use for review, code review, review-writer, code-review-writer, final review, and workflow review stages after Coding and Test are complete.'
argument-hint: '已完成 Coding/Test 的 workflow，或当前需要做 code review 的任务'
user-invocable: true
---

# Code Review Writer

## When to Use

在以下场景使用这个 skill：

1. Plan 已完成，并已有结构化 `plan.md`。
2. Coding 和 Test 已经产出实现、测试和验证结果。
3. 需要给当前实现做独立 code review。
4. 需要把 Review 阶段产出结构化结论。

## What This Skill Produces

这个 skill 产出 Review 阶段的结构化输出：

1. 更新后的 `review.md`。
2. 一次来自 `.github/agents/code-reviewer.agent.md` 的独立 code review verdict。
3. 明确的返工项、通过结论或已知后续项。

## Entry Contract

开始前确认：

1. 当前 workflow 已有 `plan.md`。
2. 当前回合的实现与验证结果已经记录在 `code-change.md`、`test-report.md` 和相关代码中。
3. 如有 TDD 过程记录，可一并提供 `tdd-cycle.md` 和 `test-review.md`。
4. 当前改动已经具备可执行的窄验证结果。

## Procedure

1. 读取 `plan.md`、`code-change.md`、`test-report.md`、相关代码、相关测试，以及当前 `review.md`。
2. 如存在 `tdd-cycle.md` 和 `test-review.md`，一并纳入 review 上下文。
3. 如果本轮包含 UI 组件变更，核对实现是否遵守 `plan.md` 中的组件复用策略，尤其是否优先复用了 `shadcn-vue` 或 `src/components/ui/` 下已有组件。
4. 识别本轮真正需要审查的代码、测试和文档范围。
5. 调用 `.github/agents/code-reviewer.agent.md` 做第 1 轮独立 code review。
6. reviewer 返回 `changes_requested` 时，把问题映射回 Coding 或 Testing，完成修正并补做必要的窄验证。
7. 最多执行 3 轮 reviewer 调用，包含首轮 review 和后续复审。
8. 任一轮 reviewer 返回 `approved` 时，将 `review.md` 记录为通过结论并结束 Review。
9. 第 3 轮后若仍有 `changes_requested`，将 `review.md` 记录为带已知后续项的最终结论，保留 Findings 和 Required Rework 供人继续处理。

## Review Gate

code reviewer subagent 作为 Review 阶段的 gate。

规则如下：

1. reviewer 指出 correctness bug、回归风险或明显测试缺口时，先修正实现或测试，再重新送 reviewer。
2. 前 2 轮的 `changes_requested` 对应新的修正和新的窄验证。
3. 第 3 轮形成最终 review 结论，并在 `review.md` 中保留需要人工继续处理的事项。
4. `review.md` 记录 `Review Round`、`Review Status` 和 `Review Disposition`，供后续阶段直接消费。

## Delivery Contract

1. 让 review 结论聚焦 correctness、回归风险、contract drift、失败路径和可维护性。
2. 让 reviewer 的 `changes_requested` 直接驱动修正动作和新的窄验证。
3. 让 `review.md` 给出可执行的结论、Findings 和 Required Rework。
4. 让第 3 轮后的未解决问题保留为清晰的人类后续项。
5. 让 Review 阶段在 `approved` 或最终结论写入 `review.md` 后完成。
6. 对 UI 变更，若实现绕过 `shadcn-vue`/现有组件且没有充分理由，应视为可维护性与流程偏差问题。

## References

1. [review template](./assets/review-template.md)
2. [example review](./assets/example-review.md)
3. [code review checklist](./references/code-review-checklist.md)