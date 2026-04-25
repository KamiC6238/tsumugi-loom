# TDD Cycle Artifact

Workflow ID: 20260424-000000-homepage-shell
Coding Skill: .github/skills/tdd-coding-writer/SKILL.md

## Task Coverage

1. T1 提炼首页信息模块并渲染页面骨架。

## Step

### Plan Task

T1 提炼首页信息模块并渲染页面骨架。

### Test Tool

playwright

### RED

先写一个 Playwright 测试，验证首页能看到产品定位标题和三个核心原则。运行 `pnpm test:ui` 后，页面因为还没有对应内容而失败。

### GREEN

补上首页信息模块和对应文案，让测试通过。

### REFACTOR

把页面信息块拆成更清晰的结构，并让 Playwright 断言持续聚焦用户可见行为。

### Status

approved

## Final Checks

1. pnpm test:ui
2. reviewer verdict: approved