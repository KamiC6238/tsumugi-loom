---
name: code-review-writer
description: 'Review completed implementation changes with an independent code review gate. Use for review, code review, review-writer, code-review-writer, final review, and workflow review stages after Coding and Test are complete.'
argument-hint: '已完成 Coding/Test 的 workflow，或当前需要做 code review 的任务'
user-invocable: true
---

# Code Review Writer

## When to Use

在以下场景使用这个 skill：

1. Plan 已完成且 `plan.json.planStatus = ready`。
2. Coding 和 Test 已经产出实现、测试和验证结果。
3. 需要在进入 docs reconcile 前做独立 code review。
4. 需要把 Review 阶段做成正式 gate，而不是手写总结。

## What This Skill Produces

这个 skill 的核心产物是 Review 阶段的结构化输出：

1. 更新后的 `review.md`。
2. 一次来自 `.github/agents/code-reviewer.agent.md` 的独立 code review verdict。
3. 明确的返工项或放行结论。

## Preconditions

开始前必须确认：

1. `plan.md`、`plan.json` 和 `clarification.md` 已存在。
2. `plan.json.planStatus = ready`。
3. `tdd-cycle.md`、`test-review.md`、`code-change.md` 和 `test-report.md` 已补齐。
4. 相关代码和测试已经处于可验证状态。

如果这些条件不满足，不要进入 Review。

## Procedure

1. 读取 `plan.md`、`plan.json`、`clarification.md`、`tdd-cycle.md`、`test-review.md`、`code-change.md`、`test-report.md` 和当前 `review.md`。
2. 识别本轮真正需要审查的代码、测试和文档范围。
3. 调用 `.github/agents/code-reviewer.agent.md` 做独立 code review。
4. 如果 reviewer 返回 `changes_requested`，把问题映射回 Coding 或 Test，先修正，再做必要的窄验证。
5. 修正后再次调用 code reviewer，直到 verdict 为 `approved`。
6. 只有在 reviewer 返回 `approved` 后，才更新 [review template](./assets/review-template.md) 对应的 `review.md`。
7. 结束 Review 后，再进入 docs reconcile。

## Review Rules

必须把 code reviewer subagent 当成 gate，而不是附加建议。

规则如下：

1. reviewer 只要指出 correctness bug、回归风险或明显测试缺口，就不能跳过。
2. 必须先修正实现或测试，再重新送 reviewer。
3. `review.md` 的 `Review Status` 只有在 verdict 为 `approved` 时才能写成 `approved`。
4. reconcile 之前，`review.md` 必须是最终结论，而不是待处理草稿。

## Output Rules

1. 不要因为 build 通过或测试为绿就默认代码可放行。
2. 不要忽略 contract drift、边界条件和失败路径。
3. 不要把 reviewer 的 `changes_requested` 当成可忽略建议。
4. 不要在 `review.md` 里只写摘要而不写具体结论。

## References

1. [review template](./assets/review-template.md)
2. [example review](./assets/example-review.md)
3. [code review checklist](./references/code-review-checklist.md)