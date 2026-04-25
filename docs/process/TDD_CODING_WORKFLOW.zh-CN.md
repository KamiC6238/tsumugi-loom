# TDD Coding Workflow

状态：当前 Coding 阶段规范

## 1. 目标

Coding 阶段读取 `plan.md`，按 step 推进实现，并在每个 step 上选择合适的验证路径。

当前默认规则：

1. 先做测试价值判断。
2. 适合产品级测试的 step 进入 RED、GREEN、REFACTOR。
3. 适合替代验证的 step 记录 skip rationale 与验证方式。
4. 测试型 step 通过 reviewer subagent 做质量 gate。

## 2. 输入

进入 Coding 前准备以下输入：

1. `plan.md`
2. `plan.md` 中的 `Task Breakdown`
3. `plan.md` 中的 `Acceptance Criteria`
4. `plan.md` 中的 `Test Strategy`

## 3. 每个 Step 的执行循环

对当前 Coding 范围内的每个 step 执行以下顺序：

1. 判断 step 进入产品级测试路径还是替代验证路径。
2. 为产品级测试路径选择合适的工具。
3. 对产品级测试路径先写测试，制造合理失败，进入 RED。
4. 写最小实现使测试通过，进入 GREEN。
5. 在保持外部行为一致的前提下整理实现，进入 REFACTOR。
6. 将测试集合交给 reviewer subagent 审查。
7. 记录 step 的过程、review 结果和验证方式。

## 4. 工具选择

1. 逻辑、决策、规则判断和可复用行为使用 Vitest。
2. UI 交互、状态切换、错误路径和高风险用户行为使用 Playwright。
3. 静态展示、样式调整、简单透传和框架接线使用替代验证路径。

## 5. Reviewer Gate

默认 reviewer agent：

1. `.github/agents/test-case-reviewer.agent.md`

reviewer 负责确认：

1. 测试覆盖真实行为。
2. 断言表达用户可见结果或规则结果。
3. 测试输入与风险对齐。
4. 测试结果能够真实支撑当前 step 的完成结论。

## 6. 推荐产物

Coding 阶段按需维护以下产物：

1. `tdd-cycle.md`
2. `test-review.md`
3. `code-change.md`
4. `test-report.md`

这些产物由 `.github/skills/tdd-coding-writer/SKILL.md` 统一驱动和更新。

## 7. Completion Contract

Coding 阶段完成后，应满足：

1. 当前 `Task Breakdown` 已完成实现或验证记录。
2. 产品级测试路径已有通过结果和 reviewer 结论。
3. 替代验证路径已有 skip rationale 与验证方式。
4. `code-change.md` 和 `test-report.md` 已更新。

完成后的 workflow 进入 Testing 阶段执行完整回归验证。