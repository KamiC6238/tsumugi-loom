# Plan Template

This document defines how execution plans are written and how they move through the repository.

## Required Workflow

1. Create a unique branch before creating the plan.
2. Read [ARCHITECTURE.md](ARCHITECTURE.md), [FRONTEND.md](FRONTEND.md), and [BACKEND.md](BACKEND.md) before writing steps.
3. Create the execution plan under `docs/exec-plans/active/`.
4. Every implementation step must contain explicit red, green, and refactor phases.
5. Update the `Progress` section immediately after completing a step.
6. Update `Current State` and `Checkpoint Context` immediately after each step completes.
7. On resume, read `Current State` and `Checkpoint Context` before taking any action.
8. Before commit, run `node scripts/migrate-completed-plans.js` so fully completed plans move to `docs/exec-plans/completed/`.
9. Run validation before commit and push.

## Branch Naming

Use one branch per plan. The branch name should use a Git-friendly prefix such as:

- `feat/...`
- `fix/...`
- `docs/...`
- `chore/...`
- `refactor/...`
- `test/...`

## Plan File Naming

Use PascalCase with underscores for plan files, for example:

- `Add_Export_Feature.md`
- `Fix_Parsing_Error.md`

## Plan Template

```markdown
# [Plan Title]

## Goal
One sentence that states the outcome.

## Branch
feat/replace-with-a-unique-branch-name

## Context
Describe why the change is needed and what evidence triggered it.

## Scope
- In scope:
- Out of scope:

## Steps

### Step 1: [Short Name]
Red:
- [ ] Add or update a focused test that proves the missing behavior.
- [ ] Run the targeted test command and confirm it fails for the expected reason.

Green:
- [ ] Implement the smallest change that makes the targeted test pass.
- [ ] Re-run the targeted test command and confirm it passes.

Refactor:
- [ ] Clean up naming, structure, or duplication without changing behavior.
- [ ] Re-run the targeted test command and confirm it stays green.

### Step 2: [Short Name]
Red:
- [ ] Add or update the next focused failing test.
- [ ] Run the targeted test command and confirm failure.

Green:
- [ ] Implement the smallest change needed for the new test.
- [ ] Re-run the targeted test command and confirm success.

Refactor:
- [ ] Refine the touched code while preserving behavior.
- [ ] Re-run the targeted test command and confirm it stays green.

## Current State
phase: not-started   # not-started | red | green | refactor | done
step: 0              # current step number (0 = not yet started)
checkpoint: YYYY-MM-DDTHH:MM:SSZ

## Checkpoint Context
- Last action: [What was just done before pausing]
- Blocking: [Any known blocker, or "none"]
- Resume instruction: [Exact next action to take on resume]

## Decisions
- Decision: [What was decided]
  Rationale: [Why this option won]

## Progress
- [ ] Step 1 - [Short Name]
- [ ] Step 2 - [Short Name]

## Notes
- YYYY-MM-DD: Record discoveries, blockers, or scope adjustments.

## Validation
- [ ] Targeted tests were observed in red and green phases for each step.
- [ ] Broader verification commands passed.
- [ ] Relevant docs were updated to match the implementation.
```

## TDD Reference

Read [references/TDD.md](references/TDD.md) before executing a plan.

## Lifecycle

1. Draft the plan in `docs/exec-plans/active/`.
2. Execute each step using red, green, and refactor.
3. Update `Progress` as soon as a step is done.
4. Keep `Current State` and `Checkpoint Context` current whenever work pauses.
5. When every progress item is checked, set `phase: done` and move the file to `docs/exec-plans/completed/`.
6. Commit, push, and create a pull request from the same branch.

## State Machine

Each plan has a single active state. Valid transitions:

```
not-started → red
red         → green  (failing test committed)
green       → refactor  (test passes)
refactor    → red  (next step begins)
refactor    → done  (all steps complete)
```

Rules:
- Never skip a phase. Moving from `red` directly to `refactor` is forbidden.
- After each step's refactor phase completes, immediately update `Current State` and `Checkpoint Context` before moving to the next step.
- On resume, the first action is always to read the plan file and execute the `Resume instruction` in `Checkpoint Context`.