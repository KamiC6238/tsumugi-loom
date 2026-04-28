# ARCHITECTURE

状态：2026-04-28 当前实现基线

## 1. 范围

这个仓库当前是 Tsumugi Loom 的前端探索项目，技术栈以 Vue 3、TypeScript 和 Vite 为主，并结合 Tailwind CSS 4、shadcn-vue / Reka UI 以及 Vue Flow 搭建交互壳层。

当前实现目标不是执行真实 workflow，而是验证一个“侧边栏管理多个 workflow + 主画布展示当前 workflow + 全局 skill catalog 选择 + GitHub issues 任务入口”的本地单页应用体验。

当前已经实现的用户可见能力：

1. 在页面内创建具名 workflow。
2. 在侧边栏查看 workflow 列表并切换当前活动 workflow。
3. 为新建 workflow 生成一组本地 seeded 节点与边。
4. 在主区域用 Vue Flow 渲染当前 workflow 的可点击画布。
5. 点击当前 workflow 的节点后，在右侧 Drawer 中修改节点名称并立即同步画布标签。
6. 从仓库 `.github/skills` 读取全局 skill catalog，在右侧 Skills 面板中按 macro/node 分类展示并切换添加状态。
7. 在节点 Drawer 中从已添加的 node skills 中选择节点 skill。
8. 从侧边栏打开 Tasks 面板，选择本地 GitHub 仓库目录，读取 `.git/config` 识别 GitHub `owner/repo`，并通过 GitHub issues API 展示 open issues。
9. 把 GitHub selected repository 和 PAT 保存在浏览器 localStorage，以便刷新后恢复任务面板上下文。
10. 在侧边栏品牌区切换 light/dark 颜色模式，并把颜色偏好保存在浏览器 localStorage。
11. 用 Vitest 和 Playwright 覆盖状态逻辑、主题偏好、GitHub tasks 状态与关键 UI 交互。

当前不在实现范围内的内容：

1. 节点级 agent runtime。
2. DAG 调度引擎和任务执行器。
3. 模型路由、预算控制与推理编排。
4. 后端 API、远程 artifact 存储与多用户协作。
5. GitHub OAuth、issue mutation、issue assignment、label 同步或任务双向写回。
6. 浏览器运行时内的 knowledge retrieval 或自动知识库文档改写。

## 2. 当前系统边界

当前系统由两个层面组成：浏览器运行时应用，以及仓库内的 workflow 文档与自动化支撑。

浏览器运行时边界如下：

1. 单页 Vue 应用。
2. 基于 Pinia 的本地会话 workflow、added skills 与 GitHub tasks 状态管理。
3. 侧边栏、创建对话框、节点 Drawer、主画布、全局 Skills 面板和 GitHub Tasks 面板组成的 UI shell。
4. 使用 Vue Flow 的工作流可视化渲染。
5. 颜色模式偏好写入 `tsumugi-loom-color-mode` localStorage key，并应用到根元素的 `dark` class、`data-color-mode` 与 `color-scheme`。
6. GitHub Tasks 面板的 selected repository 与 PAT 分别写入 `tsumugi-loom.github.selectedRepository` 和 `tsumugi-loom.github.authToken` localStorage key。

仓库支撑边界如下：

1. Vite 构建、本地测试与前端开发工具链。
2. workflow artifacts、knowledge base 文档和本地自动化脚本。

当前系统仍然没有：

1. 服务端状态源。
2. workflow、skill 添加状态或节点编辑结果的持久化存储；GitHub selected repository 与 PAT 是独立的任务面板配置持久化，不代表 workflow 数据持久化。
3. 实时同步。
4. 跨进程或跨节点的 artifact 通信。

## 3. 运行时架构

当前运行时的主要控制点如下：

1. src/main.ts
   应用入口，加载全局样式，初始化颜色模式，安装 Pinia，并挂载 Vue 应用。
2. src/style.css
   定义 light/dark 语义视觉变量，并引入 Tailwind、shadcn-vue 和 Vue Flow 的基础样式。
