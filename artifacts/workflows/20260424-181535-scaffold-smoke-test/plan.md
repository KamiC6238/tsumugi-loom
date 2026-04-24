# Plan Artifact

Workflow ID: 20260424-181535-scaffold-smoke-test
Plan Status: ready
Goal: 验证 workflow 自动化

## Source User Request

用户希望保留两份讨论文档不动，但在当前项目里先搭一套能承载 artifact-first 和 knowledge-base-first 思路的本地开发自动化流程。

## Problem

当前仓库缺少一套显式、可追溯的开发回合流程，无法把计划、实现、验证、review 和文档整理固化成可重复执行的协议。

## Scope

1. 创建 canonical docs 的最小骨架。
2. 创建 workflow artifacts 目录约定。
3. 提供 start、validate 和 reconcile 三条命令。
4. 通过 smoke-test workflow 验证这套流程可运行。

## Out of Scope

1. UI 节点编排 runtime。
2. 自动改写 canonical docs。
3. 远程 artifact 存储和多 agent 会话隔离。

## Constraints

1. 不修改 TSUMUGI_LOOM_DISCUSSION_SUMMARY.zh-CN.md 和 TSUMUGI_LOOM_KNOWLEDGE_BASE_PROPOSAL.zh-CN.md。
2. 流程必须先以本地仓库协议落地，而不是依赖 UI 节点系统。
3. canonical docs 只能被显式确认后修改，不能被 reconcile 自动写回。

## Assumptions

1. 当前项目阶段以 Vue/Vite 前端仓库为实验载体。
2. 先接受“Plan、Coding、Test、Review、Docs Reconciler”作为开发阶段映射。
3. 使用 markdown 和 JSON 作为第一版 artifact 载体已经足够。

## Open Questions

1. 第一版是否要进一步把 PlanArtifact 做成机器可校验的独立 JSON schema。
2. 未来是否需要把 planning 阶段升级为真正独立的 agent node。

## Task Breakdown

1. 新增 ARCHITECTURE、CONVENTIONS 和 DOMAIN 文档。
2. 新增 generated run knowledge、decisions 和 workflow artifacts 目录说明。
3. 实现 scripts/loom 下的 CLI 脚本。
4. 跑通 workflow 创建、校验和 reconcile。

## Acceptance Criteria

1. 能创建带标准 artifacts 的 workflow 目录。
2. validate 能阻止未填完模板的 workflow 继续前进。
3. reconcile 能生成 run knowledge 和 reconciliation 报告。
4. canonical docs 不会被脚本自动改写。

## Test Strategy

1. 运行 `pnpm loom:workflow:start` 验证 scaffold 创建成功。
2. 在模板未补齐时运行 `pnpm loom:workflow:validate`，确认它按预期失败。
3. 补齐 artifacts 后再次运行 validate，确认通过。
4. 运行 `pnpm loom:workflow:reconcile`，确认生成 run knowledge 与 reconciliation 报告。

## Docs Impact

1. 新增 canonical docs 骨架。
2. 新增 workflow automation 说明。
3. 本次 run knowledge 应保留在 generated 区域，canonical docs 只记录已确认的稳定事实。

## Relevant Knowledge Base Slices

- [x] ARCHITECTURE.md
- [x] docs/CONVENTIONS.md
- [x] docs/DOMAIN.md
- [x] TSUMUGI_LOOM_DISCUSSION_SUMMARY.zh-CN.md
- [x] TSUMUGI_LOOM_KNOWLEDGE_BASE_PROPOSAL.zh-CN.md

## Handoff Notes for Coding

Coding 阶段应只围绕 workflow 骨架、知识库目录、脚本入口和最小验证链路展开，不需要在本轮引入真正的 runtime 或 UI 节点系统。
