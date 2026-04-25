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
   只读取 canonical docs，并通过 planning skill 输出结构化 `plan.md`。
2. Coding
   通过 `.github/skills/tdd-coding-writer/SKILL.md` 按 step 执行实现，并更新当前阶段需要的结构化产物。
3. Test
   运行完整测试、回归与集成检查，并写 `test-report.md`。
4. Review
   通过 `.github/skills/code-review-writer/SKILL.md` 调用 `.github/agents/code-reviewer.agent.md` 做 code review，并写 `review.md`。
5. Docs Reconciler
   生成 run knowledge，并按 knowledge delta 受控更新 canonical docs。

canonical docs 当前采用目标受限、可追溯的受控更新方式。

## 3. Workflow 目录约定

每个开发回合必须位于：

1. artifacts/workflows/<workflow-id>/

每个回合至少包含：

1. manifest.json
2. plan.md

标准 workflow 从这两个文件起步。后续阶段按需补充：

1. Coding 常见文件：tdd-cycle.md、test-review.md、code-change.md、test-report.md
2. Review 文件：review.md
3. 可选 Docs Reconciler 文件：knowledge-delta.json、reconciliation.md

## 4. 开发节奏

每次需求实现遵循固定顺序：

1. 创建 workflow。
2. 通过 planning skill 生成并维护 `plan.md`。
3. 在 Coding 阶段按 step 选择产品级测试或替代验证，并更新当前需要的结构化产物。
4. 在 Testing 阶段运行完整验证并填写 `test-report.md`。
5. 在 Review 阶段形成结构化 `review.md` 结论。
6. 如需沉淀知识库，再准备 `knowledge-delta.json` 并执行 docs reconcile。

`plan.md` 必须符合 `docs/process/PLAN_ARTIFACT_SCHEMA.zh-CN.md`，并作为当前回合唯一的 planning handoff。

`pnpm loom:workflow:start` 当前只创建 `manifest.json` 与 `plan.md`。其余文件按阶段产生，并由对应 skill 或命令维护。

`pnpm loom:workflow:validate` 会校验 `manifest.json`、`plan.md` 和当前 workflow 中已经存在的结构化产物。

Coding 阶段的结构化产物由 `.github/skills/tdd-coding-writer/SKILL.md` 驱动，常见文件包括 `tdd-cycle.md`、`test-review.md`、`code-change.md` 和 `test-report.md`。

Coding 阶段的额外规则：

1. 每个 step 先做测试价值判断。
2. 需要产品级测试的 step 进入 RED、GREEN、REFACTOR。
3. 逻辑代码优先使用 Vitest。
4. UI 交互优先使用 Playwright。
5. 测试用例交给 `.github/agents/test-case-reviewer.agent.md` 审查。

Testing 阶段负责：

1. 跑完整测试套件。
2. 做跨 step 回归检查。
3. 汇总和记录整体测试结果。

Review 阶段的额外规则：

1. code review 通过独立 subagent 执行。
2. `review.md` 记录 `Review Round`、`Review Status` 和 `Review Disposition`。
3. Review 作为标准 workflow 的结束点。
4. reviewer 指出 correctness bug、回归风险或明显测试缺口时，当前回合进入修正动作。
5. reviewer 判定为 `changes_requested` 时，先修正，再重新送审。
6. reviewer 判定为 `approved` 时，workflow 完成 Review 阶段。

## 5. 知识进入规则

只有满足以下条件的内容才应该考虑进入 canonical docs：

1. 已被代码、测试或实际运行结果支撑。
2. 具有跨 workflow 的稳定性。
3. 能明确归属到 architecture、conventions、domain 或 decision。
4. 具有来源和证据路径。

低置信、临时或待确认内容只进入 generated run knowledge，不直接进入 canonical docs。

Docs Reconciler 的写回规则：

1. 只根据 knowledge-delta.json 中的 candidate facts 写回。
2. 优先做 target-scoped 的增量更新。
3. 如果事实已存在，则不重复写入。
4. decision 类型事实生成单独 ADR。

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
- workflow validate 现在只校验 manifest.json、plan.md 和当前已存在的结构化产物，并仅在 knowledge-delta.json 存在时校验其结构。
  - workflow: 20260425-095256-vue-flow-mvp-five-node-dag-spike
  - freshness: verified-2026-04-25
   - rationale: scripts/loom/workflow.mjs 和对应逻辑测试已经把最小 scaffold 合同、当前产物校验以及 knowledge-delta 的可选结构校验固化到 validate 流程中。
  - supportingArtifacts:
    - artifacts/workflows/20260425-095256-vue-flow-mvp-five-node-dag-spike/code-change.md
    - artifacts/workflows/20260425-095256-vue-flow-mvp-five-node-dag-spike/test-report.md
    - artifacts/workflows/20260425-095256-vue-flow-mvp-five-node-dag-spike/review.md
<!-- END AUTO-KB:CONVENTIONS -->
