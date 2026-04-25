# ARCHITECTURE

状态：2026-04-25 当前实现基线

## 1. 范围

这个仓库当前是 Tsumugi Loom 的前端探索项目，技术栈以 Vue 3、TypeScript 和 Vite 为主，并结合 Tailwind CSS 4、shadcn-vue / Reka UI 以及 Vue Flow 搭建交互壳层。

当前实现目标不是执行真实 workflow，而是验证一个“侧边栏管理多个 workflow + 主画布展示当前 workflow”的本地单页应用体验。

当前已经实现的用户可见能力：

1. 在页面内创建具名 workflow。
2. 在侧边栏查看 workflow 列表并切换当前活动 workflow。
3. 为新建 workflow 生成一组本地 seeded 节点与边。
4. 在主区域用 Vue Flow 渲染当前 workflow 的画布。
5. 用 Vitest 和 Playwright 覆盖状态逻辑与关键 UI 交互。

当前不在实现范围内的内容：

1. 节点级 agent runtime。
2. DAG 调度引擎和任务执行器。
3. 模型路由、预算控制与推理编排。
4. 后端 API、远程 artifact 存储与多用户协作。
5. 浏览器运行时内的 knowledge retrieval 或自动知识库文档改写。

## 2. 当前系统边界

当前系统由两个层面组成：浏览器运行时应用，以及仓库内的 workflow 文档与自动化支撑。

浏览器运行时边界如下：

1. 单页 Vue 应用。
2. 基于本地内存的 workflow 状态管理。
3. 侧边栏、对话框和主画布组成的 UI shell。
4. 使用 Vue Flow 的工作流可视化渲染。

仓库支撑边界如下：

1. Vite 构建、本地测试与前端开发工具链。
2. workflow artifacts、knowledge base 文档和本地自动化脚本。

当前系统仍然没有：

1. 服务端状态源。
2. 持久化存储。
3. 实时同步。
4. 跨进程或跨节点的 artifact 通信。

## 3. 运行时架构

当前运行时的主要控制点如下：

1. src/main.ts
   应用入口，加载全局样式并挂载 Vue 应用。
2. src/style.css
   定义全局视觉变量，并引入 Tailwind、shadcn-vue 和 Vue Flow 的基础样式。
3. src/App.vue
   顶层编排组件，负责页面布局、workflow 创建对话框、侧边栏列表、活动 workflow 明细和画布区域。
4. src/lib/workflows.ts
   纯函数状态层，负责创建空状态、追加 workflow、切换活动 workflow 以及解析当前活动 workflow。
5. src/components/ui/
   复用型 UI 原语封装，目前主要承载按钮、输入框、标签和对话框。

当前状态模型的核心约束：

1. workflow 状态保存在 App.vue 的本地内存中。
2. 每次新建 workflow 都会生成固定结构的节点和边。
3. 活动 workflow 由 activeWorkflowId 控制。
4. 画布内容完全来自当前活动 workflow 的 nodes 和 edges。

## 4. 仓库结构与职责

当前仓库里与架构相关的主要目录如下：

1. src/
   前端运行时代码。
2. src/lib/
   与视图解耦的状态与辅助逻辑。
3. src/components/
   页面组件和可复用 UI 组件。
4. tests/logic/
   面向纯状态逻辑的 Vitest 测试。
5. tests/ui/
   面向端到端交互的 Playwright 测试。
6. public/ 与 src/assets/
   静态资源。
7. scripts/loom/
   workflow 脚本自动化入口，负责仓库内 workflow scaffold 与相关流程控制。
8. artifacts/workflows/
   每次开发回合生成的显式 workflow 产物，如 plan、review、test-report 与 knowledge delta。
9. docs/ 与根目录长期维护文档
   项目知识库与长期保留的架构、说明和流程文档。

## 5. 当前数据流

当前浏览器运行时的数据流如下：

1. Vite 启动应用并加载 src/main.ts。
2. src/main.ts 挂载 App.vue，同时引入 src/style.css 提供全局样式层。
3. App.vue 通过 createEmptyWorkflowState 初始化本地 workflowState。
4. 用户在对话框中输入名称后，saveWorkflow 调用 appendWorkflow 生成新的 WorkflowRecord，并将其设为当前活动 workflow。
5. 侧边栏通过 computed 派生值渲染 workflow 列表、数量和选中状态。
6. 主区域通过 getActiveWorkflow 读取活动 workflow，并把 nodes 与 edges 传给 Vue Flow 渲染。
7. 用户点击其他 workflow 时，activateWorkflow 调用 selectWorkflow 切换 activeWorkflowId，主画布随之重渲染。

当前仓库级验证流如下：

1. tests/logic/workflow-state.test.ts 校验 workflow 状态变换的纯函数契约。
2. tests/ui/workflow-sidebar.spec.ts 校验创建 workflow、切换活动画布和空白输入禁用保存等关键交互。

当前仍不存在的运行时数据流：

1. API 调用链路。
2. 本地或远程持久化。
3. 服务端下发 workflow 定义。
4. 画布编辑结果的序列化保存。
5. workflow 执行、调度或 artifact 消费链路。

