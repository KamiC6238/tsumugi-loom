---
name: execution-planning
description: "Use when: the user asks to write a plan, create a plan, draft a plan, write an execution plan, 写个 plan, 写计划, or start non-trivial implementation work that should begin with a plan. Ensures the work is scoped on one unique branch, creates the plan in docs/exec-plans/active using docs/PLAN.md, then stops for user confirmation before implementation."
---

# Execution Planning

Create an execution plan before non-trivial implementation work starts.

## When To Use

- The user says "write a plan", "create a plan", or "draft a plan".
- The user asks for a non-trivial feature, bug fix, refactor, migration, or documentation workflow.
- The user wants structured implementation but the repository does not yet have a plan file.

## Outcome

- A plan file exists under `docs/exec-plans/active/`.
- The plan is tied to one unique branch.
- Every implementation step contains red, green, and refactor phases.
- The user has reviewed the plan before any implementation begins.

## Procedure

### Step 1: Ensure Branch Preconditions

1. Confirm the work belongs to exactly one branch.
2. If a suitable task branch does not already exist, follow [branch-first-workflow](../branch-first-workflow/SKILL.md) before drafting the plan.
3. Do not create one plan across multiple branches.

### Step 2: Clarify The Request

If the request is ambiguous, ask follow-up questions before writing the plan.

Clarify at least these points when they are missing:

- The concrete goal or bug behavior.
- The affected surface or package.
- The expected outcome.
- Any explicit constraints, dependencies, or rollout limits.

Do not write the plan until the request is concrete enough to produce actionable steps.

### Step 3: Gather Required Context

Before drafting the plan:

1. Read `docs/ARCHITECTURE.md`.
2. Read `docs/FRONTEND.md`.
3. Read `docs/BACKEND.md`.
4. Read `docs/PLAN.md`.
5. Check `docs/exec-plans/active/` for overlapping in-progress plans.
6. Inspect the relevant implementation area if the request already points to one.

### Step 3.5: Identify Code Type And Load Skill

After gathering context and before drafting the plan:

1. Identify all directories that the implementation will touch, based on the request and the ARCHITECTURE.md map.
2. For each affected directory, follow [code-type-routing](../code-type-routing/SKILL.md) to load the correct code-type skill.
3. If a directory has no classification or no skill yet, complete the Bootstrap procedure in `code-type-routing` before continuing.
4. Do not proceed to Step 4 until every affected code type has a loaded skill.

This step ensures the plan's implementation steps are written with the correct conventions in mind.

### Step 4: Draft The Plan File

Create a markdown file in `docs/exec-plans/active/`.

Rules:

- Use PascalCase with underscores for the file name.
- Use the template and lifecycle rules from `docs/PLAN.md`.
- Fill in the `Branch` section with the unique task branch for this plan.
- Keep `Progress` item count aligned with the number of steps.
- Every step must explicitly include `Red:`, `Green:`, and `Refactor:` phases.
- Keep the plan concrete enough that implementation can proceed without re-planning the entire task.

### Step 5: Present The Plan To The User

After creating the plan:

1. Show the plan file path.
2. Summarize the goal, branch, and step list.
3. Ask the user to confirm whether implementation should start.

### Step 6: Stop Until Confirmation

Do not implement anything yet.

Wait for the user's confirmation after they review the drafted plan. Only after confirmation should implementation begin.

## Hard Rules

1. Do not skip the branch check.
2. Do not create the plan on the default branch unless the user explicitly wants that and it still satisfies the repository rules.
3. Do not write vague steps like "implement the feature".
4. Do not start coding before the user confirms the plan.
5. Keep the plan in `docs/exec-plans/active/` until all progress items are complete.

## Handoff To Implementation

Once the user confirms:

1. Implement one step at a time.
2. Follow the plan's red, green, and refactor phases exactly.
3. Update `Progress` immediately after each completed step.
4. Update documentation to match verified code.
5. Before commit, move completed plans out of `active/`.