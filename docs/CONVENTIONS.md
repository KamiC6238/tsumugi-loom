# CONVENTIONS

状态：当前项目开发约定

## 1. 文档分层

本仓库采用以下文档层级：

1. ARCHITECTURE.md
   记录当前已落地的高层结构和稳定技术约束。
2. docs/CONVENTIONS.md
   记录工程规则和开发协议。
3. docs/DOMAIN.md
   记录产品和领域术语。
4. docs/decisions/
   记录关键决策。
5. docs/generated/run-knowledge/
   记录每次 workflow 的沉淀结果。

## 2. 更新权限

默认执行步骤的职责如下：

1. Plan
   只读取 canonical docs，并通过 planning skill 输出结构化 PlanArtifact，包括面向人类的 plan.md 和面向机器校验的 plan.json。
2. Coding
   通过 `.github/skills/tdd-coding-writer/SKILL.md` 按 TDD 执行实现，修改代码和 code-change artifact，不直接改 canonical docs。
3. Test
   运行完整测试、回归与集成检查，并写 test-report artifact。
4. Review
   通过 `.github/skills/code-review-writer/SKILL.md` 调用 `.github/agents/code-reviewer.agent.md` 做 code review，并写 review artifact。
5. Docs Reconciler
   生成 run knowledge，并按 knowledge delta 受控更新 canonical docs。

canonical docs 当前采用目标受限、可追溯的受控更新，而不是整篇自由重写。

## 3. Workflow 目录约定

每个开发回合必须位于：

1. artifacts/workflows/<workflow-id>/

每个回合至少包含：

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

## 4. 开发节奏

每次需求实现遵循固定顺序：

1. 创建 workflow。
2. 通过 planning skill 生成 plan。
3. 在 Coding 阶段按 TDD 完成实现，并记录 code change、tdd-cycle 与 test-review。
4. 在 Test 阶段运行完整验证并填写 test report。
5. 完成 review。
6. 填写 final summary 和 knowledge delta。
7. 运行 docs reconcile，生成 run knowledge。
8. 让 Docs Reconciler 把稳定事实写回 canonical docs。

plan.md 必须符合 `docs/process/PLAN_ARTIFACT_SCHEMA.zh-CN.md`，否则不应进入 coding。

plan.json 必须符合 `docs/process/plan-artifact.schema.json`；如果 `Plan Status` 为 `needs_clarification`，则 clarification.md 也必须被补齐，并阻止 workflow 进入 Coding。

一旦 `plan.json.planStatus = ready`，validate 还必须要求 tdd-cycle.md 与 test-review.md 已补齐，不能继续保留 TODO 占位。

同样地，一旦 `plan.json.planStatus = ready`，`review.md` 也必须是结构化 code review 结果，且 `Review Status = approved`，否则不能进入 reconcile。

Coding 阶段的额外规则：

1. 每个 plan step 都要单独经历 RED、GREEN、REFACTOR。
2. 逻辑代码测试使用 Vitest。
3. UI 交互测试使用 Playwright。
4. 测试用例生成后，要交给 `.github/agents/test-case-reviewer.agent.md` 审查。
5. 如果 reviewer 判定为 `changes_requested`，Coding 必须先修正测试，再重新送审。
6. 只有 reviewer 判定为 `approved`，该 step 才算完成。

Test 阶段不负责“生成测试”，而是负责：

1. 跑完整测试套件。
2. 做跨 step 回归检查。
3. 汇总和记录整体测试结果。

Review 阶段的额外规则：

1. code review 必须通过独立 subagent 执行，而不是只写摘要。
2. reviewer 只要指出 correctness bug、回归风险或明显测试缺口，就不能跳过。
3. 如果 reviewer 判定为 `changes_requested`，必须先修正，再重新送审。
4. 只有 reviewer 判定为 `approved`，workflow 才能结束 Review 阶段。

## 5. 知识进入规则

只有满足以下条件的内容才应该考虑进入 canonical docs：

1. 已被代码、测试或实际运行结果支撑。
2. 具有跨 workflow 的稳定性。
3. 能明确归属到 architecture、conventions、domain 或 decision。
4. 具有来源和证据路径。

低置信、临时或待确认内容只进入 generated run knowledge，不直接进入 canonical docs。

Docs Reconciler 的写回规则：

1. 只根据 knowledge-delta.json 中的 candidate facts 写回。
2. 优先做 target-scoped 的增量更新，而不是重写整篇文档。
3. 如果事实已存在，则不重复写入。
4. decision 类型事实会生成单独 ADR，而不是塞进其他 canonical docs。

## 6. Workflow-verified Rules

<!-- BEGIN AUTO-KB:CONVENTIONS -->
- 仓库现在具备一套本地 artifact-first workflow 自动化，可创建、校验并整理开发回合。
  - workflow: 20260424-181535-scaffold-smoke-test
  - freshness: verified-2026-04-24
  - rationale: scripts/loom 和 package.json 中新增的命令把开发流程固化为 start、validate 和 reconcile 三步。
  - supportingArtifacts:
    - artifacts/workflows/20260424-181535-scaffold-smoke-test/plan.md
    - artifacts/workflows/20260424-181535-scaffold-smoke-test/code-change.md
    - artifacts/workflows/20260424-181535-scaffold-smoke-test/test-report.md
<!-- END AUTO-KB:CONVENTIONS -->
