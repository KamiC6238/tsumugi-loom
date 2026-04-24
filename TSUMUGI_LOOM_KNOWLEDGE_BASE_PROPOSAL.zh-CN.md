# Tsumugi Loom Knowledge Base 方案

状态：中文 review 稿

## 1. 目标

Knowledge base 是 Loom 面向目标项目的长期共享知识层。

它的目的不是替代节点之间的 artifact，也不是让节点共享会话上下文，而是为所有节点提供一套可持续积累、可检索、可治理的项目事实来源。

Knowledge base 主要解决以下问题：

1. 减少每个节点重复理解项目背景的成本。
2. 把一次次 workflow 的有效结论沉淀下来。
3. 为 plan、coding、review、docs 等节点提供稳定的项目上下文。
4. 让系统随着运行逐步变强，而不是每次都从零开始。

## 2. 基本原则

Knowledge base 方案应遵守以下原则：

1. 节点不共享 session context。
2. 节点之间只通过 artifact 协作。
3. 项目长期事实通过 knowledge base 共享。
4. 不是所有节点都能直接改写 canonical docs。
5. 文档更新应当是增量修正，而不是频繁整篇重写。
6. 每一条进入知识库的信息都应尽量可追溯。

## 3. 三层记忆模型

建议把系统中的“记忆”明确拆成三层：

1. Session memory
   仅属于单个节点运行实例，生命周期通常只覆盖本次节点执行。
2. Artifact memory
   由节点显式产出并传递给其他节点，是 workflow 内的正式协作介质。
3. Project knowledge base
   面向整个项目长期存在，跨 workflow 持久保存，供多个节点重复读取。

这三层不能混用。尤其不能把 session context 伪装成 knowledge base，也不能让 artifact 和长期文档互相污染边界。

## 4. 文档分层

建议把 knowledge base 至少拆成以下几层文档，而不是只依赖一个 ARCHITECTURE。

### 4.1 ARCHITECTURE

用途：记录高层稳定结构。

应该包含：

1. 系统边界
2. 核心模块和职责
3. 关键数据流
4. 主要集成点
5. 长期有效的技术约束

不应该包含：

1. 某次具体需求的临时实现细节
2. 低层函数改动清单
3. 单次运行的调试过程
4. 频繁变动的局部结论

### 4.2 CONVENTIONS

用途：记录项目约定和工程规则。

建议包含：

1. 代码组织规则
2. 命名约定
3. 测试要求
4. 代码审查约束
5. 外部依赖使用边界

### 4.3 DOMAIN / PRODUCT DOCS

用途：记录业务和产品知识。

建议包含：

1. 领域实体
2. 核心术语
3. 业务规则
4. 关键用户流程
5. 外部系统约束

### 4.4 DECISIONS / ADRS

用途：记录关键决策及其原因。

建议包含：

1. 背景
2. 备选方案
3. 最终决策
4. 取舍理由
5. 影响范围

### 4.5 GENERATED RUN KNOWLEDGE

用途：承接每次 workflow 运行后产生的中间知识和观察。

建议包含：

1. 本次运行摘要
2. 关键 artifacts 索引
3. Knowledge delta
4. 待确认结论
5. 可能进入 canonical docs 的候选项

## 5. 文档写入权限模型

建议采用分层写权限，而不是所有节点都能写所有文档。

### 5.1 默认只读节点

以下节点默认只读 knowledge base：

1. Plan
2. Coding
3. Test
4. Review

这些节点可以读取相关知识切片，但不直接修改 canonical docs。

### 5.2 受限写入节点

建议引入专门的文档协调节点，例如：

1. Docs Reconciler
2. Knowledge Curator

只有这类节点可以对 canonical docs 发起增量更新。

### 5.3 人工确认点

对于高价值文档，建议保留人工 review 机制，尤其包括：

1. ARCHITECTURE
2. 核心 CONVENTIONS
3. 重要 ADR
4. 高风险 DOMAIN 规则

## 6. 标准更新流程

推荐的 workflow 结束后更新流程如下：

1. 各执行节点完成任务并产出 artifacts。
2. 系统生成 Knowledge Delta artifact。
3. Docs Reconciler 节点读取：
   1. 本次 workflow artifacts
   2. 现有知识库相关切片
   3. 项目级规则
4. Docs Reconciler 判断每条 delta 的归属：
   1. 更新 ARCHITECTURE
   2. 更新 CONVENTIONS
   3. 更新 DOMAIN docs
   4. 追加 ADR
   5. 仅保留在 generated run knowledge 中
5. 输出文档更新结果和变更摘要。
6. 需要时进入人工 review。

## 7. Knowledge Delta 结构建议

Knowledge Delta artifact 可以先设计成统一结构，便于 reconciliation。

建议字段：

1. sourceWorkflowId
2. sourceNodeIds
3. timestamp
4. candidateFacts
5. affectedAreas
6. confidence
7. evidence
8. recommendedTargets
9. reviewRequired

其中 candidateFacts 至少应包含：

1. fact
2. type
3. rationale
4. supportingArtifacts
5. freshness

## 8. 检索策略

Knowledge base 应采用按节点检索，而不是整库注入。

推荐策略：

1. Plan 节点
   读取 ARCHITECTURE 摘要、项目规则、领域术语。
2. Coding 节点
   读取 plan artifact、相关模块说明、代码约束。
3. Test 节点
   读取测试规范、相关模块风险点、已有失败模式。
4. Review 节点
   读取变更摘要、审查规则、相关 ADR。
5. Docs Reconciler 节点
   读取完整 workflow artifacts，以及所有潜在受影响的文档切片。

## 9. 质量治理

如果 knowledge base 允许模型持续写入，就必须有治理策略，否则一定会漂移。

建议至少具备以下治理规则：

1. 每条知识尽量保留来源。
2. 高价值文档尽量要求最小修改。
3. 每条重要知识最好带 last verified 或 freshness 信息。
4. 低置信内容先进入 generated 区域，不直接进入 canonical docs。
5. 旧知识应支持标记过时，而不是永远累积。

## 10. 推荐目录形态

一个较清晰的 knowledge base 目录可以是：

1. ARCHITECTURE.md
2. docs/conventions/
3. docs/domain/
4. docs/decisions/
5. docs/generated/run-knowledge/

如果项目比较小，也可以先压缩成：

1. ARCHITECTURE.md
2. docs/CONVENTIONS.md
3. docs/DOMAIN.md
4. docs/DECISIONS/
5. docs/generated/run-knowledge/

## 11. MVP 建议

knowledge base 的第一版不宜做得太重，建议先实现：

1. 一个稳定的 ARCHITECTURE 文档
2. 一个 CONVENTIONS 文档
3. 一个 generated run knowledge 区域
4. 一个 Knowledge Delta artifact
5. 一个 Docs Reconciler 节点
6. 一个最小的人工 review 流程

这样可以先验证三个核心假设：

1. 知识沉淀是否真的能提升后续节点表现
2. Docs Reconciler 是否能稳定做增量更新
3. 文档分层是否足以避免 ARCHITECTURE 膨胀

## 12. 待确认问题

这个方案目前还需要继续细化以下问题：

1. 第一版 canonical docs 的最小集合是什么？
2. 哪些事实允许自动写入，哪些必须人工确认？
3. Knowledge Delta 的 schema 应该多严格？
4. 如何处理并发 workflow 对同一文档的写入冲突？
5. 是否需要为 knowledge base 单独设计 freshness 和 trust scoring？