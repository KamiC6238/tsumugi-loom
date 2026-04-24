---
name: plan-management
description: "Use when: the user asks to change, adjust, update, or extend an existing execution plan. Reads the current plan first, updates the plan document, then asks the user to confirm before any further implementation continues."
---

# Plan Management

Modify an existing plan before additional implementation work continues.

## When To Use

- The user says "adjust the plan".
- The user asks to add, remove, reorder, or clarify steps in an existing plan.
- Implementation scope changed and the plan must be updated first.

## Procedure

### Step 1: Read The Current Plan

1. Locate the relevant file in `docs/exec-plans/active/` or `docs/exec-plans/completed/`.
2. Read the full plan before proposing edits.
3. Note the current branch, step structure, progress state, and decisions already recorded.

### Step 2: Clarify The Requested Change

If the requested change is not precise enough, ask follow-up questions.

Clarify:

- Which step or section should change.
- Whether scope is expanding, shrinking, or just being reordered.
- Whether implementation already started and how that affects progress tracking.

### Step 3: Update The Plan Document First

Before touching implementation:

1. Edit the plan file.
2. Preserve or intentionally update the `Branch` section.
3. Keep the `Steps` and `Progress` sections aligned.
4. Ensure any new implementation step still contains `Red:`, `Green:`, and `Refactor:` phases.
5. Record the rationale in `Notes` or `Decisions` when the change affects scope or design.

### Step 4: Show The Delta To The User

After editing the plan:

1. Summarize what changed.
2. Point to the updated plan file.
3. Ask the user whether implementation should proceed with the updated plan.

### Step 5: Wait For Confirmation

Do not continue implementation until the user confirms the updated plan.

## Hard Rules

1. Never implement plan changes before the plan document is updated.
2. Keep progress truthful. Do not mark unchecked work as complete.
3. If the plan is already completed and archived, only reopen it when the user clearly wants to resume or extend that work.