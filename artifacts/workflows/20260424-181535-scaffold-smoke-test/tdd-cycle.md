# TDD Cycle Artifact

Workflow ID: 20260424-181535-scaffold-smoke-test
Coding Skill: .github/skills/tdd-coding-writer/SKILL.md

## Task Coverage

1. T1 到 T4：覆盖知识库骨架、workflow 目录、CLI 脚本和链路验证。

## Step

### Plan Task

T4 验证链路。

### Test Tool

not_applicable

### RED

先运行 workflow validate，确认在模板未填完或 gate 未满足时流程会被阻止。

### GREEN

补齐 planning artifacts、coding artifacts 和 summary artifacts 后再次运行 validate，使 workflow 可以继续进入 reconcile。

### REFACTOR

整理 workflow 契约、样例文件和文档描述，让 CLI、样例和规范保持一致。

### Status

approved

## Final Checks

1. pnpm loom:workflow:validate -- 20260424-181535-scaffold-smoke-test
2. pnpm loom:workflow:reconcile -- 20260424-181535-scaffold-smoke-test