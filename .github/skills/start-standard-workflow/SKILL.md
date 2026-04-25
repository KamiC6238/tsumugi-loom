---
name: start-standard-workflow
description: 'Start the standard implementation workflow from a raw user requirement. Use for /start-standard-workflow, standard workflow kickoff, workflow bootstrap, or plan -> coding -> testing -> review execution in this workspace.'
argument-hint: '用户需求描述'
user-invocable: true
---

# Start Standard Workflow

## When to Use

在以下场景使用这个 skill：

1. 用户给出一段自然语言需求，希望直接进入本仓库的标准开发流程。
2. 需要先创建新的 workflow 目录，再按固定阶段顺序推进实现。
3. 希望按 `plan -> tdd-coding -> testing -> review` 的完整顺序推进一次实现。

## What This Skill Does

这个 skill 是标准 workflow 的唯一入口。它负责：

1. 在 `artifacts/workflows/` 下创建一个新的 workflow 目录。
2. 初始化当前回合的 `manifest.json`。
3. 驱动 Plan、TDD Coding、Testing、Review 四个阶段。
4. 在每个阶段完成后，把对应 artifact 写回当前 workflow 目录，并更新 `manifest.json`。

## Inputs

把 slash command 的参数当成当前 workflow 的原始用户需求。

例如：

`/start-standard-workflow 为 Vue workflow 图增加节点选中态与键盘导航`

如果参数为空，先补充需求，再开始 workflow。

## Workflow Directory Contract

每个 workflow 都必须位于：

1. `artifacts/workflows/<workflow-id>/`

其中 `workflow-id` 使用 `yyyyMMdd-HHmmss-<slug>` 形式。

每个 workflow 目录至少包含：

1. `manifest.json`
2. `plan.md`

`manifest.json` 使用最小结构：

```json
{
  "workflowId": "20260425-103000-example-flow",
  "slug": "example-flow",
  "goal": "为页面增加明确的节点选中态",
  "createdAt": "2026-04-25T10:30:00.000Z",
  "updatedAt": "2026-04-25T10:30:00.000Z",
  "currentStage": "plan",
  "completedStages": [],
  "status": "active"
}
```

每完成一个阶段，都要更新：

1. `updatedAt`
2. `currentStage`
3. `completedStages`
4. `status`

## Procedure

1. 从用户需求中提炼一个简短、稳定、适合作为目录名的 kebab-case slug。
2. 生成新的 `workflow-id`，并创建 `artifacts/workflows/<workflow-id>/`。
3. 创建或更新当前 workflow 下的 `manifest.json`，把 `currentStage` 设为 `plan`。
4. 进入 Plan 阶段时，读取并遵守 `.github/skills/plan-writer/SKILL.md`，生成或更新当前 workflow 下的 `plan.md`。
5. Plan 完成后，更新 `manifest.json`，把 `completedStages` 追加 `plan`，把 `currentStage` 设为 `coding`。
6. 进入 Coding 阶段时，读取并遵守 `.github/skills/tdd-coding-writer/SKILL.md`，基于 `plan.md` 中的 `Task Breakdown` 按 step 执行实现；需要产品级测试的 step 按 RED、GREEN、REFACTOR 推进，其他 step 记录替代验证；Coding 阶段持续更新 `tdd-cycle.md`、`test-review.md` 和 `code-change.md`。
7. Coding 完成后，更新 `manifest.json`，把 `completedStages` 追加 `coding`，把 `currentStage` 设为 `testing`。
8. Testing 阶段必须执行当前仓库的所有测试用例，并把结果写回 `test-report.md`。默认执行：
   1. `pnpm test:logic`
   2. `pnpm test:ui`
9. 如果某类测试因环境限制无法运行，必须在 `test-report.md` 中明确记录阻塞原因、已完成的替代验证和残余风险。
10. Testing 完成后，更新 `manifest.json`，把 `completedStages` 追加 `testing`，把 `currentStage` 设为 `review`。
11. 进入 Review 阶段时，读取并遵守 `.github/skills/code-review-writer/SKILL.md`，以正式 gate 方式执行 review 并输出结论到 `review.md`。
12. 如果 review 返回 `changes_requested`，回到对应的 Coding 或 Testing 切片修正，做窄验证后再送审；自动 review 最多执行 3 轮。
13. 当 review 达到最终结论后，更新 `manifest.json`，把 `completedStages` 追加 `review`，把 `status` 设为 `completed`。

## Stage Contract

阶段顺序必须固定为：

1. Plan
2. TDD Coding
3. Testing
4. Review

额外要求：

1. 先创建 workflow 目录。
2. Plan 阶段产出 `plan.md` 作为交接物。
3. Coding 阶段产出 `tdd-cycle.md`、`test-review.md` 和 `code-change.md`。
4. Testing 阶段执行全部测试用例，并维护 `test-report.md`。
5. Review 阶段基于已更新的 `test-report.md` 启动。
6. 每个阶段完成后都要更新同目录下的 `manifest.json`。

## References

1. `.github/skills/plan-writer/SKILL.md`
2. `.github/skills/tdd-coding-writer/SKILL.md`
3. `.github/skills/code-review-writer/SKILL.md`
4. `docs/process/WORKFLOW_AUTOMATION.zh-CN.md`
5. `artifacts/workflows/README.md`