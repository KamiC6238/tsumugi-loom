# GitHub Tasks Module

状态：2026-04-29 当前实现基线

文档类型：模块行为文档

## Owned Sources

1. `src/lib/github.ts`：GitHub remote 解析、`.git/config` repository 选择、issue normalization、issues API 请求和 storage helper。
2. `src/stores/githubTasks.ts`：Pinia tasks store，持有 selected repository、PAT、issue 列表、加载状态、错误状态和 request id 防护。
3. `src/lib/workflowRuns.ts`：workflow Run payload 纯逻辑，负责从 issue + workflow 派生可执行节点、校验节点 skill 和构造本地 runner 请求。
4. `src/stores/workflowRuns.ts`：Pinia run store，负责提交本地 runner endpoint 并记录提交状态、run id、artifact dir 和错误信息。
5. `src/components/workflow-studio/TasksPanel.vue`：repository 选择、认证提示、issue 列表、issue detail、workflow select、Run 动作和提交状态 UI。
6. `src/composables/useWorkflowStudio.ts`：打开 Tasks 面板、关闭节点 Drawer，并在右侧主区域切换到 tasks 视图。
7. `scripts/loom/copilot-runner.mjs`：浏览器外本地 Copilot runner，接收 Run 请求并为每个节点启动新的 Copilot CLI session。

## Purpose

GitHub Tasks 是 workflow studio 的全局右侧面板，用来把当前本地 GitHub 仓库的 open issues 带进工作台。当前职责覆盖 repository 选择、认证提示、issue 读取、issue detail 展示，以及把 issue + workflow 提交给本地 Copilot runner 执行。

## User-Facing Contract

1. 侧边栏的 Tasks 按钮会激活 `tasks` 面板，并关闭已经打开的节点 Drawer。
2. 空 repository 场景下，TasksPanel 显示居中的 no-repository 状态和 `Add repo` 动作。
3. `Add repo` 优先使用 `window.showDirectoryPicker()` 读取目录中的 `.git/config`；兼容路径使用隐藏的 `webkitdirectory` 文件输入。
4. repository 解析只接受 GitHub remote，支持 HTTPS、`git@github.com:` 和 `ssh://git@github.com/` 格式；多个 remote 同时存在时优先使用 `origin`。
5. `.git/config` 解析读取 `[remote "..."]` section 下的 `url`，并从 remote section 中选择 repository remote。
6. public repository 可以直接请求 issues；401、403 和 404 会转成 auth 错误并显示 PAT 认证提示。
7. issue 卡片展示 issue number、title、author 和更新时间。
8. repository header 只展示 GitHub full name；不再额外展示 local name 与 full name 组合副标题，避免重复信息。
9. issue detail 使用紧凑标题层级，展示 issue number、title、state、workflow select 和 Run 动作。
10. Run 要求当前 issue 已打开、已选择 workflow，且被选 workflow 的每个节点都已配置 skill；否则按钮保持 disabled，并展示不可运行原因。
11. Run 提交到默认本地 endpoint `http://127.0.0.1:43117/runs`，由 `useWorkflowRunsStore` 记录 `submitting`、`submitted` 或 `error` 状态。
12. Run 成功后 issue detail 展示 runner 返回的 run id 与 artifact dir；提交失败时展示本地 runner 返回或网络层错误。
13. 浏览器不直接执行 Copilot CLI；必须先启动本地 runner，例如 `pnpm runner:copilot` 或 `pnpm runner:copilot:dry-run`。
14. 本地 runner 默认只允许 `http://localhost:5173` 和 `http://127.0.0.1:5173` 这两个浏览器 origin；其他本地前端端口需要通过 `TSUMUGI_RUNNER_ALLOWED_ORIGINS` 配置。

## State And Storage

