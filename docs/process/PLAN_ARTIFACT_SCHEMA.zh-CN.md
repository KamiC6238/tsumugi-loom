# Plan Artifact Schema

状态：当前开发流程规范

## 1. 目的

PlanArtifact 用于把用户的自然语言需求转换成 Coding 阶段可消费的结构化契约。

在当前仓库里，它由两部分组成：

1. plan.md
   面向人类阅读和交接。
2. plan.json
   面向机器校验，必须符合 `docs/process/plan-artifact.schema.json`。

它的目标不是复述聊天记录，而是完成以下工作：

1. 提炼目标。
2. 划定范围。
3. 抽取约束。
4. 暴露假设和待澄清问题。
5. 生成任务拆分和验收标准。
6. 为 Coding、Test、Review 和 Docs Reconciler 提供稳定输入。

## 2. 输出状态

PlanArtifact 必须显式写出 `Plan Status`，只允许两个值：

1. `ready`
   信息足够，可以进入 Coding。
2. `needs_clarification`
   存在阻塞性缺口，必须先补澄清，不应直接进入 Coding。

## 3. 必填字段

### 3.1 Source User Request

作用：概括用户原始需求、背景和预期结果。

要求：

1. 保留原始意图。
2. 去掉聊天噪音。
3. 不直接复制整段对话。

### 3.2 Problem

作用：说明这次开发回合真正要解决的问题。

要求：

1. 明确当前缺口。
2. 明确为什么要做。

### 3.3 Scope

作用：定义本次回合包含的内容。

要求：

1. 尽量可执行。
2. 避免空泛描述。

### 3.4 Out of Scope

作用：明确本次不做什么，防止 Coding 阶段扩散。

### 3.5 Constraints

作用：记录必须遵守的边界。

典型来源：

1. 已有架构约束。
2. 项目约定。
3. 用户明确限制。
4. 依赖或环境限制。

### 3.6 Assumptions

作用：显式记录 plan 赖以成立但尚未完全验证的前提。

要求：

1. 不允许隐藏假设。
2. 如果假设影响实现方向，必须写出来。

### 3.7 Open Questions

作用：列出仍待澄清的问题。

规则：

1. 如果问题会阻塞 Coding，`Plan Status` 应为 `needs_clarification`。
2. 如果问题不阻塞，可以继续 `ready`，但要明确说明采用了什么假设。

### 3.8 Task Breakdown

作用：把工作拆成 Coding 可直接消费的步骤。

要求：

1. 使用动作导向描述。
2. 尽量控制在 3 到 7 个主要任务。
3. 每项任务都应与 Scope 直接相关。

### 3.9 Acceptance Criteria

作用：定义完成条件。

要求：

1. 必须可观察、可验证。
2. 避免“看起来更好”这类模糊描述。

### 3.10 Test Strategy

作用：明确至少会如何验证这次改动。

### 3.11 Docs Impact

作用：说明这次改动可能影响哪些文档层。

典型归属：

1. ARCHITECTURE
2. CONVENTIONS
3. DOMAIN
4. DECISIONS
5. generated run knowledge

### 3.12 Relevant Knowledge Base Slices

作用：列出计划编写时应读取的知识切片。

### 3.13 Handoff Notes for Coding

作用：给 Coding 阶段明确交接边界。

要求：

1. 告诉 Coding 应优先执行什么。
2. 明确不要越过哪些范围。

## 4. 准入规则

满足以下条件时，PlanArtifact 才应进入 Coding：

1. `Plan Status` 为 `ready`。
2. 必填字段齐全。
3. Scope 和 Out of Scope 清晰可分。
4. Task Breakdown 可执行。
5. Acceptance Criteria 和 Test Strategy 可用于验证。

## 5. 写作规则

1. 不把用户原始聊天直接传给 Coding。
2. 不隐藏关键假设。
3. 不把待澄清问题伪装成既定事实。
4. 不在 Plan 里混入低层实现日志。
5. 优先使用项目 knowledge base 中已确认的事实。

## 6. 推荐生成方式

当前仓库推荐通过 workspace skill `.github/skills/plan-writer/SKILL.md` 生成 PlanArtifact，再由 workflow scaffold 提供统一模板。

如果 `Plan Status` 为 `needs_clarification`，还必须同时维护 clarification.md，直到阻塞问题被解决或明确记录为不阻塞。