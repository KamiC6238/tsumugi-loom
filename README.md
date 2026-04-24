<p align="right"><strong>English</strong> | <a href="./README.zh-CN.md">中文</a></p>

# Harness Engineering Template

A reusable template for agent-first engineering workflows with branch-first planning, strict red/green/refactor execution, durable-document sync, and automated execution-plan hygiene.

This repository is the template itself. It includes the agent entrypoint, the required durable docs, repository checks, local hook automation, and regression tests for the documentation workflow.

## Repository Map

- `AGENTS.md` as the entry point for agents and contributors.
- `docs/` for required durable documentation and execution-plan templates.
- `.github/skills/` for reusable workflow skills such as branch-first planning and durable doc routing.
- `.github/hooks/pre-commit` for optional local automation.
- `docs/exec-plans/active/` for in-progress plan files.
- `docs/exec-plans/completed/` for archived plan files.
- `scripts/` for durable-doc sync, plan migration, freshness, consistency, and hook installation.
- `scripts/check-doc-updates.config.js` for repository-local code-to-doc routing rules.
- `tests/` for regression coverage of the durable-doc guard and pre-commit workflow.

## Adopt This Template

1. Copy this template into a repository.
2. Replace placeholders with project-specific values.
3. Start from `AGENTS.md`, then fill in `docs/ARCHITECTURE.md`, `docs/FRONTEND.md`, `docs/BACKEND.md`, and the placeholders in `docs/PLAN.md` before implementation work starts.
4. Extend `scripts/check-doc-updates.config.js` so real frontend, backend, and architecture paths map to the durable docs they own.
5. Install the optional hook with `bash scripts/install-git-hooks.sh`.
6. Run the repository checks:

```bash
node --test tests/*.test.js
node scripts/check-doc-updates.js
node scripts/migrate-completed-plans.js
node scripts/check-docs-freshness.js
node scripts/check-docs-consistency.js
```

## Workflow Summary

1. Start from `AGENTS.md` and read `docs/ARCHITECTURE.md`, `docs/GOLDEN_RULES.md`, `docs/PLAN.md`, and the surface-specific docs you need.
2. For non-trivial work, start from the integration branch, create one unique task branch, and create one plan file in `docs/exec-plans/active/`.
3. Execute every implementation step using explicit red, green, and refactor phases.
4. Treat verified code as the source of truth and update only the durable docs whose truth changed.
5. Before commit, stage the durable docs required by the verified diff and `scripts/check-doc-updates.config.js`.
6. Run durable-doc sync, migrate completed plans from `active/` to `completed/`, run the documentation checks, then commit, push, and open a pull request.

## Repository Guarantees

- `node scripts/check-doc-updates.js` fails closed when staged changes require durable docs that are missing from the commit.
- `node scripts/migrate-completed-plans.js` moves fully completed plans out of `docs/exec-plans/active/`.
- `node scripts/check-docs-freshness.js` validates required files, non-empty content, internal links, and active-plan hygiene.
- `node scripts/check-docs-consistency.js` enforces plan structure, branch naming, branch uniqueness, and explicit red/green/refactor phases.
- `.github/hooks/pre-commit` runs the durable-doc guard before plan migration and the other documentation checks.
- `node --test tests/*.test.js` covers the durable-doc routing logic and the pre-commit workflow.

## Placeholder Reference

| Placeholder | Meaning | Example |
| --- | --- | --- |
| `{{PROJECT_NAME}}` | Repository name | `widget-platform` |
| `{{PROJECT_DESCRIPTION}}` | One-line project summary | `A service for managing widgets` |
| `{{MAIN_BRANCH}}` | Default integration branch | `main` |
| `{{FRONTEND_TEST_COMMAND}}` | Frontend test command | `pnpm test:web` |
| `{{BACKEND_TEST_COMMAND}}` | Backend test command | `pnpm test:api` |
| `{{LINT_COMMAND}}` | Lint command | `pnpm lint` |
| `{{TYPECHECK_COMMAND}}` | Typecheck command | `pnpm typecheck` |
| `{{BUILD_COMMAND}}` | Build command | `pnpm build` |

## Verification Commands

```bash
node --test tests/*.test.js
node scripts/check-doc-updates.js
node scripts/migrate-completed-plans.js
node scripts/check-docs-freshness.js
node scripts/check-docs-consistency.js
```

Add the project-specific validation commands that actually exist once the template is adopted in a concrete codebase.
If the repository does not have separate test, lint, typecheck, frontend, or backend commands, remove or replace those placeholders and document the real checks it does use.
Those checks can be unit tests, integration tests, smoke tests, script validation, or build verification, depending on the project surface.
Keep `scripts/check-doc-updates.config.js` current so the pre-commit guard knows which code surfaces require which durable docs.
If the guard fails, it reports both the required durable docs and the changed files that triggered them.