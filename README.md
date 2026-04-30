# Tsumugi Loom

Tsumugi Loom 是一个基于 Vue 3、TypeScript 和 Vite 的前端探索项目，用来验证“侧边栏管理多个 workflow + 主画布展示并轻量编辑当前 workflow + 全局 skill catalog 选择 + GitHub issues 任务入口 + issue workflow Run + Knowledge Base 更新 + light/dark 颜色模式”的单页工作台体验。

当前应用聚焦于本地 workflow studio：用户可以创建具名 workflow、在侧边栏切换当前活动 workflow、在主区域查看由 Vue Flow 渲染的 seeded 画布，也可以打开全局 Skills 面板，从仓库 `.github/skills` 中查看并添加 macro/node skills，并在右侧 drawer 中编辑被点击节点的名称与可用 node skill。侧边栏的 Tasks 入口会打开 GitHub issues 面板，让用户选择本地 GitHub 仓库目录，并在需要访问权限时保存 PAT，以查看该仓库的 open issues；issue detail 可以选择已配置完整节点 skill 的 workflow 并提交给本地 Copilot runner。Run 完成后，issue 列表可以触发“更新 Knowledge base”，由本地 runner 从 run artifact 中提炼事实并创建或更新目标仓库的 `docs/knowledge-base.md`。Workflow、added skills、workflow run submission 和 Knowledge Base 更新状态是 Pinia 会话状态；颜色模式偏好、GitHub selected repository 和 GitHub PAT 会写入浏览器 localStorage。

## Current Capabilities

1. 在侧边栏创建 workflow，并自动切换到新建项。
2. 在侧边栏查看 workflow 列表、节点数和边数，并切换活动项。
3. 在主区域显示当前 workflow 的标题、指标卡和可点击的 Vue Flow 画布。
4. 点击画布中的节点，在右侧 drawer 中修改节点名称，并立即同步到画布。
5. 从侧边栏打开全局 Skills 面板，按 macro/node 查看 `.github/skills` 中的 skill 卡片并切换添加状态。
6. 在节点 drawer 中从已添加的 node skills 中选择当前节点的 skill。
7. 从侧边栏打开 Tasks 面板，选择本地 GitHub 仓库目录并从 `.git/config` 识别 GitHub repository。
8. 读取 GitHub open issues，展示 issue number、title、author 和更新时间，并在 GitHub 拒绝访问时显示 PAT 认证提示。
9. 在 issue detail 中选择 workflow 并点击 Run，把 issue + workflow payload 提交到本地 Copilot runner；缺少节点 skill 时 Run 会被禁用。
10. 在 issue workflow Run 完成后，从 issue 列表点击“更新 Knowledge base”，把 run 产物中的稳定事实写入目标仓库 `docs/knowledge-base.md`。
11. 在侧边栏品牌区切换 light/dark 颜色模式，并在后续加载时恢复偏好。
12. 在没有活动 workflow 时显示空状态，引导用户从侧边栏创建第一条 workflow。

## Runtime Shape

1. App.vue 作为薄组合层，只负责连接 workflow feature 组件与顶层 composable。
2. useWorkflowStudio 统一连接 Pinia workflow store、Pinia skills store、全局 skills/tasks 面板状态、创建对话框开关，以及当前选中节点和 drawer 编辑态。
3. useWorkflow 暴露 workflow store 的 workflows、activeWorkflowId、activeWorkflow 与 create/select/update/get node 动作；useColorMode 管理 light/dark 偏好，并把当前模式同步到 document root。
4. useGithubTasksStore 持有 GitHub selected repository、PAT、issue 列表、加载状态和错误状态；useWorkflowRunsStore 持有本地 runner 提交状态和 issue 到 run 的会话映射；useKnowledgeBaseStore 持有本地 runner repository status 与 Knowledge Base 更新状态；src/lib/github.ts 负责 GitHub remote 解析、issue normalization、API 请求与 localStorage helper，src/lib/workflowRuns.ts 负责 workflow Run payload 和节点 skill 校验，src/lib/knowledgeBase.ts 负责 Knowledge Base readiness、payload 和结果归一化。
5. WorkflowSidebar、WorkflowCanvasPanel、SkillsPanel、TasksPanel、CreateWorkflowDialog、WorkflowNodeDrawer 和 ThemeModeToggle 分别承担列表、详情画布、全局 skill catalog、GitHub issue 列表、创建表单、节点编辑抽屉与颜色模式切换的页面级职责。
6. workflow 领域数据、节点编辑态、added skills、run submission 和 Knowledge Base 更新状态都是本地会话状态，不包含 workflow 业务数据持久化、后端服务或多人协作；当前持久化项限于颜色模式偏好、GitHub selected repository 和 GitHub PAT。Knowledge Base 文档写入发生在本地 runner 绑定的目标仓库中。

更详细的边界、目录职责和数据流说明见 ARCHITECTURE.md。GitHub Tasks 模块的行为约束见 docs/github-tasks.md。

## Development

1. pnpm install
2. pnpm dev
3. pnpm runner:copilot

本地 Copilot runner 默认监听 `http://127.0.0.1:43117/runs`，并提供 `POST /repository`、`GET /status` 与 `POST /runs/:runId/knowledge-base`。runner 本身是仓库无关的本机服务；前端 selected repository 变化时会推送到 `POST /repository`，runner 再解析当前目标仓库并让 Copilot 在该仓库内执行。runner 只接受 `http://localhost:5173` 与 `http://127.0.0.1:5173` 来源的浏览器请求。开发 UI 或验证 payload 时可用 `pnpm runner:copilot:dry-run`，它只生成 run artifact，不调用 Copilot CLI；如需允许其他本地前端来源，可设置 `TSUMUGI_RUNNER_ALLOWED_ORIGINS` 为逗号分隔 origin 列表。

服务模式默认在当前目录和父目录下查找与 selected repository GitHub full name 匹配的本地仓库；对更大的项目目录可用 `pnpm runner:copilot -- --repo-root /path/to/projects`，或设置 `TSUMUGI_RUNNER_REPO_ROOTS` 为逗号分隔目录列表。workflow skill snapshot 默认从本平台的 `.github/skills` 读取，也可用 `--skill-catalog /path/to/.github/skills` 覆盖。

常用命令：

1. pnpm test:logic
2. pnpm test:ui
3. pnpm build
4. pnpm test:all
