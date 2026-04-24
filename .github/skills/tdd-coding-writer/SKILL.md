---
name: tdd-coding-writer
description: 'Write code from a structured PlanArtifact using TDD and RED-GREEN-REFACTOR. Use for coding-writer, tdd-coding-writer, or legacy test-cases-writer workflows, per-step TDD execution, Vitest logic tests, Playwright UI tests, tdd-cycle.md generation, and iterative test review with the Test Case Reviewer subagent.'
argument-hint: '已完成的 PlanArtifact，或当前要按 TDD 实现的 workflow/task'
user-invocable: true
---

# TDD Coding Writer

## When to Use

在以下场景使用这个 skill：

1. Plan 阶段已经完成，`plan.json.planStatus = ready`。
2. 需要按 TDD 实现一个或多个 plan steps。
3. 需要区分逻辑测试和 UI 测试。
4. 需要把测试生成、最小实现和重构放在同一个 Coding loop 里。
5. 需要在测试生成后交给 reviewer subagent 审查。

## What This Skill Produces

这个 skill 的核心产物不是单纯代码，而是一整套 coding-stage outputs：

1. 源码实现。
2. Vitest 或 Playwright 测试用例。
3. `tdd-cycle.md`。
4. `test-review.md`。
5. 更新后的 `code-change.md` 与 `test-report.md`。

## Preconditions

开始前必须确认：

1. `plan.md` 和 `plan.json` 已存在。
2. `plan.json.planStatus = ready`。
3. `clarification.md` 不是 `open`。

如果这些条件不满足，不要进入 Coding。

## Tool Selection

根据当前 step 的性质选择测试工具：

1. 逻辑代码
   使用 Vitest。
2. UI 交互和用户行为
   使用 Playwright。
3. 非产品代码步骤
   明确记录为什么不适用产品级 TDD，并给出等价验证策略。

## Procedure

1. 读取 `plan.md`、`plan.json`、`clarification.md`。
2. 按 `taskBreakdown` 拆分当前 Coding 范围。
3. 为每个 step 决定使用 Vitest、Playwright 或等价验证方式。
4. 先写测试，制造合理失败，进入 RED。
5. 如果测试意外通过，优先怀疑假绿或测试过弱，不要直接进入 GREEN。
6. 把当前测试交给 `.github/agents/test-case-reviewer.agent.md` 做第一次 review；如果 reviewer 判定测试无效或存在假绿风险，先修正测试，再继续。
7. 写最小实现使测试通过，进入 GREEN。
8. 在不改变外部行为的前提下清理实现，进入 REFACTOR。
9. 将每个 step 的过程记录到 [tdd cycle template](./assets/tdd-cycle-template.md) 对应的 `tdd-cycle.md`。
10. 将当前 step 的测试集合再次交给 reviewer 审查。
11. 如果 reviewer 返回 `changes_requested`，回到对应 step 修正测试或实现，再次送审。
12. 只有 reviewer 返回 `approved`，才更新 [test review template](./assets/test-review-template.md) 对应的 `test-review.md` 并结束当前 step。
13. 最后更新 `code-change.md` 和 `test-report.md`。
14. Coding 完成后，把 workflow 交给 `.github/skills/code-review-writer/SKILL.md` 进入独立 Review 阶段。

## Review Loop Rules

必须把 reviewer subagent 当成 gate，而不是附加建议。

规则如下：

1. reviewer 只要指出无效测试或假绿风险，就不能跳过。
2. 必须先修正测试，再重新送 reviewer。
3. 只有 reviewer 为 `approved`，该 step 才能算完成。

## Output Rules

1. 不要先写实现再补测试。
2. 不要用同一实现逻辑去生成 expected 值，避免自证正确。
3. 不要因为测试已经是绿的就默认它有效。
4. 不要跳过 RED。
5. 不要把 reviewer 的 `changes_requested` 当成可忽略建议。
6. Test 阶段负责完整验证，不负责替代 Coding 中的 TDD。

## References

1. [tdd cycle template](./assets/tdd-cycle-template.md)
2. [test review template](./assets/test-review-template.md)
3. [example tdd cycle](./assets/example-tdd-cycle.md)
4. [example test review](./assets/example-test-review.md)
5. [false green checklist](./references/false-green-checklist.md)