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
3. 调用 `.github/agents/code-reviewer.agent.md` 做第 1 轮独立 code review。
4. 如果 reviewer 返回 `changes_requested` 且当前还没到第 3 轮，把问题映射回 Coding 或 Test，先修正，再做必要的窄验证。
5. 最多执行 3 轮 reviewer 调用，包含首轮 review 和后续复审。
6. 只要任一轮 reviewer 返回 `approved`，就把 `review.md` 写成 `Review Status = approved`、`Review Disposition = approved`，并结束 Review。
7. 如果第 3 轮后 reviewer 仍返回 `changes_requested`，就把 `review.md` 写成 `Review Status = changes_requested`、`Review Round = 3`、`Review Disposition = proceed_with_known_issues`，明确记录 Findings 和 Required Rework。
8. 第 3 轮后不要继续自动 review loop；workflow 直接进入 docs reconcile，并把 unresolved review issues 暴露给用户做人工介入。

## Review Rules

必须把 code reviewer subagent 当成 gate，而不是附加建议。

规则如下：

1. reviewer 只要指出 correctness bug、回归风险或明显测试缺口，就不能跳过。
2. 前 2 轮如果是 `changes_requested`，必须先修正实现或测试，再重新送 reviewer。
3. review loop 最多 3 轮；第 3 轮后仍未 `approved` 时，直接结束自动 review 并进入下一步。
4. `review.md` 必须显式记录 `Review Round` 和 `Review Disposition`，让后续流程知道是已放行还是带着已知问题继续。
5. reconcile 之前，`review.md` 必须是最终结论，而不是待处理草稿。

## Output Rules

1. 不要因为 build 通过或测试为绿就默认代码可放行。
2. 不要忽略 contract drift、边界条件和失败路径。
3. 不要把 reviewer 的 `changes_requested` 当成可忽略建议。
4. 不要在 `review.md` 里只写摘要而不写具体结论。
5. 不要在第 3 轮仍未通过后继续无限追加 review 回合。
6. 不要在第 3 轮继续往下走时丢掉 reviewer 提出的未解决问题；这些问题必须能在界面中被用户看到。

## References

1. [review template](./assets/review-template.md)
2. [example review](./assets/example-review.md)
3. [code review checklist](./references/code-review-checklist.md)