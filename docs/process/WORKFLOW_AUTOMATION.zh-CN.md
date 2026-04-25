# Workflow Automation

这份文档描述当前仓库的轻量 workflow。标准路径固定为 Plan、Coding、Testing、Review。Docs Reconciler 作为可选的后续知识写回步骤单独执行。

## 1. 标准路径

当前标准 workflow 采用四个阶段：

1. Plan
2. Coding
3. Testing
4. Review

各阶段的默认 skill：

1. Plan 由 `.github/skills/plan-writer/SKILL.md` 驱动，并产出结构化 `plan.md`。
2. Coding 由 `.github/skills/tdd-coding-writer/SKILL.md` 驱动，按 step 选择产品级测试或替代验证路径。
3. Testing 负责运行完整验证，并把结果写入 `test-report.md`。
4. Review 由 `.github/skills/code-review-writer/SKILL.md` 驱动，输出结构化 `review.md`。

Review 完成后，标准 workflow 即可结束。如需把稳定事实沉淀回知识库，再单独调用 `.github/skills/docs-reconciler/SKILL.md`。

## 2. 命令入口

当前提供三条 workflow 命令：

1. `pnpm loom:workflow:start -- <slug>`
   创建新的 workflow 目录，并生成 `manifest.json` 与 `plan.md`。
2. `pnpm loom:workflow:validate -- <workflow-id>`
   校验 `manifest.json`、`plan.md` 和当前 workflow 中已经存在的结构化产物。
3. `pnpm loom:workflow:reconcile -- <workflow-id>`
   读取 `knowledge-delta.json`、review 结论和相关实现证据，生成 run knowledge 与 reconciliation 报告，并更新 canonical docs。

测试相关命令：

1. `pnpm test:logic`
2. `pnpm test:ui`
3. `pnpm test:ui:install`

## 3. 阶段契约

### 3.1 Plan

Plan 阶段把用户需求整理成 `plan.md`。完成后的 `plan.md` 应包含范围、约束、假设、Open Questions、Task Breakdown、Acceptance Criteria 和 Test Strategy。

### 3.2 Coding

Coding 阶段读取 `plan.md`，按 `Task Breakdown` 拆分 step，并在每个 step 上先做测试价值判断：

1. 适合产品级测试的 step 进入 RED、GREEN、REFACTOR。
2. 适合替代验证的 step 记录 skip rationale 与验证方式。
3. Coding 阶段按需更新 `tdd-cycle.md`、`test-review.md`、`code-change.md` 和 `test-report.md`。

### 3.3 Testing

Testing 阶段运行完整验证，覆盖逻辑、UI、回归和集成检查，并将结果写入 `test-report.md`。

### 3.4 Review

Review 阶段调用独立 reviewer subagent 做 code review，并将结论写入 `review.md`。`review.md` 记录 `Review Round`、`Review Status` 和 `Review Disposition`，供后续阅读和可选的 docs reconcile 使用。

### 3.5 Optional Docs Reconcile

如需继续沉淀知识库，可在 Review 结束后准备 `knowledge-delta.json`，再运行 reconcile 命令。Docs Reconciler 会读取 workflow 产物、生成 run knowledge，并把稳定事实增量写回 ARCHITECTURE、CONVENTIONS、DOMAIN 或 ADR。

## 4. Validate 范围

`pnpm loom:workflow:validate -- <workflow-id>` 当前执行以下检查：

1. `manifest.json` 和 `plan.md` 存在。
2. `plan.md` 包含标准段落。
3. 当前 workflow 中已经存在的 `test-review.md`、`review.md` 和 `knowledge-delta.json` 结构有效。
4. 当前 workflow 中已经存在的 markdown 产物不保留 `TODO:` 占位。

这一步适合在开发中反复运行，用来确认当前产物结构可继续推进。

## 5. Reconcile 输入

`pnpm loom:workflow:reconcile -- <workflow-id>` 读取以下输入：

1. `code-change.md`
2. `test-report.md`
3. `review.md`
4. `knowledge-delta.json`

命令会生成：

1. `docs/generated/run-knowledge/<workflow-id>.md`
2. `artifacts/workflows/<workflow-id>/reconciliation.md`

并把 manifest 状态推进到 `knowledge_base_updated`。

## 6. 推荐操作策略

1. 先让 workflow 产物保持轻量、清晰、可追踪。
2. 让 `plan.md` 作为唯一 planning handoff。
3. 让 Coding 和 Testing 只生成当前阶段真正需要的结构化文件。
4. 让 Review 作为标准 workflow 的结束点。
5. 让 Docs Reconciler 聚焦稳定事实和 target-scoped update。