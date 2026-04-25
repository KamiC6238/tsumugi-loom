# Code Review Workflow

状态：当前 Review 阶段规范

## 1. 目标

Review 阶段通过独立 reviewer subagent 形成结构化 code review 结论。

当前默认规则：

1. Review 由 `.github/skills/code-review-writer/SKILL.md` 驱动。
2. Review 阶段默认调用 `.github/agents/code-reviewer.agent.md`。
3. 每轮 review 的结论写入 `review.md`。
4. Review 形成当前 workflow 的最终评审结果。

## 2. 输入

进入 Review 前准备以下输入：

1. `plan.md`
2. `code-change.md`
3. `test-report.md`
4. 当前改动对应的代码与测试
5. 如存在，可附加 `tdd-cycle.md` 与 `test-review.md`

## 3. Review Loop

对当前 workflow 执行以下顺序：

1. 读取 plan、实现、测试和当前 review 记录。
2. 调用 code reviewer subagent 做独立审查。
3. 将 findings 映射到 Coding 或 Testing 的具体修正动作。
4. 完成修正后运行必要的窄验证。
5. 继续下一轮 review，最多执行 3 轮。
6. 在 `review.md` 中记录 `Review Round`、`Review Status` 和 `Review Disposition`。

## 4. Reviewer 关注点

默认 reviewer 至少检查：

1. correctness
2. regression risk
3. contract drift
4. 输入校验和错误处理
5. 测试覆盖与改动对齐度
6. 可复用性、可读性和资源使用风险

## 5. 输出

Review 阶段维护以下核心产物：

1. `review.md`

## 6. Completion Contract

Review 阶段完成后，应满足：

1. `review.md` 已给出完整结论。
2. `review.md` 已记录 Findings、Risks and Regressions、Required Rework 和 Resolution Notes。
3. 第 3 轮后的未解决事项保留为清晰的人类后续项。
4. 标准 workflow 在 Review 阶段结束。

如需继续沉淀知识库，可在 Review 之后单独进入 Docs Reconciler。