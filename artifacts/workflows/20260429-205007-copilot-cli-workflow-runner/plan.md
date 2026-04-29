# Plan

Workflow ID: 20260429-205007-copilot-cli-workflow-runner
Goal: 为 issue workflow Run 增加基于 Copilot CLI 的多节点新 session 执行闭环

## Source User Request

用户希望在 GitHub issue 详情页选择 workflow 后点击 Run，系统按 workflow 的节点顺序执行。每个节点已经配置 skill；进入不同节点时必须启动新的 Copilot CLI session，并让该 session 使用节点配置的 skill。第一个节点负责对 issue 分析和拆解并产出 plan，第二个节点基于 plan 实现，最后一个节点基于代码变更 review；如果 review 不通过，则回到第二个节点修正，再回到 review 节点循环。当前可用执行工具是 Copilot CLI，所有节点执行都应基于 Copilot CLI。

## Problem

当前项目已有 workflow 节点 skill assignment、Tasks 面板 issue detail、workflow select 和 Run 按钮，但 Run 没有行为，也没有本地 runner 来桥接浏览器 UI 与 Copilot CLI。浏览器不能直接启动本机 CLI，因此需要一个本地 runner 进程作为执行边界，同时前端需要可验证地构造 run 请求、检查 workflow 节点是否已配置 skill，并展示提交状态。

## Scope

1. 新增 workflow run 纯逻辑层，用于从 issue + workflow 派生可执行节点序列、校验节点 skill 配置、生成本地 runner 请求 payload。
2. 新增 Pinia workflow run store，通过本地 runner endpoint 提交 Run 请求，并记录 pending/submitted/error 状态。
3. 接入 TasksPanel 的 Run 按钮，让 issue detail 能提交当前 issue + selected workflow 到本地 runner，并显示 runner 状态或错误。
4. 新增本地 Copilot CLI runner 脚本，提供 HTTP endpoint，接收 run payload，创建 artifact 目录，并按节点顺序为每个节点启动新的 Copilot CLI 进程。
5. 在 runner 脚本中将节点 skill 目录 snapshot 到 run artifact，生成每个节点的 prompt.md、stdout/stderr log 和 node-result.json 约定；review 节点返回 changes_requested 时回到上一实现节点，最多循环 3 轮。
6. 更新 docs，记录 Run 执行边界、local runner 约定和验证入口。

## Out of Scope

1. 不实现远程托管 runner、用户账号体系、权限模型或多租户调度。
2. 不实现完整可视化 run timeline、实时日志流、取消/暂停/恢复 UI。
3. 不改变 GitHub issues API 的读取范围到 comments/body 之外的深度同步，除非为 payload 快照补充当前已有字段。
4. 不保证 Copilot CLI 在测试中真实执行；测试重点覆盖 deterministic planning、payload、UI 状态和 runner dry-run/contract。

## Constraints

1. 前端运行在浏览器内，不能直接 spawn Copilot CLI；必须通过本地 runner endpoint 执行本机命令。
2. 每个节点必须是新的 Copilot CLI session：runner 不得传 `--continue`、`--resume` 或 `--connect` 来串接节点上下文。
3. skill 注入通过 prompt 明确要求读取 run artifact 中 snapshot 的 `skills/<skillId>/SKILL.md`，不能依赖 Copilot CLI 原生 skill 参数。
4. 节点之间只通过 artifact、previous outputs、git diff 和 node-result.json 传递上下文。
5. 所有新增 UI 继续使用 Vue 3 Composition API、`<script setup lang="ts">`、Pinia 和现有 shadcn-vue Button/Select/Input 等 UI primitive。
6. 保持现有 Tasks 面板布局克制，不新增大型营销式页面或不必要组件。

## Component Reuse Strategy

1. TasksPanel 已经复用 `src/components/ui/button` 与 `src/components/ui/select`，本轮继续复用这些已有 shadcn-vue/Radix 风格组件。
2. Run 状态展示只作为 issue detail 内的紧凑状态条或文本块，不新增复杂自定义组件；如逻辑变复杂，优先抽到 store/lib，而不是在 SFC 内堆积状态逻辑。
3. 本轮不新增新的基础 UI primitive；runner 状态所需样式放在 TasksPanel scoped CSS 内，与现有 issue detail 区域保持一致。

## Assumptions

