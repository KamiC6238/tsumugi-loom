# Quality Standards

Use this file to define the project-specific validation commands once the template is adopted.

## Minimum Checks

The template starts with these repository-level checks:

```bash
node scripts/check-doc-updates.js
node scripts/migrate-completed-plans.js
node scripts/check-docs-freshness.js
node scripts/check-docs-consistency.js
```

Define project-specific frontend, backend, and architecture routes in `scripts/check-doc-updates.config.js` once this template is adopted in a concrete codebase.
Keep that file valid; malformed route configuration blocks commit because the guard fails closed.

## Project-Specific Checks To Add

Add the concrete commands for:

- Linting
- Typechecking
- Frontend tests
- Backend tests
- Build verification

## Commit Gate

Before commit and push, run:

1. Stage the task diff and update any required durable docs according to `scripts/check-doc-updates.config.js`.
2. Durable doc sync checks.
3. Plan migration.
4. Documentation freshness checks.
5. Documentation consistency checks.
6. Project-specific test, lint, typecheck, and build commands.

Keep this file current so the repository advertises the real verification surface.