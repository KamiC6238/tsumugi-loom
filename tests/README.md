# Tests

测试目录分为两类：

1. tests/logic/
   放 Vitest 逻辑测试。
2. tests/ui/
   放 Playwright UI 交互测试。

当前约定：

1. 逻辑代码优先写到 Vitest。
2. UI 交互优先写到 Playwright。
3. Coding 阶段按选择性 TDD 生成高价值测试或替代验证记录。
4. Testing 阶段运行 `pnpm test:all`，覆盖当前仓库全部自动化测试。