3. src/App.vue
   薄组合层，只负责拼接 workflow feature 组件，在 workflow canvas、全局 Skills 面板与 GitHub Tasks 面板之间切换，并把 composable 暴露的状态与事件处理器向下分发。
4. src/composables/useWorkflowStudio.ts
   workflow 页面级编排层，连接 Pinia workflow store、Pinia skills store 与页面局部 UI 状态，集中处理当前右侧面板、创建对话框开关、当前选中节点，以及 create/select/save node/open skills/open tasks/close drawer 等页面动作。
5. src/composables/useWorkflow.ts
   workflow store 门面层，向页面组合逻辑暴露 workflows、activeWorkflowId、activeWorkflow，以及 create/select/update/get node 等动作。
6. src/composables/useColorMode.ts
   颜色模式组合逻辑，读取和写入 localStorage，维护 light/dark ref，并把当前模式同步到 document root。
7. src/components/workflow-studio/
   workflow feature 组件层，其中 WorkflowSidebar 负责列表与入口按钮，WorkflowCanvasPanel 负责活动 workflow 的明细、画布与节点点击事件，SkillsPanel 负责全局 skill catalog 展示与添加开关，TasksPanel 负责 GitHub repository 选择、认证提示和 issue 列表，CreateWorkflowDialog 负责创建表单与草稿输入，WorkflowNodeDrawer 负责节点编辑抽屉。
8. src/lib/workflows.ts
   纯函数状态层，负责创建空状态、追加 workflow、切换活动 workflow、节点改名、节点 skill assignment 更新以及解析当前活动 workflow。
9. src/lib/skills.ts
   纯函数 skill catalog 层，负责通过 Vite raw import 纳入 `.github/skills/*/SKILL.md`，解析 frontmatter，分类 macro/node，并计算已添加 skill 与已添加 node skill；当前只有 `start-standard-workflow` 是默认 macro，其他未显式声明 kind/type 的 skills 默认是 node。
10. src/lib/github.ts
   纯函数 GitHub tasks 支撑层，负责解析 GitHub remote、从 `.git/config` 选择 repository、规范化 GitHub issue payload、封装 GitHub issues API 请求，以及读写 GitHub tasks 的 localStorage 项。
11. src/stores/workflows.ts
   Pinia workflow store，持有 workflowState 会话状态，并把纯函数状态变换包装成会返回成功布尔值的 create/select/update/get node 动作。
12. src/stores/skills.ts
   Pinia setup store，持有用户已添加的 skill ids，并派生 added skills、added node skills 与添加状态判断；未知 skill id 的 toggle 请求会被忽略。
13. src/stores/githubTasks.ts
   Pinia setup store，持有 GitHub selected repository、PAT、issue 列表、加载状态和错误状态，并用 request id 防止过期 issue 请求覆盖当前 repository 的结果。
14. src/components/ui/
   复用型 UI 原语封装，目前主要承载按钮、输入框、标签、对话框、Drawer、Select 和 Switch。

当前状态模型的核心约束：

