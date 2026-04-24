<p align="right"><a href="./README.md">English</a> | <strong>中文</strong></p>

# Harness Engineering Template

一个适用于 agent-first 工程工作流的可复用模板，包含 branch-first 规划、严格的 red/green/refactor 执行方式、持久文档同步，以及执行计划卫生自动化。

这个仓库本身就是模板。它提供了 agent 入口、必需的持久文档、仓库级检查、本地 hook 自动化，以及文档工作流的回归测试。

## 仓库结构

- `AGENTS.md`：agent 和贡献者的统一入口。
- `docs/`：必需的持久文档和执行计划模板。
- `.github/skills/`：可复用的工作流技能，例如 branch-first planning 和 durable doc routing。
- `.github/hooks/pre-commit`：可选的本地自动化 hook。
- `docs/exec-plans/active/`：进行中的计划文件。
- `docs/exec-plans/completed/`：已归档的计划文件。
- `scripts/`：用于 durable-doc sync、计划迁移、freshness、consistency 和 hook 安装的脚本。
- `scripts/check-doc-updates.config.js`：仓库本地的代码路径到文档路径路由规则。
- `tests/`：覆盖 durable-doc guard 和 pre-commit 工作流的回归测试。

## 采用这个模板

1. 将这个模板复制到你的仓库中。
2. 用项目特定的值替换占位符。
3. 从 `AGENTS.md` 开始，然后在开始实现前补全 `docs/ARCHITECTURE.md`、`docs/FRONTEND.md`、`docs/BACKEND.md`，以及 `docs/PLAN.md` 中的占位符。
4. 扩展 `scripts/check-doc-updates.config.js`，让真实的前端、后端和架构路径都能映射到各自负责的持久文档。
5. 用 `bash scripts/install-git-hooks.sh` 安装可选 hook。
6. 运行仓库检查：

```bash
node --test tests/*.test.js
node scripts/check-doc-updates.js
node scripts/migrate-completed-plans.js
node scripts/check-docs-freshness.js
node scripts/check-docs-consistency.js
```

## 工作流摘要

1. 从 `AGENTS.md` 开始，阅读 `docs/ARCHITECTURE.md`、`docs/GOLDEN_RULES.md`、`docs/PLAN.md` 以及当前任务需要的领域文档。
2. 对于非琐碎工作，从集成分支开始，创建一个唯一的任务分支，并在 `docs/exec-plans/active/` 中创建一个计划文件。
3. 用显式的 red、green、refactor 阶段执行每一个实现步骤。
4. 将已验证的代码视为事实来源，只更新那些真值发生变化的持久文档。
5. 提交前，根据已验证 diff 和 `scripts/check-doc-updates.config.js` 暂存所需的持久文档。
6. 运行 durable-doc sync，将已完成计划从 `active/` 迁移到 `completed/`，执行文档检查，然后再提交、推送并创建 pull request。

## 仓库保证

- `node scripts/check-doc-updates.js` 会在暂存变更需要但未包含持久文档时失败，并采用 fail-closed 模式。
- `node scripts/migrate-completed-plans.js` 会把已完全完成的计划移出 `docs/exec-plans/active/`。
- `node scripts/check-docs-freshness.js` 会校验必需文件、非空内容、内部链接以及 active 计划目录卫生。
- `node scripts/check-docs-consistency.js` 会强制检查计划结构、分支命名、分支唯一性，以及显式的 red/green/refactor 阶段。
- `.github/hooks/pre-commit` 会先运行 durable-doc guard，再执行计划迁移和其他文档检查。
- `node --test tests/*.test.js` 覆盖 durable-doc routing 逻辑和 pre-commit 工作流。

## 占位符说明

| 占位符 | 含义 | 示例 |
| --- | --- | --- |
| `{{PROJECT_NAME}}` | 仓库名称 | `widget-platform` |
| `{{PROJECT_DESCRIPTION}}` | 项目一句话描述 | `A service for managing widgets` |
| `{{MAIN_BRANCH}}` | 默认集成分支 | `main` |
| `{{FRONTEND_TEST_COMMAND}}` | 前端测试命令 | `pnpm test:web` |
| `{{BACKEND_TEST_COMMAND}}` | 后端测试命令 | `pnpm test:api` |
| `{{LINT_COMMAND}}` | Lint 命令 | `pnpm lint` |
| `{{TYPECHECK_COMMAND}}` | Typecheck 命令 | `pnpm typecheck` |
| `{{BUILD_COMMAND}}` | Build 命令 | `pnpm build` |

## 验证命令

```bash
node --test tests/*.test.js
node scripts/check-doc-updates.js
node scripts/migrate-completed-plans.js
node scripts/check-docs-freshness.js
node scripts/check-docs-consistency.js
```

当这个模板被采纳到具体仓库后，补充该项目真实存在的验证命令，而不是机械保留 test、lint、typecheck 这一组名字。
如果仓库没有单独的 test、lint、typecheck、前端测试或后端测试命令，就删除或替换这些占位符，并明确写出实际使用的检查方式。
这些检查可以是单元测试、集成测试、smoke test、脚本自检或构建验证，取决于项目本身的验证面。
持续维护 `scripts/check-doc-updates.config.js`，这样 pre-commit guard 才知道哪些代码区域要求哪些持久文档。
如果 guard 失败，它会同时报告缺失的持久文档，以及触发这些要求的变更文件。