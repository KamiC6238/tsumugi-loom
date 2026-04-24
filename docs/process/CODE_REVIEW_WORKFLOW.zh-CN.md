# Code Review Workflow

状态：当前 Review 阶段规范

## 1. 目标

Review 阶段不是泛化的“再看一遍”，而是用独立 subagent 对已经完成 Coding 和 Test 的改动做代码审查 gate。

当前仓库的默认规则是：

1. Review 由 `.github/skills/code-review-writer/SKILL.md` 驱动。
2. Review 阶段默认调用 `.github/agents/code-reviewer.agent.md`。
3. reviewer 结论必须写回 `review.md`。
4. 只有 reviewer 为 `approved`，workflow 才能进入 docs reconcile。

## 2. 输入前提

进入 Review 前必须满足：

1. `plan.json.planStatus = ready`。
2. Coding 已完成并更新 `tdd-cycle.md`、`test-review.md`、`code-change.md`。
3. Test 已完成并更新 `test-report.md`。
4. 当前改动已经经过必要的窄验证。

## 3. Review Loop

对当前 workflow 执行以下顺序：

1. 读取 plan、coding 和 test 阶段 artifacts。
2. 调用 code reviewer subagent 做独立审查。
3. 如果 reviewer 返回 `changes_requested`，先回到 Coding/Test 修正。
4. 修正后重新运行必要验证。
5. 再次调用 reviewer，直到 verdict 为 `approved`。
6. 用最终结论更新 `review.md`。

## 4. Reviewer 关注点

默认 reviewer 至少检查：

1. 正确性缺陷。
2. 回归风险。
3. contract drift。
4. 输入校验和错误处理缺口。
5. 测试覆盖是否与改动对齐。

## 5. 推荐产物

Review 阶段至少维护：

1. review.md

推荐通过 `.github/skills/code-review-writer/SKILL.md` 统一驱动这个产物。

## 6. 退出条件

一个 workflow 的 Review 阶段只有在以下条件同时满足时才算完成：

1. reviewer verdict 为 `approved`。
2. `review.md` 已补齐且 `Review Status = approved`。
3. 没有待处理的 `changes_requested` 项。