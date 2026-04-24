# Workflow Artifacts

这个目录保存每次开发回合的显式 artifacts。

目录约定：

1. artifacts/workflows/<workflow-id>/

其中 workflow-id 由日期、时间和 slug 组成，例如：

1. 20260424-153045-homepage-shell

每个 workflow 目录至少包含：

1. manifest.json
2. plan.md
3. plan.json
4. clarification.md
 5. tdd-cycle.md
 6. test-review.md
 7. code-change.md
 8. test-report.md
 9. review.md
 10. final-summary.md
 11. knowledge-delta.json

其中：

1. plan.md 必须遵守 `docs/process/PLAN_ARTIFACT_SCHEMA.zh-CN.md`。
2. plan.json 必须遵守 `docs/process/plan-artifact.schema.json`。
3. clarification.md 用于承接 `needs_clarification` 状态或记录本次无需澄清。

建议通过 `.github/skills/plan-writer/SKILL.md` 一次性生成这三份计划相关 artifact，而不是由 coding 阶段临时补写。

其中 tdd-cycle.md 和 test-review.md 会由 scaffold 预创建模板，但只有当 plan 已经 ready 时，它们才会成为 validate 的硬门禁。

进入 Coding 后，需要持续更新：

1. tdd-cycle.md
	记录每个 plan step 的 RED、GREEN、REFACTOR 状态、测试工具和关键命令。
2. test-review.md
	记录测试 reviewer subagent 的结论、问题和回合。

这两份文件由 `.github/skills/tdd-coding-writer/SKILL.md` 在实现过程中维护。

进入 Review 后，需要持续更新：

1. review.md
	记录独立 code reviewer subagent 的结论、风险和返工项。

这份文件由 `.github/skills/code-review-writer/SKILL.md` 在 Review 阶段维护；对于已经 ready 的 workflow，只有当它的 `Review Status = approved` 时，validate 才会放行到 reconcile。

当运行 reconcile 后，还会补充：

1. reconciliation.md

并且 Docs Reconciler 会把 knowledge-delta.json 中适合长期保留的事实写回 canonical docs。

这些文件是本仓库中“节点协作”的落地形式。