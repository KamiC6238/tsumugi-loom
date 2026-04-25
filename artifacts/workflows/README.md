# Workflow Artifacts

这个目录保存每次开发回合的显式 artifacts。

目录约定：

1. artifacts/workflows/<workflow-id>/

其中 workflow-id 由日期、时间和 slug 组成，例如：

1. 20260424-153045-homepage-shell

每个 workflow 目录至少包含：

1. manifest.json
2. plan.md

标准 workflow 固定为四个阶段：

1. Plan
2. TDD Coding
3. Testing
4. Review

后续阶段按固定顺序补充文件：

1. Coding 阶段：tdd-cycle.md、test-review.md、code-change.md
2. Testing 阶段：test-report.md
3. Review 阶段：review.md

manifest.json 使用最小元数据结构：

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

其中：

1. plan.md 必须遵守 `docs/process/PLAN_ARTIFACT_SCHEMA.zh-CN.md`。
2. manifest.json 只记录 workflow 身份、阶段进度和状态。
3. 每个阶段完成后都要更新 manifest.json。

推荐入口：

1. 通过 `.github/skills/start-standard-workflow/SKILL.md` 创建新的 workflow 目录。
2. 通过 `.github/skills/plan-writer/SKILL.md` 生成和维护 plan.md。
3. 通过 `.github/skills/tdd-coding-writer/SKILL.md` 维护 Coding 产物。
4. 在 Testing 阶段执行全部测试用例，并维护 test-report.md。
5. 通过 `.github/skills/code-review-writer/SKILL.md` 完成 review.md。

这些文件是当前仓库标准 workflow 的唯一落地形式。