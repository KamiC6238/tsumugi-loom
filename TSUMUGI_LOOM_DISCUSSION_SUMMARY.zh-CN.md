# Tsumugi Loom 讨论总结

状态：中文 review 稿

## 1. 当前想法

Tsumugi Loom 的核心定位是一个基于图的 agent 编排系统。

它不再依赖一个大而全的通用 workflow skill，而是把 workflow 视为一组可连接的节点。每个节点都是一个独立的 agent session，拥有自己的 model、skill、运行策略和预算。

一个典型流程可以是：

1. Plan 节点接收用户需求并输出结构化计划。
2. Coding 节点消费 plan artifact 并执行实现。
3. Test、Review、Docs 等额外节点按需参与。
4. 整个 graph 执行完成后，workflow 结束。

这个设计主要用来解决三个现实问题：

1. 不同任务需要不同的 workflow 形状。
2. 不同模型适合不同节点职责。
3. 昂贵模型应该只用于高价值步骤，廉价模型处理轻量工作。

## 2. 核心模型

当前讨论已经收敛到三个层次：

1. Session context
   每个节点拥有独立 session，不与其他节点共享原始对话上下文。
2. Artifacts
   节点之间只通过显式输入输出协作，例如计划、代码变更、测试结果、review 结论等。
3. Project knowledge base
   所有节点都可以读取同一个项目级长期知识库，但它与 session context 是两回事。

核心原则是：

节点之间不共享会话上下文；节点通过显式 artifact 协作；节点可以读取同一份项目知识库。

## 3. 为什么节点隔离依然成立

关键区别在于“隐式共享上下文”和“显式共享信息”是两种完全不同的机制。

不理想的模型：

1. 节点偷偷依赖共享聊天历史。
2. session 之间存在隐藏 memory 泄漏。
3. 后续节点依赖没有文档化的上下文。

更合理的模型：

1. session 隔离是严格的。
2. 跨节点通信只通过类型化 artifact。
3. 稳定的项目事实沉淀在 project knowledge base 中。

这样系统会更可调试、更可组合，也更不容易被上下文污染。

## 4. 共享项目知识库

共享 knowledge base 是目标项目的长期记忆层。

目前的设想是：

1. 项目接入时，Loom 为项目创建 ARCHITECTURE 和其他知识文档。
2. 每次 workflow 执行完成后，系统更新相关文档。
3. 随着运行次数增加，知识库不断变得更丰富，并提升后续节点表现。

这意味着系统并不是“完全零共享”，而是采用选择性共享：

1. 不共享 session context。
2. 共享项目知识。
3. 只有在边显式定义时才共享 artifact。

## 5. Knowledge base 的边界

ARCHITECTURE 不应该变成一个无限膨胀的杂项收纳箱。

当前讨论更倾向于把 knowledge base 拆成几个文档类别：

1. ARCHITECTURE
   记录高层稳定结构、系统边界、主要模块、数据流和关键约束。
2. Conventions and rules
   记录项目特定的代码放置规则、测试规则、命名规则和集成约束。
3. Domain and product docs
   记录业务概念、领域实体、产品行为和外部集成规则。
4. Decision records
   记录重要技术或产品决策及其原因。
5. Generated run knowledge
   记录按运行生成的总结、delta 和暂时不适合进入 canonical docs 的低置信观察。

指导原则是：

不是每次 workflow 完成都直接重写 ARCHITECTURE，而是先产出 knowledge delta，再把 delta 整理进正确的文档类别。

## 6. 推荐的文档更新流程

当前讨论认为，最稳妥的方式是把“执行实现”和“维护知识库”拆开。

推荐流程：

1. 执行节点完成自己的工作，并输出 artifacts。
2. workflow 生成一个 Knowledge Delta artifact。
3. 一个专门的 reconciliation 步骤判断哪些内容应该进入 canonical docs。
4. 只有这个 reconciliation 步骤可以更新 ARCHITECTURE 这类长期文档。

这个专门节点可以叫：

1. Docs Reconciler
2. Knowledge Curator

它的职责包括：

1. 读取 workflow 输出。
2. 与现有 knowledge base 做比对。
3. 应用最小且精确的文档更新。
4. 维护文档质量和边界。

## 7. 节点设计

每个节点都应该是一个具有明确运行契约的可复用执行单元。

建议的节点定义包含：