1. `useGithubTasksStore` 持有 selected repository、auth token、issues、status、error message 和 error kind。
2. selected repository 写入 `tsumugi-loom.github.selectedRepository` localStorage key，并在新 store 实例创建时恢复。
3. PAT 写入 `tsumugi-loom.github.authToken` localStorage key，并在新 store 实例创建时恢复。
4. issues、loading state 和 error state 存在于运行时 store 中。
5. repository 或 token 变化后，TasksPanel 会触发 `refreshIssues()` 重新读取当前 repository 的 issue 列表。
6. workflow run 提交状态存在于 `useWorkflowRunsStore` 的运行时 state 中；切换 issue 或 workflow 会重置当前提交状态。

## Workflow Run Contract

1. `src/lib/workflowRuns.ts` 从 `WorkflowRecord` 中按 edge 顺序派生 executable nodes；没有 edge 时按节点数组顺序执行。
2. 每个 executable node 必须有非空 `skillId`；skillId 来源优先使用 workflow `nodeConfigs`，再使用节点 `data.skillId` fallback。
3. 前端提交 payload 包含 `runId`、`createdAt`、issue snapshot、workflow id/name、可执行节点列表、edge 列表和 options。
4. options 固定声明 `freshSessionPerNode: true` 与 `skillInjection: "snapshot-skill-directory"`，说明 runner 必须为每个节点创建新 session，并通过 artifact 中的 skill snapshot 注入 skill。
5. 本地 runner 接收 payload 后创建 `artifacts/runs/<run-id>/`，写入 `input/issue.json`、`input/workflow.json`、`input/request.json`、`skills/<skillId>/` 和 `nodes/<node>/`。
6. 每个节点 session 必须写 `node-result.json`；review 节点使用 `verdict: "approved" | "changes_requested"` 驱动是否回到前一个节点。
7. runner 启动 Copilot CLI 时不得传 `--continue`、`--resume` 或 `--connect`，以保持节点 session 独立。
8. runner 会拒绝 unsafe `skillId`、非法 `node-result.json` status、review 节点缺失/非法 verdict，以及 Copilot CLI 非零退出。
9. HTTP `POST /runs` 必须来自 allowlist origin；不带 Origin 的本地 CLI/测试请求允许通过。

## GitHub API Contract

1. issue 读取使用 `GET https://api.github.com/repos/{owner}/{repo}/issues?state=open&per_page=50`。
2. 请求固定带上 `Accept: application/vnd.github+json` 与 `X-GitHub-Api-Version: 2022-11-28`。
3. 如果 PAT 存在，请求会添加 `Authorization: Bearer <token>`。
4. `normalizeGithubIssues()` 从数组 payload 中提取字段完整的 issue item。
5. API 状态码 401、403 和 404 归类为 auth 错误；其余错误状态归类为 request 错误。
6. `refreshIssues()` 会捕获 repository/token 快照，并使用 request id 守卫成功和失败路径，避免过期请求覆盖当前 repository 的状态。

## Validation Basis

1. `tests/logic/github.test.ts` 覆盖 remote 解析、`.git/config` section 过滤、issue normalization、pull request 过滤和 storage helper。
2. `tests/logic/github-tasks-store.test.ts` 覆盖 repository/token restore、public issue fetch、authenticated fetch、empty state、auth error 和 stale response 防护。
3. `tests/logic/workflow-studio.test.ts` 覆盖 `tasks` 面板状态和打开 Tasks 时关闭节点 Drawer 的页面级行为。
4. `tests/logic/workflow-runs.test.ts` 覆盖 executable node 派生、缺 skill 拦截和本地 runner payload 生成。
5. `tests/logic/workflow-runs-store.test.ts` 覆盖 workflow run store 的提交成功、缺 skill 拦截和 runner 错误状态。
6. `tests/logic/workflow-ui.test.ts` 覆盖 Sidebar Tasks 入口、App 右侧面板切换、TasksPanel auth prompt、compact issue card、Run 提交和缺 skill 禁用。
