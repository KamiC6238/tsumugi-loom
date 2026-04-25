---
name: tdd-coding-writer
description: 'Write code from a structured PlanArtifact using selective TDD and RED-GREEN-REFACTOR. Use for coding-writer, tdd-coding-writer, or legacy test-cases-writer workflows, risk-based test selection, high-value Vitest logic tests, Playwright UI tests, tdd-cycle.md generation, and iterative test review with the Test Case Reviewer subagent.'
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
2. 只覆盖高价值行为的 Vitest 或 Playwright 测试用例。
3. 对跳过产品级测试的 step 的判定理由与等价验证记录。
4. `tdd-cycle.md`。
5. `test-review.md`，若当前 step 无产品级测试则记录为 not-applicable 并说明原因。
6. 更新后的 `code-change.md` 与 `test-report.md`。

## Preconditions

开始前必须确认：

1. `plan.md` 和 `plan.json` 已存在。
2. `plan.json.planStatus = ready`。
3. `clarification.md` 不是 `open`。

如果这些条件不满足，不要进入 Coding。

## Tool Selection

根据当前 step 的性质选择测试工具：

1. 逻辑代码
   只有当 step 包含逻辑、决策、风险或复用价值时，才使用 Vitest。
2. UI 交互和用户行为
   只有当 step 覆盖关键交互、状态转换、错误路径或高风险用户行为时，才使用 Playwright。
3. 非产品代码步骤
   明确记录为什么不适用产品级 TDD，并给出等价验证策略。

## Test Scope Standard

测试范围必须先过价值筛选，再进入 TDD。

1. 优先测试“逻辑、决策、风险、复用”。
2. 放弃“展示、透传、框架、低价值代码”的产品级测试。
3. 满足以下任一条件，通常应写测试：存在分支或规则判断、存在失败路径或回归风险、行为会被多个调用方复用、错误会带来明显业务或交互损失。
4. 满足以下特征，通常不要强行补测试：静态展示、样式调整、简单 props 透传、框架接线、无业务含义的样板代码、机械映射且几乎没有决策成本的代码。
5. 决定跳过产品级测试时，必须记录跳过原因，以及替代验证方式，例如类型检查、局部 smoke check、手工交互验证或已有覆盖的间接验证。

## Procedure

1. 读取 `plan.md`、`plan.json`、`clarification.md`。
2. 按 `taskBreakdown` 拆分当前 Coding 范围。
3. 为每个 step 先做测试价值判断，明确它属于“逻辑、决策、风险、复用”还是“展示、透传、框架、低价值代码”。
4. 如果 step 值得测，再决定使用 Vitest、Playwright 或其他合适的测试方式。
5. 如果 step 不值得做产品级测试，不强行补测试；记录跳过原因，并选择等价验证方式。
6. 对值得测的 step，先写测试，制造合理失败，进入 RED。
7. 如果测试意外通过，优先怀疑假绿或测试过弱，不要直接进入 GREEN。
8. 仅对已编写的测试，交给 `.github/agents/test-case-reviewer.agent.md` 做第一次 review；如果 reviewer 判定测试无效或存在假绿风险，先修正测试，再继续。
9. 写最小实现使测试通过，进入 GREEN。
10. 在不改变外部行为的前提下清理实现，进入 REFACTOR。
11. 将每个 step 的过程记录到 [tdd cycle template](./assets/tdd-cycle-template.md) 对应的 `tdd-cycle.md`；若跳过测试，也要记录判定依据与验证方式。
12. 将当前 step 的测试集合再次交给 reviewer 审查；若当前 step 没有产品级测试，则在 [test review template](./assets/test-review-template.md) 对应的 `test-review.md` 中标记为 not-applicable 并说明原因。
13. 如果 reviewer 返回 `changes_requested`，回到对应 step 修正测试或实现，再次送审。
14. 只有 reviewer 返回 `approved`，或该 step 已完整记录 skip rationale 与替代验证，才算结束当前 step。
15. 最后更新 `code-change.md` 和 `test-report.md`。
16. Coding 完成后，把 workflow 交给 `.github/skills/code-review-writer/SKILL.md` 进入独立 Review 阶段。

## Review Loop Rules

必须把 reviewer subagent 当成 gate，而不是附加建议。

规则如下：

1. reviewer 只要指出无效测试或假绿风险，就不能跳过。
2. 必须先修正测试，再重新送 reviewer。
3. 只有 reviewer 为 `approved`，该测试 step 才能算完成。
4. 对被判定为不值得做产品级测试的 step，不送 reviewer 补测试；改为审计 skip rationale 与替代验证是否充分。

## Output Rules

1. 先判断值不值得测，再进入 TDD。
2. 只测试“逻辑、决策、风险、复用”，放弃“展示、透传、框架、低价值代码”的产品级测试。
3. 不要为静态展示、简单透传、框架接线或低价值代码强行补测试。
4. 决定跳过产品级测试时，必须记录原因与替代验证方式。
5. 不要先写实现再补测试。
6. 不要用同一实现逻辑去生成 expected 值，避免自证正确。
7. 不要因为测试已经是绿的就默认它有效。
8. 不要跳过 RED。
9. 不要把 reviewer 的 `changes_requested` 当成可忽略建议。
10. Test 阶段负责完整验证，不负责替代 Coding 中的 TDD。

## References

1. [tdd cycle template](./assets/tdd-cycle-template.md)
2. [test review template](./assets/test-review-template.md)
3. [example tdd cycle](./assets/example-tdd-cycle.md)
4. [example test review](./assets/example-test-review.md)
5. [false green checklist](./references/false-green-checklist.md)