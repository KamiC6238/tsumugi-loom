# Project Operations

This file describes the end-to-end workflow encoded by the template.

## Standard Flow

1. Start from `{{MAIN_BRANCH}}`.
2. Create one unique branch for one plan.
3. Read [ARCHITECTURE.md](ARCHITECTURE.md), [FRONTEND.md](FRONTEND.md), [BACKEND.md](BACKEND.md), and [PLAN.md](PLAN.md).
4. Draft the plan in [exec-plans/active/README.md](exec-plans/active/README.md).
5. Before writing code, use [code-type-routing](../.github/skills/code-type-routing/SKILL.md) to load the correct code-type skill for every affected directory. If no skill exists yet, bootstrap it first.
6. Before writing code that uses a `package.json` dependency, query its latest documentation via the context7 MCP tool and use the returned docs as the authoritative API reference.
7. Implement step by step using strict red, green, and refactor.
8. Inspect the verified diff and update only the durable docs whose truth changed, using `scripts/check-doc-updates.config.js` to map code paths to the right docs and including [GOLDEN_RULES.md](GOLDEN_RULES.md) when workflow rules or commit gates change.
9. Run durable doc sync, plan migration, and repository checks.
10. Commit on the same branch.
11. Push the branch.
12. Create a pull request.

## Branch Rules

- Use a conventional prefix such as `feat/`, `fix/`, `docs/`, `chore/`, `refactor/`, or `test/`.
- Do not create more than one branch for the same plan.

## Plan Rules

- Active plans live in `docs/exec-plans/active/`.
- Completed plans live in `docs/exec-plans/completed/`.
- Use [completed/README.md](exec-plans/completed/README.md) as the archive index.
- Every step must include observable red, green, and refactor phases.

## Commit Gate

- Stage the verified code diff together with every durable doc it requires.
- The installed pre-commit hook runs `node scripts/check-doc-updates.js` before plan migration and the other documentation checks.
- Keep `scripts/check-doc-updates.config.js` aligned with the real frontend, backend, and architecture surfaces in the repository.
- If `scripts/check-doc-updates.config.js` is malformed, fix it before commit; the guard fails closed.
- Use the guard output to see which changed files triggered each missing durable doc requirement.
- If required durable docs are missing from the staged diff, the commit is blocked.

## Conflict Resolution

If documentation and implementation conflict, treat the implementation as authoritative after it is verified. Update docs in the same branch before commit.