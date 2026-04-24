# Workflow Automation

这份文档描述当前仓库如何把 Tsumugi Loom 的 artifact-first 和 knowledge-base-first 思路，落成一套可以直接用于日常开发的本地流程。

## 1. 目标

当前实现不做 UI 节点编排，而是把节点思想映射成固定开发阶段：

1. Plan
2. Coding
3. Test
4. Review
5. Docs Reconciler

其中 Plan 阶段不直接把用户原始聊天内容交给 Coding，而是先通过 workspace skill `.github/skills/plan-writer/SKILL.md` 转成符合 `docs/process/PLAN_ARTIFACT_SCHEMA.zh-CN.md` 的结构化 PlanArtifact。

Coding 阶段默认通过 workspace skill `.github/skills/tdd-coding-writer/SKILL.md` 执行。这个 skill 会按 `docs/process/TDD_CODING_WORKFLOW.zh-CN.md` 对 plan 的每个 step 执行 RED-GREEN-REFACTOR，并在测试生成后调用 `.github/agents/test-case-reviewer.agent.md` 进行 reviewer gate。

Review 阶段默认通过 workspace skill `.github/skills/code-review-writer/SKILL.md` 执行。这个 skill 会按 `docs/process/CODE_REVIEW_WORKFLOW.zh-CN.md` 调用 `.github/agents/code-reviewer.agent.md` 做独立 code review，并把结论写回 `review.md`。

这里的关键边界是：TDD 属于 Coding 阶段内部的执行纪律，而不是一个单独的“先写测试”平行阶段。Test 阶段负责完整测试运行、回归验证和跨 step 检查，不负责生成测试用例。

## 2. 命令入口

当前提供三条命令：

1. pnpm loom:workflow:start -- <slug>
   创建一次新的开发回合目录和基础 artifacts。
2. pnpm loom:workflow:validate -- <workflow-id>
   检查这个 workflow 是否补全了必需产物，knowledge delta 是否结构有效。
3. pnpm loom:workflow:reconcile -- <workflow-id>
   基于已完成的 artifacts 生成 run knowledge、reconciliation 报告，并把稳定事实写回 canonical docs。

测试相关命令：

1. pnpm test:logic
   运行 Vitest，用于逻辑代码测试。
2. pnpm test:ui
   运行 Playwright，用于 UI 交互测试。
3. pnpm test:ui:install
   首次安装 Playwright 浏览器。

## 3. 推荐使用方式

### 3.1 启动一次开发回合

示例：

pnpm loom:workflow:start -- landing-page-shell --goal "搭建首页外壳和基础信息结构"

脚本会在 artifacts/workflows 下创建一个时间戳目录，并生成：

1. plan.md
2. plan.json
3. clarification.md
 4. tdd-cycle.md
 5. test-review.md
 6. code-change.md
 7. test-report.md
 8. review.md
 9. final-summary.md
 10. knowledge-delta.json
 11. manifest.json

### 3.2 执行实现

开发过程中按顺序填写这些文件：

1. 先使用 planning skill 生成并补齐 plan.md 与 plan.json。
2. 如果信息不足，更新 clarification.md，并保持 `Plan Status: needs_clarification`。
3. 信息充分后，将 plan 切换到 `ready`，clarification.md 标记为 `not_needed` 或 `resolved`。
4. 代码实现后更新 code-change.md。
5. 跑验证后写 test-report.md。
6. 完成 review.md。
7. 总结本次变更和结果到 final-summary.md。
8. 把长期候选事实写入 knowledge-delta.json。

plan.md 的结构以 `docs/process/PLAN_ARTIFACT_SCHEMA.zh-CN.md` 为准；plan.json 的结构以 `docs/process/plan-artifact.schema.json` 为准。不应把用户需求原文未经整理直接交给 coding 环节。

进入 Coding 后，必须维护两份 coding-stage artifacts：

1. tdd-cycle.md
   记录每个 plan step 的 RED、GREEN、REFACTOR 过程。
