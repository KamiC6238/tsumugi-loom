# Tests

测试目录分为两类：

1. tests/logic/
   放 Vitest 逻辑测试。
2. tests/ui/
   放 Playwright UI 交互测试。

当前约定：

1. 逻辑代码优先写到 Vitest。
2. UI 交互优先写到 Playwright。
3. 每个 plan step 在 Coding 阶段都应经过 TDD。