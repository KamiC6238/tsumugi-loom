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
2. 调用 code reviewer subagent 做第 1 轮独立审查。
3. 如果 reviewer 返回 `changes_requested` 且当前还没到第 3 轮，先回到 Coding/Test 修正。
4. 修正后重新运行必要验证。
5. 最多执行 3 轮 reviewer 调用，包含首轮 review 和后续复审。
6. 只要任一轮 verdict 为 `approved`，就把 `review.md` 写成 `Review Status = approved`、`Review Disposition = approved`。
7. 如果第 3 轮后仍是 `changes_requested`，就把 `review.md` 写成 `Review Status = changes_requested`、`Review Round = 3`、`Review Disposition = proceed_with_known_issues`，并记录尚未解决的问题。
8. 第 3 轮结束后不要继续自动复审，workflow 直接进入 docs reconcile，同时在界面中向用户显示这些未解决问题。

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

1. reviewer verdict 为 `approved`，或者第 3 轮后采用 `Review Disposition = proceed_with_known_issues`。
2. `review.md` 已补齐，且包含 `Review Round` 与 `Review Disposition`。
3. 如果还有待处理的 `changes_requested` 项，它们必须被明确保留在 `Required Rework` 中并对用户可见。