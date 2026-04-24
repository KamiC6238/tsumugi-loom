# Clarification Artifact

状态：当前开发流程规范

## 1. 目的

clarification.md 用于承接 Plan 阶段中尚未解决的关键问题，避免把模糊需求直接推进到 Coding。

它的作用是：

1. 显式记录当前是否还需要澄清。
2. 收纳阻塞性问题。
3. 说明下一步动作。
4. 记录问题解决后的结论。

## 2. 状态

clarification.md 必须显式写出 `Clarification Status`，只允许三个值：

1. `not_needed`
   当前没有阻塞性澄清问题。
2. `open`
   仍存在阻塞性问题，workflow 不应进入 Coding。
3. `resolved`
   曾存在阻塞性问题，但已被解决并完成记录。

## 3. 必填段落

1. `## Decision`
   说明当前是否可以进入 Coding。
2. `## Blocking Questions`
   记录阻塞性问题；如果没有，也应明确写无阻塞问题。
3. `## Next Action`
   说明下一步是去问用户、更新 plan，还是进入 Coding。
4. `## Resolution Notes`
   记录澄清结果或说明为什么不需要澄清。

## 4. 与 PlanArtifact 的关系

1. 如果 plan.json 的 `planStatus` 是 `needs_clarification`，clarification.md 必须为 `open`。
2. 如果 plan.json 的 `planStatus` 是 `ready`，clarification.md 必须为 `not_needed` 或 `resolved`。
3. clarification.md 不是替代 plan，而是 plan 的门禁附属 artifact。