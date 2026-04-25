# Commit Message Taxonomy

## Message Format

默认使用：

`<type>(<scope>): <summary>`

其中：

1. `type` 是主导改动类别。
2. `scope` 是可选的模块或功能面，使用 kebab-case。
3. `summary` 用英文、祈使式，描述本次提交带来的净效果。

## Type Selection Order

一个 commit 只选一个 type。若 diff 同时覆盖多类改动，按下面的优先顺序选择第一个匹配项：

1. `revert`: 本次提交的主要目的是回滚已有提交。
2. `bugfix`: 修复用户可感知的问题、回归、错误状态、崩溃、交互异常或错误结果。
3. `feat`: 引入新的能力、流程、交互、状态、接口或自动化结果。
4. `perf`: 在不改变功能范围的前提下，主目标是性能优化。
5. `refactor`: 重构实现、抽取逻辑、整理结构，但预期行为不变。
6. `types`: 仅涉及 TypeScript 类型、接口、泛型、schema 或静态类型约束，且不引入运行时行为变化。
7. `docs`: 仅涉及 README、架构文档、流程文档、注释或知识库。
8. `style`: 仅涉及格式化、空白、命名微调或纯视觉微调；如果视觉改动同时修复问题或引入新状态，应改用 `bugfix` 或 `feat`。
9. `test`: 仅涉及测试代码、测试夹具、断言或测试配置。
10. `build`: 主要涉及依赖、打包、构建工具、锁文件、发布配置或构建脚本。
11. `ci`: 主要涉及 CI/CD workflow、流水线、机器人自动化或仓库校验流程。
12. `chore`: 其他维护性改动，且无法更准确归入以上类型。

## Scope Rules

1. scope 不是必填项，只有在能明确映射到单一模块时才填写。
2. 优先选择最小但仍可理解的功能面，例如 `workflow-studio`、`workflow-sidebar`、`dialog`、`skill`、`docs`、`vite`。
3. 如果改动横跨多个顶层区域且没有自然聚合点，省略 scope，不要写含糊的 `misc`、`general`、`core`。
4. 若测试或文档是围绕某个主模块变化而更新，scope 仍应优先指向主模块，而不是 `tests` 或 `docs`。

## Summary Rules

1. 描述结果，不描述过程。
2. 使用英文祈使式动词开头，例如 `add`、`fix`、`refactor`、`document`、`type`、`tune`、`test`、`build`、`revert`。
3. 尽量控制在 4 到 12 个词，不超过 72 个字符。
4. 不以句号结尾。
5. 不使用空泛摘要，例如 `clean`、`update stuff`、`misc changes`、`wip`。

## Diff Heuristics

1. 增加新的页面行为、组件状态、命令、脚本能力或业务流转时，优先考虑 `feat`。
2. 修复选择态丢失、按钮失效、表单错误、数据计算不正确等问题时，优先考虑 `bugfix`。
3. 抽取函数、重命名内部结构、移动代码但不改变行为时，优先考虑 `refactor`。
4. 只改接口、类型注解、联合类型、泛型参数、schema 定义时，优先考虑 `types`。
5. 只改 README、ARCHITECTURE、workflow artifact 或说明文档时，优先考虑 `docs`。
6. 只改格式化、空格、无语义视觉微调时，优先考虑 `style`。
7. 只改 `*.test.*`、`*.spec.*`、测试夹具或测试帮助函数时，优先考虑 `test`。
8. 改 `package.json`、`pnpm-lock.yaml`、`vite.config.*`、`vitest.config.*`、`tsconfig.*` 或构建脚本，且其本身就是提交主目标时，优先考虑 `build`。
9. 改 `.github/workflows/` 或 CI 自动化脚本，且其本身就是提交主目标时，优先考虑 `ci`。
10. 如果依赖或锁文件只是为某个 feature 或 bugfix 服务，type 仍应使用主导的 `feat` 或 `bugfix`。

## Examples

1. `feat(skill): add automated git commit and push workflow`
2. `bugfix(workflow-sidebar): preserve selection after node rename`
3. `refactor(workflow-studio): extract sidebar action helpers`
4. `types(workflow-studio): tighten dialog payload contracts`
5. `docs(skill): document commit message taxonomy`
6. `style(workflow-sidebar): polish empty state spacing`
7. `test(workflow-studio): cover node selection reducer`
8. `build(vite): align vitest and vite config`
9. `ci(workflows): run ui tests on pull requests`
10. `chore(repo): clean generated workflow artifacts`

## Bad vs Better

1. Bad: `clean`
2. Better: `refactor(skill): split commit message rules by intent`
3. Bad: `update docs`
4. Better: `docs(skill): explain commit type selection order`
5. Bad: `fix types and docs`
6. Better: `types(workflow-studio): narrow sidebar node payloads`