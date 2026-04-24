# Golden Rules

These are the hard workflow rules for this template.

## 1. One Plan, One Branch

- One execution plan maps to one unique branch.
- Do not split a single plan across multiple branches.
- Use a conventional prefix such as `feat/`, `fix/`, `docs/`, `chore/`, `refactor/`, or `test/`.

## 2. Plan Before Implementation

- Non-trivial work starts with a plan file in `docs/exec-plans/active/`.
- Draft the plan after reading [ARCHITECTURE.md](ARCHITECTURE.md), [FRONTEND.md](FRONTEND.md), and [BACKEND.md](BACKEND.md).

## 3. Strict Red, Green, Refactor

- Every implementation step must contain red, green, and refactor phases.
- Red means a failing test was written and observed.
- Green means the smallest code change made the targeted test pass.
- Refactor means the touched code was improved while tests stayed green.

## 4. Completed Plans Cannot Stay Active

- A plan with all `Progress` items checked must not remain in `docs/exec-plans/active/`.
- Move it to `docs/exec-plans/completed/` before commit.

## 5. Documentation Must Follow Verified Code

- Required durable docs live under `docs/`.
- If docs and implementation disagree, code is the source of truth.
- Update only the durable docs whose verified truth changed in the same branch after the implementation is verified.
- If workflow rules or commit gates change, update `docs/GOLDEN_RULES.md` in the same branch before commit.

## 6. Commits Must Pass Durable Doc Sync

- Before commit, inspect the verified diff and stage the durable docs it requires.
- The pre-commit hook runs `node scripts/check-doc-updates.js` before the other documentation checks.
- If the staged diff is missing required durable docs, the commit must fail.

## 7. Code-Type Skill Must Be Loaded Before Writing Code

- Before writing or editing any code in an implementation step, use [code-type-routing](.github/skills/code-type-routing/SKILL.md) to identify the target directory's code type and load the corresponding skill.
- If no skill exists for the code type, bootstrap a new classification and skill first, then load it.
- Do not start writing code until the code-type skill is active.

## 8. State Must Be Persisted on Interruption

- After each step's refactor phase completes, immediately update `Current State` and `Checkpoint Context` in the plan file before starting the next step.
- Valid phase values are: `not-started`, `red`, `green`, `refactor`, `done`.
- On resume, read the plan file first and follow the `Resume instruction` exactly — do not re-read the whole codebase before checking the checkpoint.
- Skipping a phase transition (e.g., `red` → `refactor`) is forbidden.

## 9. Use context7 For Package Dependencies

- Before writing code that uses any dependency listed in `package.json`, query its latest documentation via the context7 MCP tool.
- Use the documentation returned by context7 as the authoritative reference for API usage, options, and patterns.
- Do not rely on training-time knowledge for dependency APIs. Dependency interfaces change across versions.
- If context7 returns no result for a package, note this explicitly and fall back to the installed version's local documentation or source.