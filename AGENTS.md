# Agent Guide

Use this file as the short entry point into the repository.

## Start Here

- Architecture map: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Hard workflow rules: [docs/GOLDEN_RULES.md](docs/GOLDEN_RULES.md)
- Plan template and lifecycle: [docs/PLAN.md](docs/PLAN.md)

## Required Documentation

- Frontend conventions: [docs/FRONTEND.md](docs/FRONTEND.md)
- Backend conventions: [docs/BACKEND.md](docs/BACKEND.md)
- Quality expectations: [docs/QUALITY.md](docs/QUALITY.md)
- Validation and automation: [docs/CODE_QUALITY.md](docs/CODE_QUALITY.md)
- Project operations: [docs/PROJECT_OPERATIONS.md](docs/PROJECT_OPERATIONS.md)

## Available Skills

- Write or draft a new plan: [.github/skills/execution-planning/SKILL.md](.github/skills/execution-planning/SKILL.md)
- Create a unique task branch before planning: [.github/skills/branch-first-workflow/SKILL.md](.github/skills/branch-first-workflow/SKILL.md)
- Update an existing plan before more implementation: [.github/skills/plan-management/SKILL.md](.github/skills/plan-management/SKILL.md)
- Route durable doc updates from the verified diff: [.github/skills/doc-update-routing/SKILL.md](.github/skills/doc-update-routing/SKILL.md)
- Identify code type and load (or bootstrap) the matching skill: [.github/skills/code-type-routing/SKILL.md](.github/skills/code-type-routing/SKILL.md)

## Workflow Rules

1. One plan maps to one unique branch.
2. Branch names use a conventional prefix such as `feat/`, `fix/`, `docs/`, `chore/`, `refactor/`, or `test/`.
3. Plan files live in `docs/exec-plans/active/` while work is in progress.
4. Completed plan files must be moved to `docs/exec-plans/completed/` before commit.
5. Every implementation step must explicitly contain red, green, and refactor phases.
6. If docs conflict with implementation, treat code as the source of truth and update docs to match.

## Commands

```bash
node scripts/migrate-completed-plans.js
node scripts/check-docs-freshness.js
node scripts/check-docs-consistency.js
bash scripts/install-git-hooks.sh
```