1. 本地 runner 默认监听 `http://127.0.0.1:43117`，前端通过该 endpoint 提交 run。
2. runner 启动时由用户或开发者显式提供 repo path；浏览器选择的 GitHub repository remote 不等同于本地可执行 path。
3. Workflow 节点必须全部配置 node skill 后才能提交执行；未配置 skill 时前端禁用 Run 并显示原因。
4. 当前 seeded 三节点 workflow 可表达 plan -> coding -> review，实际职责由节点配置的 skill 决定。
5. review loop 以 review 节点的 `node-result.json.verdict` 为准，值为 `changes_requested` 时回到 review 前一个节点。

## Open Questions

1. 后续是否需要把 issue body/comments 加入 payload 快照；本轮先基于当前 `GithubIssue` 字段实现。
2. 后续是否需要让用户在 UI 中配置 local runner endpoint；本轮先使用默认 endpoint。

## Task Breakdown

1. 新增 `src/lib/workflowRuns.ts`，实现 workflow 可执行节点派生、missing skill 校验、run id 生成、runner request payload 和 run readiness 结果。
2. 为 `workflowRuns` 逻辑新增 Vitest 测试，覆盖全节点已配置、缺失 skill、节点顺序、runner payload 和 review loop metadata。
3. 新增 `src/stores/workflowRuns.ts`，封装本地 runner submitter、pending/submitted/error 状态和 startIssueWorkflowRun action。
4. 接入 `TasksPanel.vue`：选择 issue/workflow 后派生 readiness，Run 按钮执行 store action，显示 submitted/error/pending 状态；未配置 skill 时禁用。
5. 新增 `scripts/loom/copilot-runner.mjs`，提供 `serve` 命令、本地 HTTP endpoint、artifact 创建、skill snapshot、prompt 生成、Copilot CLI 子进程执行和 review loop。
6. 更新 `package.json` script，提供本地 runner 启动命令。
7. 更新 `docs/github-tasks.md`、`docs/workflow-studio.md`、`docs/project-structure.md`、`docs/validation-map.md` 和必要的 `ARCHITECTURE.md` 条目。
8. 运行 focused Vitest，再运行完整逻辑测试和构建；若 UI 行为明显受影响，补跑 Playwright。

## Acceptance Criteria

1. Tasks issue detail 中，选择有完整 node skill 配置的 workflow 后，Run 能提交到本地 runner endpoint，并显示 run id/artifact path 或提交失败原因。
2. 如果所选 workflow 存在未配置 skill 的节点，Run 被禁用，并在 issue detail 内展示需要先配置节点 skill 的提示。
3. 本地 runner 每进入一个节点都生成独立 node artifact 目录和 prompt，并启动新的 Copilot CLI 进程，不复用上一节点 session。
4. runner prompt 明确指向当前节点 snapshot skill 的 `SKILL.md`，并列出 issue snapshot、workflow snapshot、previous artifact 和 node-result.json 输出契约。
5. review 节点返回 `changes_requested` 时，runner 会回到 review 前一个节点再执行 review，最多 3 轮；`approved` 时 run 完成。
6. 新增逻辑测试覆盖 run readiness 与 payload 生成，现有测试保持通过。

## Test Strategy

1. 使用 Vitest 覆盖 `workflowRuns` 纯逻辑：节点 skill 校验、顺序、payload、run id、缺失节点提示。
2. 使用 Vue Test Utils 扩展 `workflow-ui.test.ts`，覆盖 TasksPanel Run 状态：未选 workflow 禁用、缺 skill 提示、runner 提交成功/失败。
3. 对 runner 脚本先以 dry-run 结构和静态 review 检查为主；真实 Copilot CLI 执行不纳入自动测试。
4. 完成后运行 `pnpm test:logic` 与 `pnpm build`；如 TasksPanel 真实浏览器交互受影响，运行 `pnpm test:ui`。

## Docs Impact

1. `docs/github-tasks.md` 增加 issue workflow Run、本地 runner endpoint 和状态契约。
2. `docs/workflow-studio.md` 增加节点 skill 对 Run 可执行性的影响。
3. `docs/project-structure.md` 增加 `scripts/loom` runner 的实际职责和 `artifacts/runs` 目录约定。
4. `docs/validation-map.md` 增加 workflow run 逻辑和 runner 脚本验证入口。
5. `ARCHITECTURE.md` 补充本地 runner 作为浏览器外执行边界。

## Handoff Notes for Coding

优先实现可测试的纯逻辑和 store，再接入 TasksPanel，最后补本地 runner 脚本。UI 只做紧凑状态展示，继续复用现有 Button/Select，不新增基础组件。Copilot CLI 执行必须由本地 runner 进程承担，前端只提交 JSON payload；runner 内部启动节点 session 时不得使用 `--continue`、`--resume` 或 `--connect`。review loop 的第一版只支持线性 workflow 中 review 节点回到前一个节点，后续再泛化到条件边。
