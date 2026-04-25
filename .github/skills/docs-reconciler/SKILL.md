---
name: docs-reconciler
description: 'Extract business facts from completed work and update the documentation owned by the matching functional module. Use for docs reconciler, business fact extraction, knowledge base update, architecture update, README update, module docs update, and workflow summary ingestion.'
argument-hint: '已完成的 workflow-id，或当前需要把业务事实提炼并写入对应文档的开发回合'
user-invocable: true
---

# Docs Reconciler

## Purpose

这个 skill 负责从实现、测试、评审和 workflow artifact 中提炼稳定的业务事实，并把这些事实更新到对应职能模块负责的文档。

它关注的是“事实归档到正确位置”，而不是统一堆积到单一文档。

## When to Use

在以下场景使用这个 skill：

1. 一个 workflow 已完成实现与验证，需要把稳定业务事实沉淀到文档。
2. 某次代码变更已经改变了系统行为、产品语义、模块职责或协作方式，需要同步知识库。
3. 需要判断一条事实应该进入哪一个职能模块负责的文档。
4. 需要根据代码、测试和 artifact 生成一份面向长期维护的文档更新。

## What This Skill Produces

它应当：

1. 提炼后的业务事实列表。
2. 每条事实对应的文档归属判断。
3. 更新后的目标文档。
4. 一份清晰的写回结果说明，标明写入了哪些事实、写到了哪里、依据是什么。

## Documentation Ownership Model

文档按职能模块分工承载事实：

1. ARCHITECTURE 记录系统边界、模块职责、跨模块关系和稳定结构。
2. README 记录项目定位、入口说明和高层使用方式。
3. 某个职能模块的专门文档记录该模块的术语、约束、职责和行为。
4. artifacts/workflows/ 记录单次 workflow 的上下文、验证结果和回合内说明。

## Entry Contract

开始前确认：

1. 目标 workflow 或变更范围已经明确。
2. 相关代码、测试和 artifact 可以作为事实依据读取。
3. 待写回内容能够表述为稳定事实，而不是临时讨论或猜测。
4. 目标文档的职责边界可以明确判断。

## Procedure

1. 确定本轮要归档的 workflow、功能或变更切片。
2. 读取相关实现、测试、review 结论和 workflow artifact。
3. 提炼稳定业务事实，保持一条事实只表达一个明确结论。
4. 判断每条事实的归属模块和负责文档。
5. 将事实写入对应文档，保持术语一致、范围清晰。
6. 在回复中总结写回结果，说明事实、目标文档和支撑依据。

## Routing Rules

1. 涉及系统边界、目录职责、核心状态流和跨模块关系的事实，写入 ARCHITECTURE。
2. 涉及项目入口、定位、使用方式和高层说明的事实，写入 README。
3. 涉及某个职能模块内部语义、约束、职责或流程的事实，写入该模块负责的专门文档。
4. 涉及单次 workflow 的执行背景、验证记录和回合说明的内容，写入 artifacts/workflows/ 下的对应产物。

## Delivery Contract

1. 每条写回事实都能在代码、测试或 artifact 中找到依据。
2. 每条事实都进入最匹配的负责文档。
3. 文档更新后的表述与当前实现一致。
4. 用户能够从结果中直接看出事实归属和文档落点。

## References

1. [ARCHITECTURE](../../../ARCHITECTURE.md)
