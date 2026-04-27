# TDD Cycle Artifact

Workflow ID: 20260424-000000-homepage-shell
Coding Skill: .github/skills/tdd-coding-writer/SKILL.md

## Task Coverage

1. T1 提炼 workflow 名称归一化与创建规则。

## Step

### Plan Task

T1 提炼 workflow 名称归一化与创建规则。

### Test Tool

vitest

### Test Value Decision

workflow 名称 trim、空值拦截和 active workflow 选择属于核心状态规则，会被创建、切换和展示流程重复依赖，适合用 Vitest 直接覆盖输入、输出与失败路径。

### RED

先写一个 Vitest 逻辑测试，验证空白名称不会创建 workflow，合法名称会在 trim 后写入状态并自动设为 active workflow。运行 `pnpm test:logic` 后，新增断言因为创建规则尚未完整实现而失败。

### GREEN

补上 workflow 名称归一化与 active workflow 选择逻辑，让新增断言通过。

### REFACTOR

抽出 workflow record 构造细节，并保持 Vitest 断言继续聚焦状态输入输出与派生结果。

### Status

approved

## Final Checks

1. pnpm test:logic
2. reviewer verdict: approved