1. workflow 领域状态保存在 Pinia workflow store 的本地会话 state 中，而不是散落在多个页面组件里。
2. 每次新建 workflow 都会生成固定结构的节点和边。
3. 活动 workflow 由 activeWorkflowId 控制，WorkflowSidebar 只发出切换事件，不直接修改状态。
4. CreateWorkflowDialog 只持有输入草稿，并在关闭或保存后重置草稿；真正的 workflow 创建动作仍委托给 useWorkflowStudio。
5. 画布内容完全来自当前活动 workflow 的 nodes 和 edges。
6. 节点编辑态由 useWorkflowStudio 持有，当前选中节点通过 workflow store 的当前 activeWorkflow 与 selectedNodeId 派生，避免在 Drawer 内复制 workflow 数据。
7. Skills 面板是全局面板，不绑定 activeWorkflow；其添加状态由 Pinia skills store 持有，useWorkflowStudio 只负责把 store 状态和动作接到页面组件。
8. Tasks 面板是全局面板，不绑定 activeWorkflow；打开 Tasks 面板会关闭当前节点 Drawer，并让右侧主区域从 workflow canvas 或 Skills 面板切换到 GitHub issue 列表体验。
9. GitHub tasks 状态由 useGithubTasksStore 持有；selected repository 和 PAT 会从 localStorage 恢复，issue 列表、加载状态和错误状态只作为运行时状态存在。
10. GitHub repository 解析只接受 GitHub remote，优先使用 `origin` remote，并在 `.git/config` 解析时忽略非 remote section 中的 URL。
11. GitHub issues 读取使用 open issues endpoint，并在规范化时过滤 GitHub issues API 中混入的 pull request 项。
12. GitHub issue refresh 会捕获 repository/token 快照并用 request id 守卫结果，避免过期响应覆盖当前 repository 的 issue 列表或错误状态。
13. Drawer 只接收已添加的 node skills；macro skills 不会作为节点 skill 写入节点数据。
14. 颜色模式不属于 workflow 领域状态；它由 useColorMode 独立管理，并只持久化用户的 light/dark 偏好。

## 4. 仓库结构与职责

当前仓库里与架构相关的主要目录如下：

1. src/
   前端运行时代码。
2. src/composables/
   页面级状态编排与组合逻辑。
3. src/stores/
   Pinia store 层，当前承载 workflow 会话状态、全局 added skills 状态与 GitHub tasks 状态。
4. src/lib/
   与视图解耦的纯状态与辅助逻辑，包括 workflow 状态变换、skill catalog 解析与 GitHub tasks helper。
5. src/components/
   workflow feature 组件和可复用 UI 组件。
6. tests/logic/
   面向纯状态逻辑的 Vitest 测试。
7. tests/ui/
   面向端到端交互的 Playwright 测试。
8. public/ 与 src/assets/
   静态资源。
9. scripts/loom/
   workflow 脚本自动化入口，负责仓库内 workflow scaffold 与相关流程控制。
10. artifacts/workflows/
   每次开发回合生成的显式 workflow 产物，如 plan、review、test-report 与 knowledge delta。
11. docs/ 与根目录长期维护文档
   项目知识库与长期保留的架构、说明和流程文档。

## 5. 当前数据流

当前浏览器运行时的数据流如下：

