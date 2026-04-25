---
name: start-standard-workflow
description: 'Start the standard implementation workflow from a raw user requirement. Use for /start-standard-workflow, standard workflow kickoff, workflow bootstrap, or plan -> tdd-coding -> testing -> review execution in this workspace.'
argument-hint: '用户需求描述'
user-invocable: true
---

# Start Standard Workflow

## When to Use

在以下场景使用这个 skill：

1. 用户给出一段自然语言需求，希望直接进入本仓库的标准开发流程。
2. 需要先创建新的 workflow scaffold，再按固定阶段顺序推进实现。
3. 希望把一次实现明确限制在 `plan -> tdd-coding -> testing -> review`，而不是只执行其中某一段。

## What This Skill Does

这个 skill 是一个 orchestration entrypoint，不替代已有阶段 skill，而是按标准顺序串起它们：

1. 启动 workflow scaffold。
2. 执行 Plan 阶段。
3. 执行 TDD Coding 阶段。
4. 执行 Testing 阶段。
5. 执行 Review 阶段。

Docs Reconciler 不属于这个 skill 的范围；只有在 review 完成后，才可以把后续工作交给 `.github/skills/docs-reconciler/SKILL.md`。

## Inputs

把 slash command 的参数当成当前 workflow 的原始用户需求。

例如：

`/start-standard-workflow 为 Vue workflow 图增加节点选中态与键盘导航`

如果参数为空，先要求用户补充需求，再开始 workflow。

## Procedure

1. 从用户需求中提炼一个简短、稳定、适合作为目录名的 kebab-case slug。
2. 运行 `pnpm loom:workflow:start -- <slug> --goal "<需求摘要>"` 创建新的 workflow scaffold。
3. 记录命令输出中的 `workflowId` 和 workflow 目录；后续所有 artifacts、验证和 review 都必须围绕这个 workflow 进行。
4. 进入 Plan 阶段时，读取并遵守 `.github/skills/plan-writer/SKILL.md`，生成或更新当前 workflow 下的 `plan.md`、`plan.json`、`clarification.md`。
5. 如果 Plan 结果是 `needs_clarification`，停止进入后续阶段，向用户提出阻塞性问题，并保持 workflow 停在 Plan。
6. 只有当 `plan.json.planStatus = ready` 且 `clarification.md` 不为 `open` 时，才进入 TDD Coding 阶段。
7. 进入 TDD Coding 阶段时，读取并遵守 `.github/skills/tdd-coding-writer/SKILL.md`，基于 `taskBreakdown` 按 step 执行 RED-GREEN-REFACTOR，并更新 `tdd-cycle.md`、`test-review.md`、`code-change.md`、`test-report.md`。
8. TDD Coding 完成后，单独执行 Testing 阶段，不要把它和 TDD 或 Review 混在一起。
9. Testing 阶段必须运行完整验证，并把结果写回 `test-report.md`。至少遵守以下规则：
   1. 逻辑或数据行为有变更时，运行相关 Vitest 命令，必要时再补全量 `pnpm test:logic`。
   2. UI 交互、状态切换或端到端行为有变更时，运行相关 Playwright 命令，必要时再补 `pnpm test:ui -- <spec>` 或等价命令。
   3. 如果某类测试因环境限制无法运行，必须在 `test-report.md` 里明确记录阻塞原因、已完成的替代验证和残余风险。
10. 只有当 Testing 阶段已经更新 `test-report.md` 后，才进入 Review 阶段。
11. 进入 Review 阶段时，读取并遵守 `.github/skills/code-review-writer/SKILL.md`，把 review 当成正式 gate，而不是总结性说明。
12. 如果 review 返回 `changes_requested`，回到对应的 Coding 或 Testing 切片修正，做窄验证后再送审；最多自动执行 3 轮 review。
13. 当 review 达到最终结论后，向用户汇报当前 workflow 的状态、关键风险和是否可以继续进入 docs reconcile。

## Stage Contract

阶段顺序必须固定为：

1. Plan
2. TDD Coding
3. Testing
4. Review

额外要求：

1. 不要跳过 workflow scaffold 创建步骤。
2. 不要在 `needs_clarification` 状态下进入 Coding。
3. 不要把 Testing 简化成“顺手跑一下刚写的单测”；它必须覆盖完整验证、回归和集成检查。
4. 不要在 `test-report.md` 未更新前启动 Review。
5. 不要在 Review 通过前擅自进入 Docs Reconciler。

## References

1. `.github/skills/plan-writer/SKILL.md`
2. `.github/skills/tdd-coding-writer/SKILL.md`
3. `.github/skills/code-review-writer/SKILL.md`
4. `docs/process/WORKFLOW_AUTOMATION.zh-CN.md`
5. `scripts/loom/start-workflow.mjs`