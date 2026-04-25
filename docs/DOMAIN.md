# DOMAIN

状态：工作定义

## 1. 目标对象

Tsumugi Loom 的目标是把复杂开发任务拆成一组具有明确契约的执行单元，并通过显式 artifacts 和项目级 knowledge base 协作。

## 2. 核心术语

1. Workflow
   一次从计划到实现、验证、review、文档整理的完整开发回合。
2. Node
   一个职责明确的执行步骤。在当前仓库里，它当前映射成开发阶段。
3. Artifact
   节点或阶段的显式输出，例如 plan、code change、test report、review 和 knowledge delta。
4. Knowledge Base
   面向项目长期保留的文档层，包括 architecture、conventions、domain、decisions 和 generated run knowledge。
5. Knowledge Delta
   一次 workflow 对项目知识产生的新增事实、修正事实或待确认观察。
6. Docs Reconciler
   读取 workflow artifacts，判断哪些信息应沉淀为长期知识，哪些只应保留在 generated 区域的步骤。

## 3. 当前仓库中的语义映射

由于当前项目尚未实现真正的节点编排 runtime，本仓库中的概念映射如下：

1. Node = 一个开发阶段或自动化脚本步骤。
2. Artifact = artifacts/workflows 下的文件。
3. Knowledge Base = 仓库内的 canonical docs 和 generated run knowledge。
4. Reconcile = 通过脚本生成 run knowledge，并按 knowledge delta 受控更新 canonical docs。

## 4. 非目标

以下内容当前保留为后续领域方向：

1. 真正的多 agent session 隔离。
2. 节点级模型路由。
3. 自动检索切片注入。
4. 无约束自动写回 canonical docs 的策略引擎。

## 5. Workflow-verified Domain Notes

<!-- BEGIN AUTO-KB:DOMAIN -->
- 当前 MVP 首页以只读四阶段 workflow 画布展示 Plan、Coding、Test 和 Review，并支持节点或侧栏点击查看阶段目标、输出与 review handoff。
  - workflow: 20260425-095256-vue-flow-mvp-five-node-dag-spike
   - freshness: verified-2026-04-25
   - rationale: 首页已经从默认 starter 页面切换为四阶段 workflow 画布，Playwright 主交互测试覆盖了默认选中、节点切换与 review handoff 展示。
  - supportingArtifacts:
    - artifacts/workflows/20260425-095256-vue-flow-mvp-five-node-dag-spike/code-change.md
    - artifacts/workflows/20260425-095256-vue-flow-mvp-five-node-dag-spike/test-report.md
      - artifacts/workflows/20260425-095256-vue-flow-mvp-five-node-dag-spike/review.md
<!-- END AUTO-KB:DOMAIN -->
