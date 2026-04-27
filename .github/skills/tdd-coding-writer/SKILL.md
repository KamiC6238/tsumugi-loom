---
name: tdd-coding-writer
description: 'Implement code from a structured plan using selective TDD and RED-GREEN-REFACTOR. Use for coding-writer, tdd-coding-writer, step-by-step implementation, risk-based test selection, high-value Vitest logic tests, tdd-cycle.md generation, and iterative test review with the Test Case Reviewer subagent.'
argument-hint: '已完成的 plan.md，或当前要按选择性 TDD 实现的 workflow/task'
user-invocable: true
---

# TDD Coding Writer

## When to Use

在以下场景使用这个 skill：

1. Plan 阶段已经完成，并已有结构化 `plan.md`。
2. 需要按 TDD 实现一个或多个 plan steps。
3. 需要围绕高价值逻辑规划测试。
4. 需要把测试生成、最小实现和重构放在同一个 Coding loop 里。
5. 需要在测试生成后交给 reviewer subagent 审查。

## What This Skill Produces

这个 skill 产出一整套 coding-stage outputs：

1. 源码实现。
2. 覆盖高价值逻辑、状态、决策与可复用行为的 Vitest 测试用例。
3. `tdd-cycle.md`。
4. `test-review.md`。
5. 更新后的 `code-change.md` 与 `test-report.md`。

## Entry Contract

开始前确认：

1. 当前 workflow 已有 `plan.md`。
2. `plan.md` 已写清当前回合的范围、`Task Breakdown`、`Acceptance Criteria` 和 `Test Strategy`。
3. 当前 Coding 范围已经定位到可执行的 step。
4. 当 step 涉及 UI 组件时，已先检查 `plan.md` 中的组件复用决策，并明确需要沉淀到逻辑层的规则、状态转换或数据处理。

## Tool Selection

根据当前 step 的性质选择验证方式：

1. 逻辑、决策、状态转换、数据处理与可复用行为
   当 step 包含逻辑、决策、风险或复用价值时，使用 Vitest。
2. 涉及 UI 的 step
   先提炼其中的规则、状态转换、数据处理或组合逻辑，再用 Vitest 覆盖这些逻辑。

## Test Scope Standard

测试范围必须先过价值筛选，再进入 TDD。

1. 产品级测试对象聚焦“逻辑、决策、风险、复用”，以及可抽离的状态转换与数据处理。
2. 每个测试 step 都要先写清楚要守住的逻辑边界、输入输出和失败路径。
3. 满足以下任一条件，优先写 Vitest：存在分支或规则判断、存在失败路径或回归风险、行为会被多个调用方复用、错误会带来明显业务损失。

## Procedure

1. 读取 `plan.md`。
2. 按 `Task Breakdown` 拆分当前 Coding 范围。
3. 当 step 涉及 UI 时，先核对 `shadcn-vue` 或 `src/components/ui/` 的复用方案，并把需要验证的规则、状态转换或数据处理整理到逻辑层边界。
4. 为每个 step 先做测试价值判断，明确它要覆盖的高价值逻辑边界。
5. 为进入产品级测试路径的 step 设计 Vitest 用例，测试对象统一落在规则、状态转换、数据处理、派生结果和失败路径这些逻辑边界上。
6. 对进入产品级测试路径的 step，先写测试，制造合理失败，进入 RED。
7. 如果测试意外通过，先加强断言、输入覆盖或隔离方式，确保测试真实覆盖目标风险。
8. 将已编写的测试交给 `.github/agents/test-case-reviewer.agent.md` 做第一次 review；reviewer 指出问题后，先修正测试，再继续。
9. 写最小实现使测试通过，进入 GREEN。
10. 在保持外部行为一致的前提下整理实现，进入 REFACTOR。
11. 将每个 step 的过程记录到 [tdd cycle template](./assets/tdd-cycle-template.md) 对应的 `tdd-cycle.md`。
12. 将当前 step 的测试集合再次交给 reviewer 审查，并把 reviewer 结论写入 [test review template](./assets/test-review-template.md) 对应的 `test-review.md`。
13. reviewer 返回 `changes_requested` 时，修正对应 step 的测试或实现，再次送审。
14. 以 reviewer `approved` 作为当前 step 的完成条件。
15. 更新 `code-change.md` 和 `test-report.md`，并在涉及 UI 时记录本 step 复用了哪些现有组件，以及抽离了哪些逻辑边界。
16. Coding 完成后，把 workflow 交给 `.github/skills/code-review-writer/SKILL.md` 进入独立 Review 阶段。

## Review Gate

reviewer subagent 作为测试 step 的 gate。

规则如下：

1. reviewer 指出无效测试或假绿风险时，先修正测试，再重新送 reviewer。
2. reviewer 为 `approved` 时，该测试 step 完成。

## Delivery Contract

1. 先完成测试价值判断，再进入产品级测试路径。
2. 将产品级测试对象限定为“逻辑、决策、风险、复用”，以及可抽离的状态转换与数据处理，并统一使用 Vitest。
3. 涉及 UI 时优先复用 `shadcn-vue` 和仓库已有组件，并先把需要守住的规则、状态转换或数据处理整理到逻辑层。
4. 涉及 UI 的 step，使用 Vitest 覆盖抽离后的逻辑边界。
5. 按 RED、GREEN、REFACTOR 的顺序推进需要产品级测试的 step。
6. 让 expected 值独立于实现逻辑，确保断言真正表达预期行为。
7. 用 reviewer 结论确认测试质量，并把结论写入 `test-review.md`。
8. 在 Coding 阶段更新 `tdd-cycle.md`、`code-change.md` 和 `test-report.md`。
9. 在 Testing 阶段执行完整回归验证，补齐整个 workflow 的测试结果。
10. 若最终仍需自定义 UI 组件，让 artifact 明确记录复用决策与实现理由。

## References

1. [tdd cycle template](./assets/tdd-cycle-template.md)
2. [test review template](./assets/test-review-template.md)
3. [example tdd cycle](./assets/example-tdd-cycle.md)
4. [example test review](./assets/example-test-review.md)
5. [false green checklist](./references/false-green-checklist.md)