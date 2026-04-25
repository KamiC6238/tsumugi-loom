---
name: tdd-coding-writer
description: 'Implement code from a structured plan using selective TDD and RED-GREEN-REFACTOR. Use for coding-writer, tdd-coding-writer, step-by-step implementation, risk-based test selection, high-value Vitest logic tests, Playwright UI tests, tdd-cycle.md generation, and iterative test review with the Test Case Reviewer subagent.'
argument-hint: '已完成的 plan.md，或当前要按选择性 TDD 实现的 workflow/task'
user-invocable: true
---

# TDD Coding Writer

## When to Use

在以下场景使用这个 skill：

1. Plan 阶段已经完成，并已有结构化 `plan.md`。
2. 需要按 TDD 实现一个或多个 plan steps。
3. 需要区分逻辑测试和 UI 测试。
4. 需要把测试生成、最小实现和重构放在同一个 Coding loop 里。
5. 需要在测试生成后交给 reviewer subagent 审查。

## What This Skill Produces

这个 skill 产出一整套 coding-stage outputs：

1. 源码实现。
2. 只覆盖高价值行为的 Vitest 或 Playwright 测试用例。
3. 对采用替代验证的 step 的判定理由与等价验证记录。
4. `tdd-cycle.md`。
5. `test-review.md`，若当前 step 无产品级测试则记录为 not-applicable 并说明原因。
6. 更新后的 `code-change.md` 与 `test-report.md`。

## Entry Contract

开始前确认：

1. 当前 workflow 已有 `plan.md`。
2. `plan.md` 已写清当前回合的范围、`Task Breakdown`、`Acceptance Criteria` 和 `Test Strategy`。
3. 当前 Coding 范围已经定位到可执行的 step。
4. 如果 step 涉及 UI 组件，已先检查 `plan.md` 中的组件复用决策，并优先复用 `shadcn-vue` 或 `src/components/ui/` 下现有组件。

## Tool Selection

根据当前 step 的性质选择测试工具：

1. 逻辑代码
   当 step 包含逻辑、决策、风险或复用价值时，使用 Vitest。
2. UI 交互和用户行为
   当 step 覆盖关键交互、状态转换、错误路径或高风险用户行为时，使用 Playwright。
3. 非产品代码步骤
   记录产品级测试跳过理由，并给出等价验证策略。

## Test Scope Standard

测试范围必须先过价值筛选，再进入 TDD。

1. 优先测试“逻辑、决策、风险、复用”。
2. 将“展示、透传、框架、低价值代码”归入替代验证路径。
3. 满足以下任一条件，通常应写测试：存在分支或规则判断、存在失败路径或回归风险、行为会被多个调用方复用、错误会带来明显业务或交互损失。
4. 满足以下特征时，通常采用替代验证：静态展示、样式调整、简单 props 透传、框架接线、无业务含义的样板代码、机械映射且几乎没有决策成本的代码。
5. 采用替代验证时，记录跳过原因和替代验证方式，例如类型检查、局部 smoke check、手工交互验证或已有覆盖的间接验证。

## Procedure

1. 读取 `plan.md`。
2. 按 `Task Breakdown` 拆分当前 Coding 范围。
3. 如果 step 涉及 UI，先核对是否可以直接复用 `shadcn-vue` 或 `src/components/ui/` 下已有组件；只有在 plan 已明确“不可复用”且理由成立时，才允许新增自定义组件。
4. 为每个 step 先做测试价值判断，明确它进入“产品级测试”或“替代验证”路径。
5. 为进入产品级测试路径的 step 选择 Vitest、Playwright 或其他合适的测试方式。
6. 为进入替代验证路径的 step 记录跳过原因，并选择等价验证方式。
7. 对进入产品级测试路径的 step，先写测试，制造合理失败，进入 RED。
8. 如果测试意外通过，先加强断言、输入覆盖或隔离方式，确保测试真实覆盖目标风险。
9. 将已编写的测试交给 `.github/agents/test-case-reviewer.agent.md` 做第一次 review；reviewer 指出问题后，先修正测试，再继续。
10. 写最小实现使测试通过，进入 GREEN。
11. 在保持外部行为一致的前提下整理实现，进入 REFACTOR。
12. 将每个 step 的过程记录到 [tdd cycle template](./assets/tdd-cycle-template.md) 对应的 `tdd-cycle.md`；采用替代验证的 step 也要记录判定依据与验证方式。
13. 将当前 step 的测试集合再次交给 reviewer 审查；采用替代验证的 step 在 [test review template](./assets/test-review-template.md) 对应的 `test-review.md` 中记录为 not-applicable 并说明原因。
14. reviewer 返回 `changes_requested` 时，修正对应 step 的测试或实现，再次送审。
15. 以 reviewer `approved` 或完整记录的 skip rationale 与替代验证作为当前 step 的完成条件。
16. 更新 `code-change.md` 和 `test-report.md`，并在涉及 UI 时记录本 step 实际复用了哪些 `shadcn-vue`/现有组件，或为何必须自定义实现。
17. Coding 完成后，把 workflow 交给 `.github/skills/code-review-writer/SKILL.md` 进入独立 Review 阶段。

## Review Gate

reviewer subagent 作为测试 step 的 gate。

规则如下：

1. reviewer 指出无效测试或假绿风险时，先修正测试，再重新送 reviewer。
2. reviewer 为 `approved` 时，该测试 step 完成。
3. 采用替代验证的 step 在 `test-review.md` 中记录 skip rationale 与替代验证充分性。

## Delivery Contract

1. 先完成测试价值判断，再进入产品级测试或替代验证路径。
2. 将产品级测试聚焦在“逻辑、决策、风险、复用”。
3. 涉及 UI 时优先复用 `shadcn-vue` 和仓库已有组件，不要在未确认复用可能性前直接造轮子。
4. 按 RED、GREEN、REFACTOR 的顺序推进需要产品级测试的 step。
5. 让 expected 值独立于实现逻辑，确保断言真正表达预期行为。
6. 用 reviewer 结论确认测试质量，并把结论写入 `test-review.md`。
7. 在 Coding 阶段更新 `tdd-cycle.md`、`code-change.md` 和 `test-report.md`。
8. 在 Testing 阶段执行完整回归验证，补齐整个 workflow 的测试结果。
9. 若最终仍需自定义 UI 组件，必须让 artifact 明确记录“为何不能复用 shadcn-vue”。

## References

1. [tdd cycle template](./assets/tdd-cycle-template.md)
2. [test review template](./assets/test-review-template.md)
3. [example tdd cycle](./assets/example-tdd-cycle.md)
4. [example test review](./assets/example-test-review.md)
5. [false green checklist](./references/false-green-checklist.md)