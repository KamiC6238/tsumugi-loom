# ARCHITECTURE

状态：当前实现基线

## 1. 范围

这个仓库当前是 Tsumugi Loom 的前端探索项目，技术栈为 Vue 3、TypeScript 和 Vite。

它目前承载的是产品概念验证与交互壳层，不包含真正的 graph runtime、节点执行器、artifact 调度器或 knowledge base 服务端实现。

## 2. 当前系统边界

当前代码边界如下：

1. 浏览器端单页应用。
2. Vue 组件树和静态资源。
3. Vite 构建与本地开发工具链。
4. 仓库内的知识库文档和 workflow artifacts。

当前不在实现范围内的内容：

1. 节点级 agent runtime。
2. DAG 调度引擎。
3. 模型路由和预算控制。
4. 远程 artifact 存储。
5. 无约束的自动化 canonical docs 自由改写。

## 3. 代码结构

当前主要模块如下：

1. src/main.ts
   应用入口，挂载 Vue 应用。
2. src/App.vue
   当前页面壳层和顶层组合。
3. src/components/
   页面级或局部组件。
4. public/ 与 src/assets/
   静态资源。
5. docs/
   项目 knowledge base 和流程文档。
6. artifacts/workflows/
   每次开发回合生成的显式 artifacts。
7. scripts/loom/
   驱动 workflow 的本地自动化脚本。

## 4. 当前数据流

当前运行态数据流很简单：

1. Vite 启动开发服务器或构建流程。
2. 浏览器加载 src/main.ts。
3. Vue 挂载 App.vue。
4. App.vue 组合组件并渲染页面。

当前尚不存在：

1. API 调用链路。
2. 持久化状态。
3. 跨节点 artifact 通信。
4. 运行时 knowledge retrieval。

