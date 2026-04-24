---
name: branch-first-workflow
description: "Use when: starting a new feature, fix, docs task, refactor, test task, or any work that should have its own execution plan branch. Creates or verifies one unique task branch before planning begins."
---

# Branch-First Workflow

Create or verify the unique branch that a plan will belong to before writing the plan.

## When To Use

- A new feature, fix, docs task, refactor, or test task is starting.
- The user asks to create a plan but there is not yet a task branch.
- The current branch does not clearly map to the new plan.

## Procedure

### Step 1: Determine The Branch Type

Use the task nature to choose a prefix:

- `feat/` for new features.
- `fix/` for bug fixes.
- `docs/` for documentation-only work.
- `chore/` for maintenance.
- `refactor/` for code restructuring without behavior change.
- `test/` for test-only work.

### Step 2: Determine The Branch Slug

Create a short Git-safe slug that describes the work.

Examples:

- `feat/add-export-flow`
- `fix/handle-empty-response`
- `docs/clarify-plan-template`

### Step 3: Verify Uniqueness

1. Confirm this branch is for one plan only.
2. If the current branch already belongs to another plan, create a different branch.
3. Do not attach multiple plans to the same branch unless they are truly the same piece of work.

### Step 4: Create Or Switch

If needed:

1. Switch to the default integration branch.
2. Update it from the remote if that is part of the repository workflow.
3. Create the new task branch.
4. Verify the current branch name matches the intended branch.

### Step 5: Hand Off To Planning

After the branch is ready, continue with [execution-planning](../execution-planning/SKILL.md).

## Hard Rules

1. One plan maps to one unique branch.
2. Branch names must be Git-safe and use one of the allowed prefixes.
3. Do not start writing a plan on a branch that already belongs to unrelated work.