1. Vite 启动应用并加载 src/main.ts。
2. src/main.ts 初始化颜色模式、安装 Pinia、挂载 App.vue，同时引入 src/style.css 提供全局样式层。
3. App.vue 调用 useWorkflowStudio，拿到 workflows、activeWorkflow、selectedNode、isCreateDialogOpen、isNodeDrawerOpen 以及 create/select/open/rename 等动作，并把它们下发给 feature 组件。
4. useWorkflowStudio 通过 useWorkflow 读取 Pinia workflow store 暴露的 workflows、activeWorkflowId、activeWorkflow 与 workflow 动作。
5. useWorkflowStudio 读取 Pinia skills store，将 addedSkillIds、addedSkills、addedNodeSkills、isSkillAdded 与 toggleSkill 接到页面组件。
6. WorkflowSidebar 依据传入的 workflows 与 activeWorkflowId 渲染列表、数量和选中状态；点击按钮后通过事件把 create/select 意图回传给 App.vue。
7. CreateWorkflowDialog 在组件内部维护输入草稿；当对话框关闭时重置草稿，保存时发出 create 事件并关闭对话框。
8. useWorkflowStudio.createWorkflow 委托 workflow store 生成新的 WorkflowRecord，并在成功创建后切回 workflow 面板、关闭对话框和节点 Drawer；activateWorkflow 委托 workflow store 切换 activeWorkflowId，即使从 Skills 面板选择当前 workflow，也会回到 workflow 面板并清理节点编辑态。
9. WorkflowCanvasPanel 接收 activeWorkflow，并把 nodes 与 edges 传给 Vue Flow 渲染；点击节点时向上 emit nodeClick，当没有活动 workflow 时显示空状态。
10. WorkflowSidebar 的 Skills 入口调用 useWorkflowStudio.openSkillsPanel，右侧主区域从 WorkflowCanvasPanel 切换为 SkillsPanel，并关闭当前节点 Drawer。
11. WorkflowSidebar 的 Tasks 入口调用 useWorkflowStudio.openTasksPanel，右侧主区域从 WorkflowCanvasPanel 或 SkillsPanel 切换为 TasksPanel，并关闭当前节点 Drawer。
12. ThemeModeToggle 位于 WorkflowSidebar 的品牌区，点击后通过 useColorMode 在 light/dark 之间切换，并同步 localStorage 与 document root。
13. SkillsPanel 接收全局 skillCatalog 与 Pinia store 中的 addedSkillIds，按 macro/node 分组渲染卡片；卡片 Switch 只发出 toggleSkill 意图，实际添加状态由 Pinia skills store 更新。
14. TasksPanel 通过 `window.showDirectoryPicker()` 读取所选目录的 `.git/config`；在不支持该 API 的浏览器中，它回退到隐藏的 `webkitdirectory` 文件输入并从选中文件中寻找 `.git/config`。
15. TasksPanel 把解析出的 GitHub repository 交给 useGithubTasksStore；store 保存 selected repository 和 PAT，并在 repository 或 token 变化后刷新 issue 列表。
16. fetchGithubIssues 调用 GitHub REST API 的 open issues endpoint，必要时带上 bearer token；401、403 和 404 会映射为 auth 错误，使 TasksPanel 展示认证提示。
17. useWorkflowStudio.openNodeDrawer 先确认节点属于当前活动 workflow，再只记录 selectedNodeId；WorkflowNodeDrawer 接收派生后的 selectedNode、open 状态与 addedNodeSkills，保存时 trim 输入并通过 saveSelectedNode 回写节点标签与可选 node skill，关闭时清空节点编辑态。

当前仓库级验证流如下：

1. tests/logic/workflow-state.test.ts 校验 workflow 状态变换的纯函数契约。
2. tests/logic/skills.test.ts 校验 `.github/skills` catalog 载入、frontmatter 解析、macro/node 分类与 added node skill 过滤。
3. tests/logic/skills-store.test.ts 校验 Pinia skills store 的添加状态、未知 skill 防护与 added node skills 派生。
4. tests/logic/workflow-store.test.ts 校验 Pinia workflow store 与 useWorkflow 门面的 workflow 创建、活动项派生和节点更新契约。
5. tests/logic/color-mode.test.ts 校验颜色模式从 localStorage 初始化、切换持久化，以及 Sidebar 品牌区按钮的图标和 aria label。
6. tests/logic/github.test.ts 校验 GitHub remote 解析、`.git/config` repository 选择、issue normalization、pull request 过滤和 GitHub tasks storage helpers。
7. tests/logic/github-tasks-store.test.ts 校验 GitHub tasks store 的 repository/token restore、public issue fetch、authenticated fetch、empty state、auth error 和 stale request 防护。
8. tests/logic/workflow-studio.test.ts 校验页面级 composable 的全局面板、Tasks 面板、Pinia skill 添加状态、从 Skills 面板回到 workflow 面板，以及节点 skill 保存规则。
9. tests/logic/workflow-ui.test.ts 用 Vue Test Utils 校验 SkillsPanel、TasksPanel、Sidebar、App 与 Drawer 的组件级接线。
10. tests/ui/workflow-sidebar.spec.ts 校验创建 workflow、切换活动画布、节点 Drawer 改名、added node skill select、从 Skills 面板选择 workflow 回到画布，以及 skill 卡片文本 containment 等关键交互。

当前仍不存在的运行时数据流：

1. 非 GitHub issues 的通用业务 API 调用链路。
2. workflow 业务数据的本地或远程持久化。
3. 服务端下发 workflow 定义。
4. 画布编辑结果的序列化保存。
5. workflow 执行、调度或 artifact 消费链路。

