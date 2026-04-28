# GitHub Tasks Module

状态：2026-04-29 当前实现基线

文档类型：模块行为文档

## Owned Sources

1. `src/lib/github.ts`：GitHub remote 解析、`.git/config` repository 选择、issue normalization、issues API 请求和 storage helper。
2. `src/stores/githubTasks.ts`：Pinia tasks store，持有 selected repository、PAT、issue 列表、加载状态、错误状态和 request id 防护。
3. `src/components/workflow-studio/TasksPanel.vue`：repository 选择、认证提示、issue 列表和空状态 UI。
4. `src/composables/useWorkflowStudio.ts`：打开 Tasks 面板、关闭节点 Drawer，并在右侧主区域切换到 tasks 视图。

## Purpose

GitHub Tasks 是 workflow studio 的全局右侧面板，用来把当前本地 GitHub 仓库的 open issues 带进工作台。当前职责覆盖 repository 选择、认证提示、issue 读取和只读展示。

## User-Facing Contract

1. 侧边栏的 Tasks 按钮会激活 `tasks` 面板，并关闭已经打开的节点 Drawer。
2. 空 repository 场景下，TasksPanel 显示居中的 no-repository 状态和 `Add repo` 动作。
3. `Add repo` 优先使用 `window.showDirectoryPicker()` 读取目录中的 `.git/config`；兼容路径使用隐藏的 `webkitdirectory` 文件输入。
4. repository 解析只接受 GitHub remote，支持 HTTPS、`git@github.com:` 和 `ssh://git@github.com/` 格式；多个 remote 同时存在时优先使用 `origin`。
5. `.git/config` 解析读取 `[remote "..."]` section 下的 `url`，并从 remote section 中选择 repository remote。
6. public repository 可以直接请求 issues；401、403 和 404 会转成 auth 错误并显示 PAT 认证提示。
7. issue 卡片展示 issue number、title、author 和更新时间。

## State And Storage

1. `useGithubTasksStore` 持有 selected repository、auth token、issues、status、error message 和 error kind。
2. selected repository 写入 `tsumugi-loom.github.selectedRepository` localStorage key，并在新 store 实例创建时恢复。
3. PAT 写入 `tsumugi-loom.github.authToken` localStorage key，并在新 store 实例创建时恢复。
4. issues、loading state 和 error state 存在于运行时 store 中。
5. repository 或 token 变化后，TasksPanel 会触发 `refreshIssues()` 重新读取当前 repository 的 issue 列表。

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
4. `tests/logic/workflow-ui.test.ts` 覆盖 Sidebar Tasks 入口、App 右侧面板切换、TasksPanel auth prompt 和 compact issue card 渲染。