---
name: git-commit-push
description: 'Analyze current git changes, derive a typed commit message, classify it as feat/bugfix/chore/refactor/style/docs/types/test/build/ci/perf/revert, create a non-interactive commit, and push safely. Use for git commit, commit message generation, push code, or finishing a change set.'
argument-hint: '可选：补充变更意图、提交范围、或目标 remote/branch，例如 "origin main" 或 "只提交 .github/skills/git-commit-push"'
user-invocable: true
---

# Git Commit & Push

## When to Use

在以下场景使用这个 skill：

1. 当前改动已经准备提交，需要代理自动分析 diff 并生成 commit message。
2. 需要把提交类型规范到 `feat`、`bugfix`、`chore`、`refactor`、`style`、`docs`、`types` 等前缀。
3. 需要用非交互方式完成 `git commit` 和 `git push`。
4. 需要在 scope、summary 或 push 目标不明确时，让代理先消解歧义再继续。

## What This Skill Does

这个 skill 负责：

1. 读取当前分支、remote、staged/unstaged 状态和差异摘要。
2. 判断当前工作区是否是一个单一、可提交的 change set。
3. 依据 diff 的主导变更提炼 `<type>(<scope>): <summary>` 形式的 commit message。
4. 在范围清晰时完成非交互式 commit。
5. 把当前分支推送到已配置 upstream，或在 remote 唯一且明确时设置 upstream 后推送。
6. 在存在风险时停止并说明原因，而不是盲目提交或推送。

## Inputs

slash command 参数可以包含以下任一信息：

1. 补充业务上下文，例如“这是为 sidebar 新增键盘导航”。
2. 提交范围，例如“只提交 src/components/workflow-studio”。
3. 目标 remote/branch，例如 `origin main` 或 `origin feature/git-commit-push`。

如果参数为空，则基于当前 git 状态和 diff 自动判断。

## Commit Message Contract

提交信息默认使用：

`<type>(<scope>): <summary>`

要求如下：

1. `type` 必须从 [commit message taxonomy](./references/commit-message-taxonomy.md) 选择。
2. `scope` 可选；只有在能明确映射到单一模块、目录或功能面时才写。
3. `summary` 用英文、祈使式、简短描述净效果，而不是实现细节。
4. `summary` 尽量不超过 72 个字符，不以句号结尾，不使用 `wip`、`update stuff`、`clean` 这类空泛词。
5. 如果 diff 同时包含多类改动，选择主导类型；不要在一个 commit message 中组合多个 type。
6. 本仓库优先使用 `bugfix` 而不是 `fix`，以保持当前 taxonomy 一致。

## Procedure

1. 先收集最小 git 上下文：
   1. `git status --short`
   2. `git branch --show-current`
   3. `git remote -v`
   4. `git diff --cached --stat`
   5. `git diff --stat`
2. 判断提交边界：
   1. 如果已经有 staged 改动，默认以 staged 集合为本次提交边界。
   2. 如果 staged 为空，且工作区改动明显属于同一个 change set，可以再对目标文件执行 `git add`。
   3. 如果改动看起来包含多个无关主题，先停止并要求用户指定路径或拆分 commit。
3. 读取 staged diff；如果没有 staged diff，再读取待提交的 working tree diff，并根据 [commit message taxonomy](./references/commit-message-taxonomy.md) 选择 type、scope 和 summary。
4. 生成 commit message 后，做一次自检：
   1. type 是否准确反映主导变更。
   2. scope 是否具体且必要。
   3. summary 是否描述结果而非过程。
   4. 是否避免了空泛词和尾部句号。
5. 只有在提交边界清晰时才执行 commit。使用非交互命令：
   1. `git commit -m "<message>"`
6. 处理 push：
   1. 如果当前分支已有 upstream，优先直接执行 `git push`。
   2. 如果没有 upstream 且 remote 唯一明确，执行 `git push --set-upstream <remote> <branch>`。
   3. 如果用户显式给出 remote/branch，按用户输入执行。
   4. 如果目标是 `main` 或 `master` 且用户没有明确要求直接推送该分支，先确认一次。
7. push 完成后，用 `git status -sb` 做收尾检查，并向用户报告：
   1. 使用的 commit message。
   2. 推送到的 remote/branch。
   3. 是否仍有未提交改动。
   4. push 是否成功。

## Safety Rules

1. 不要使用交互式 git 命令。
2. 不要使用 `--amend`，除非用户明确要求。
3. 不要使用 `--force` 或 `--force-with-lease`，除非用户明确要求。
4. 如果 push 失败于 non-fast-forward、权限、hook 或受保护分支，停止并把原因返回给用户，不要自动 rebase、merge 或改写历史。
5. 如果 diff 中出现明显不应提交的内容，例如凭据、意外的大型生成物或无关文件，先指出风险再继续。
6. 如果当前工作树为空，或没有任何可提交内容，明确告诉用户而不是生成空 commit。

## Output Contract

完成后，返回给用户的结果至少包含：

1. 最终采用的 commit message。
2. 提交涉及的主要文件或模块摘要。
3. push 目标。
4. 若未执行 commit 或 push，明确阻塞点。

## Examples

1. `/git-commit-push`
2. `/git-commit-push 只提交 .github/skills/git-commit-push`
3. `/git-commit-push origin feature/git-commit-push`
4. `/git-commit-push This change only updates TypeScript types for workflow studio`

## References

1. [commit message taxonomy](./references/commit-message-taxonomy.md)