2. test-review.md
   记录 reviewer subagent 的测试审查结论和回合。

这两份文件由 `.github/skills/tdd-coding-writer/SKILL.md` 在 Coding 阶段更新；workflow scaffold 会先生成模板，等 plan 进入 `ready` 后它们就成为 validate 的硬门禁。

从阶段职责上看：

1. Coding
   逐 step 执行 TDD，并产出测试与实现。
2. Test
   跑完整 Vitest、Playwright 和其他必要验证，检查跨 step 回归与集成结果。
3. Review
   通过独立 code reviewer subagent 做最终代码审查，并把结论固化到 `review.md`。

### 3.3 验证产物完整性

在进入 docs reconcile 之前运行：

pnpm loom:workflow:validate -- <workflow-id>

如果模板中的 TODO 还没填完，或 knowledge delta 结构无效，这一步会失败。

从这一版开始，validate 还会检查：

1. plan.md 是否包含规定的结构段落。
2. plan.json 是否符合 JSON schema。
3. plan.md 和 plan.json 的 `Plan Status` 是否一致。
4. clarification.md 是否与 plan status 保持一致。
5. 如果 plan status 仍是 `needs_clarification`，workflow 会被阻止进入 Coding。
6. 如果 plan status 已是 `ready`，则 tdd-cycle.md 和 test-review.md 必须存在。
7. 如果 plan status 已是 `ready`，则 tdd-cycle.md 和 test-review.md 不能保留 TODO 占位。
8. 如果 plan status 已是 `ready`，则 review.md 必须是结构化 code review artifact。
9. 如果 plan status 已是 `ready`，则 review.md 的 `Review Status` 必须为 `approved`。

Coding 阶段还应遵守以下 TDD 规则：

1. 逻辑代码优先使用 Vitest。
2. UI 交互优先使用 Playwright。
3. 每个 plan step 都要经历 RED、GREEN、REFACTOR。
4. 测试生成后先走 reviewer subagent，再视情况回到 Coding 修正。

Test 阶段的职责则是：

1. 运行完整逻辑测试和 UI 测试。
2. 做回归与集成验证。
3. 把结果整理进 test-report.md。

Review 阶段的职责则是：

1. 调用 `.github/agents/code-reviewer.agent.md` 做独立 code review。
2. 如果 verdict 为 `changes_requested`，把问题退回 Coding/Test 修正。
3. 只有 `review.md` 最终为 `approved`，才进入 reconcile。

### 3.4 生成 run knowledge

在所有产物补齐后运行：

pnpm loom:workflow:reconcile -- <workflow-id>

这一步会生成：

1. docs/generated/run-knowledge/<workflow-id>.md
2. artifacts/workflows/<workflow-id>/reconciliation.md

同时它还会：

1. 根据 knowledge-delta.json 的 candidate facts 更新 ARCHITECTURE、CONVENTIONS、DOMAIN 或 ADR。
2. 对已存在事实跳过重复写入。
3. 把 workflow 状态推进到 knowledge_base_updated。

## 4. Knowledge Delta 最小约定

knowledge-delta.json 采用以下最小结构：

1. sourceWorkflowId
2. sourceNodeIds
3. timestamp
4. candidateFacts
5. affectedAreas
6. confidence
7. evidence
8. recommendedTargets
9. reviewRequired

candidateFacts 中每一项至少应包含：

1. fact
2. type
3. rationale
4. supportingArtifacts
5. freshness

如有需要，可以额外补充 recommendedTarget。

## 5. 推荐操作策略

1. 当前阶段优先让 workflow 可追溯，不追求完全自动化。
2. canonical docs 的改动保持少而准，并由 Docs Reconciler 做 target-scoped 更新。
3. 讨论稿和方案稿继续作为上游设计输入保留，不直接被脚本改写。
4. generated run knowledge 仍保留完整运行摘要，而 canonical docs 只吸收稳定事实。