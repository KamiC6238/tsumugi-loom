# TDD Coding Workflow

状态：当前 Coding 阶段规范

## 1. 目标

Coding 阶段不直接从 plan 跳到实现，而是以 TDD 方式逐 step 推进。

这意味着 TDD 是 Coding 阶段的一部分，不是单独的“测试用例编写阶段”。

当前仓库的默认规则是：

1. 每个 plan step 都要单独经历 RED。
2. 每个 plan step 都要单独经历 GREEN。
3. 每个 plan step 都要单独经历 REFACTOR。
4. 每个 step 的测试都要经过 reviewer subagent 审查。

## 2. 输入前提

进入 Coding 前必须满足：

1. plan.md 已完成。
2. plan.json 已通过 schema 校验。
3. `plan.json.planStatus = ready`。
4. clarification.md 不是 `open`。

## 3. 每个 Step 的执行循环

对 plan 的每个 task 都执行以下顺序：

1. 选择测试工具。
2. 先写测试，进入 RED。
3. 确认测试失败是合理失败，而不是配置问题或伪失败。
4. 以最小实现进入 GREEN。
5. 保持测试为绿后进入 REFACTOR。
6. 把当前 step 的结果记录到 tdd-cycle.md。
7. 将测试交给 reviewer subagent 审查。
8. 如果 reviewer 打回，则回到对应 step 修正测试。

## 4. 工具选择规则

1. 纯逻辑代码
   使用 Vitest。
2. UI 交互和用户可见行为
   使用 Playwright。
3. 纯文档或纯流程变更
   明确记录为什么该 step 不适用产品级 TDD，但仍要写清验证方式。

## 5. Reviewer Loop

默认 reviewer agent：

1. `.github/agents/test-case-reviewer.agent.md`

它的职责是识别：

1. 无效测试。
2. 覆盖错位的测试。
3. 通过 mock 让测试变成“假绿”的情况。
4. 没有实际断言价值的测试。
5. 只验证实现细节、不验证行为的测试。

只有 reviewer 给出 `approved`，当前 step 才能被视为完成。

## 6. 推荐产物

Coding 阶段建议至少维护：

1. tdd-cycle.md
2. test-review.md
3. code-change.md
4. test-report.md

推荐通过 `.github/skills/tdd-coding-writer/SKILL.md` 统一驱动这些产物的生成与更新。

当 `plan.json.planStatus = ready` 后，workflow validate 会把 tdd-cycle.md 和 test-review.md 当成硬门禁，要求它们存在且没有 TODO 占位。

## 7. 退出条件

一个 workflow 的 Coding 阶段只有在以下条件同时满足时才算完成：

1. 所有 plan steps 都经过 TDD。
2. 所有相关测试通过。
3. reviewer 对测试用例的结论是 `approved`。
4. code-change.md 与 test-report.md 已更新。

这表示 workflow 已具备进入 Review 阶段的条件，但还不等于整个 workflow 可以直接 reconcile；后续仍需经过独立 code review。