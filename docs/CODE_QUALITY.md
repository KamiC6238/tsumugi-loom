# Code Quality Enforcement

This template encodes the minimum repository-level automation needed to keep plans and documentation healthy.

## Scripts

### `node scripts/check-doc-updates.js`

- Inspects the staged diff against the repository durable-doc routing rules from `scripts/check-doc-updates.config.js`.
- Fails when the staged change set requires durable doc updates that are not staged.
- Validates `scripts/check-doc-updates.config.js` before enforcement so broken configuration blocks commit instead of weakening the guard.
- Reports the changed files that triggered each missing durable doc requirement.
- Uses `scripts/check-doc-updates.config.js` so adopted repositories can add project-specific frontend, backend, and architecture routes without editing the guard script.

### `node scripts/migrate-completed-plans.js`

- Scans `docs/exec-plans/active/`.
- Detects plans whose `Progress` items are all complete.
- Moves those plans to `docs/exec-plans/completed/`.

### `node scripts/check-docs-freshness.js`

- Verifies required documentation files exist and are non-empty.
- Validates internal markdown links.
- Detects completed plans that are still left in `active/`.

### `node scripts/check-docs-consistency.js`

- Validates that plan files follow [PLAN.md](PLAN.md).
- Enforces branch naming and branch uniqueness across plans.
- Verifies every plan step contains red, green, and refactor phases.

## Optional Hook

Install the local hook with:

```bash
bash scripts/install-git-hooks.sh
```

The pre-commit hook migrates completed plans, stages the moved files, and then runs the documentation checks.
The pre-commit hook first runs `node scripts/check-doc-updates.js`, then migrates completed plans, stages the moved files, and finally runs the documentation freshness and consistency checks.