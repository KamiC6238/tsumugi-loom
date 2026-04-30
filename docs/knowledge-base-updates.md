# Knowledge Base Updates Module

状态：2026-04-30 当前实现基线

文档类型：模块行为文档

## Purpose

Knowledge Base Updates 负责在 issue workflow Run 完成后，把 run artifact 中的稳定事实写入用户选择项目仓库的长期文档。它把浏览器端的 issue 列表动作、Pinia 会话状态和本地 runner 的文件写入边界连接起来。

## Owned Sources

1. `src/lib/knowledgeBase.ts`：Knowledge Base readiness、runner endpoint、request payload、runner status 和结果归一化。
2. `src/stores/knowledgeBase.ts`：Pinia store，持有 runner repository status、per issue/run 更新状态、错误和提交动作。
3. `src/stores/workflowRuns.ts`：记录 issue number 到 latest workflow run submission 的会话映射，并支持刷新单个 run 状态。
4. `src/components/workflow-studio/TasksPanel.vue`：issue 列表中的“更新 Knowledge base”按钮、禁用原因和更新状态。
5. `scripts/loom/copilot-runner.mjs`：`GET /status` 和 `POST /runs/:runId/knowledge-base`，负责读取 run artifact 并写入目标仓库文档。

## User-Facing Contract

1. issue workflow Run 完成后，对应 issue card 会显示可点击的“更新 Knowledge base”按钮。
2. 没有 latest run、run 尚未 completed、runner status 不可用、runner 不支持 Knowledge Base 更新或 runner current repository 与 selected repository 不匹配时，按钮保持 disabled 并展示原因；没有 completed run 时优先提示用户先运行 workflow。
3. 从 issue detail 返回 issue list 时，如果 latest run 仍是 queued/running，前端会刷新 `GET /runs/:runId` 后再判断按钮可用性。
4. 点击或键盘操作“更新 Knowledge base”按钮不会打开 issue detail；它只提交 Knowledge Base 更新请求。
5. 更新中显示 `Updating Knowledge base`，成功后显示目标路径和 fact 数量，失败时显示 runner 或网络层错误。
6. 目标文档固定为 runner current repository 内的 `docs/knowledge-base.md`。
7. 如果目标文档不存在，runner 会创建；如果已经存在，runner 会保留用户手写内容并更新 Tsumugi Loom managed section。
8. 同一个 run 重复更新不会重复插入同一个 managed entry。

## Runner Contract

1. `POST /repository` 接收前端 selected repository identity，runner 会在 configured repository roots 中解析匹配的本地 GitHub 仓库，并把它作为 current repository。
2. `GET /status` 返回 `serviceRoot`、`repoPath`、`skillCatalogPath`、`repositoryFullName`、`selectedRepository`、`repositorySearchRoots`、`mode` 和 `capabilities.knowledgeBaseUpdates` / `capabilities.repositorySelection`；没有 current repository 时 `repoPath` 与 `repositoryFullName` 为 `null`。
3. `repositoryFullName` 从 current repository `.git/config` 中解析，优先使用 `origin` remote；`skillCatalogPath` 默认指向 Tsumugi Loom 平台仓库的 `.github/skills`，可通过 `--skill-catalog` 覆盖。
4. `POST /runs/:runId/knowledge-base` 只接受 completed run；running、queued 或 failed run 会被拒绝。
5. 请求体包含 run id、issue identity、repository identity 和固定 target path。
6. runner 会 fail-closed 校验 repository identity；请求缺少 `repository.fullName`、runner 尚未收到 selected repository，或两者不匹配时都会拒绝写入。
7. runner 写入路径固定为 `docs/knowledge-base.md`，并通过 target path 白名单和 path containment 检查保证目标路径在 repo root 内。
8. runner 发现 managed section marker 缺失配对或重复时会拒绝更新，避免损坏文档时静默返回成功。
9. runner 从 `input/issue.json`、`input/workflow.json`、节点 `node-result.json` 和节点声明的 markdown/text artifacts 中提取事实。
10. runner 写入 `artifacts/runs/<run-id>/knowledge-base/update.json`，记录 target path、fact count、source artifacts 和更新时间。

## State Model

1. `useWorkflowRunsStore` 按 issue number 保存 latest run submission，供 issue 列表判断是否有 completed run。
2. `useKnowledgeBaseStore` 保存 runner status 和 issue/run key 到更新状态的映射。
3. selected repository 变化时，TasksPanel 会清空 latest issue run mapping 和 per issue/run Knowledge Base 状态，避免不同仓库的同号 issue 复用旧 run。
4. Knowledge Base 更新状态只存在于会话内存，刷新页面后需要重新执行或重新获得 run status。
5. selected repository 仍由 `useGithubTasksStore` 持久化；Knowledge Base store 不额外持久化 repository。

## Validation Basis

1. `tests/logic/knowledge-base.test.ts` 覆盖 readiness、endpoint、payload 和结果归一化。
2. `tests/logic/knowledge-base-store.test.ts` 覆盖成功提交、不可提交状态、per issue/run 隔离和重复点击防护。
3. `tests/logic/workflow-runs-store.test.ts` 覆盖 issue 到 latest run 的映射和单 issue run status refresh。
4. `tests/logic/workflow-ui.test.ts` 覆盖 issue 列表按钮、queued run 返回列表刷新、禁用原因、点击/键盘不打开 detail 和提交 payload。
5. `tests/logic/copilot-runner-script.test.ts` 覆盖 runner status、Knowledge Base 创建/更新、幂等 entry、非 completed run 拒绝、非法 target path、malformed marker、缺失/无法解析 repository identity 和 repository mismatch 拒绝。