1. Goal
2. Input schema
3. Output schema
4. Allowed skills
5. Model policy
6. Tool policy
7. Retry policy
8. Timeout and budget policy

在运行时，每个节点实例应当拥有：

1. 独立 session
2. 独立日志
3. 独立成本统计
4. 独立 artifacts
5. 独立本地执行历史

## 8. Artifact-first 协作

artifact 是节点之间最主要的协作机制。

目前讨论过的 artifact 类型包括：

1. PlanArtifact
2. TaskBreakdownArtifact
3. CodeChangeArtifact
4. TestReportArtifact
5. ReviewArtifact
6. FinalSummaryArtifact
7. KnowledgeDeltaArtifact

artifact-first 这一点非常关键。如果没有稳定的 artifact schema，graph UI 最终只会退化成一个 prompt chaining 的可视化壳子。

## 9. Knowledge base 的检索模型

共享 knowledge base 应当允许所有节点读取，但不应该完整注入到每个节点的 prompt 中。

更合理的方式是按节点做 retrieval：

1. Plan 节点读取需求、架构摘要和关键约束。
2. Coding 节点读取 plan artifact、相关模块知识和项目规范。
3. Review 节点读取变更摘要、测试结果和相关标准。
4. Docs Reconciler 节点读取所有相关 workflow artifacts，以及可能要更新的文档切片。

这样可以让上下文更聚焦，避免把无关知识浪费在 token 上。

## 10. 为什么这个方向是成立的

目前讨论里比较明确的收益有：

1. workflow 形状变成可配置能力，而不是硬编码在一个通用 skill 里。
2. model routing 成为一等能力。
3. 可以根据节点价值优化成本。
4. skill 会更干净，因为它只负责节点内部执行，而不是整条链路的编排。
5. 失败更容易定位，因为输入、输出和边界都是显式的。
6. 系统可以通过项目知识库逐步积累长期能力。

## 11. 主要风险

目前识别出的主要设计风险有：

1. 节点粒度
   节点过大时，系统会退回到单体 agent；节点过小时，graph 会变得脆弱且嘈杂。
2. 缺少 artifact schema
   如果输出不稳定，下游节点就会不稳定。
3. 失败语义太弱
   系统需要明确的 retry、fallback、rollback 和 pause 机制。
4. Knowledge base 漂移
   由模型写出来的文档可能过时、混乱，甚至错误。
5. 隐式共享 memory
   如果节点在 artifact 和 knowledge base 之外偷偷共享 memory，调试复杂度会急剧上升。

## 12. MVP 方向

当前讨论更倾向于先做一个受约束的 MVP，而不是一开始就做全能型 workflow engine。

建议的 MVP 约束：

1. 只支持 DAG 执行。
2. 先支持少量节点类型，例如 Plan、Code、Test、Review 和 Docs Reconciler。
3. 以结构化 artifact 作为节点间接口。
4. 支持按节点选择 model、skill 和预算。
5. 失败策略先限制为 retry、fallback 和 pause。
6. 保留共享 knowledge base，但把它作为一个独立子系统来治理。

## 13. 命名

当前最推荐的名称是 Tsumugi Loom。

原因：

1. Tsumugi 本身就带有“编织”的语义。
2. Loom 很贴合“把独立线程编织成完整 workflow”的意象。
3. 这个名字同时适合产品愿景和 orchestration metaphor。

讨论中还提到过 Tsumugi Fabric、Tsumugi Weave、Tsumugi Mesh，以及一些更偏日式的短名字，但 Tsumugi Loom 是当前最强的候选。

## 14. 暂定设计原则

目前讨论已经指向这些原则：

1. 节点 session 保持隔离。
2. 节点通过显式 artifact 协作。
3. 项目长期事实沉淀到共享 knowledge base。
4. 文档更新通过专门流程处理，而不是任由每个节点随手改写。
5. artifact schema 和 failure semantics 属于核心架构，不是实现细节。

## 15. 仍待明确的问题

下面这些点还需要进一步收敛：

1. 项目接入时究竟要创建哪些文档？
2. 哪些内容属于 ARCHITECTURE，哪些属于其他文档类别？
3. 哪些节点有权写 canonical docs，策略是什么？
4. 第一版可运行 workflow 需要哪些 artifact schema？
5. 第一版 runtime 应该支持哪些 retry 和 fallback 规则？