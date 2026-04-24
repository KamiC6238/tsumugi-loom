---
name: doc-update-routing
description: "Use when: before commit, after verified implementation, or whenever you need to decide which durable docs must be updated from code changes. Inspect the diff first, then update only the durable docs whose long-lived truth changed."
---

# Durable Doc Update Routing

Use this skill after implementation is verified and before commit.

This skill routes durable documentation updates other than `PLAN.md`. Plan creation and plan edits follow the planning skills instead.

## Outcome

- Durable docs stay lean and reflect long-lived truths.
- Documentation updates are driven by the actual code diff, not by generic checklists.
- FRONTEND.md, BACKEND.md, and ARCHITECTURE.md do not turn into per-task change logs.

## Procedure

### Step 1: Inspect The Verified Change Set

1. Review the verified code changes before deciding on documentation updates.
2. Prefer the current task diff over broad repository history.
3. If both staged and unstaged changes exist, reason only about the task-relevant diff.

Useful evidence sources:

- changed file list,
- targeted diffs,
- affected tests,
- changed commands or entry points,
- changed contracts between packages or services,
- repository-local route definitions in `scripts/check-doc-updates.config.js`.

### Step 2: Ignore Non-Durable Noise

Do not update durable docs for changes that do not alter long-lived project truth, such as:

- local refactors that preserve external behavior,
- formatting-only edits,
- comment-only edits,
- rename-only cleanup with unchanged boundaries,
- test-only edits unless they change the documented test surface,
- task-specific notes that belong in a plan or pull request summary instead.

### Step 3: Route The Change To The Right Docs

Update [../../../docs/FRONTEND.md](../../../docs/FRONTEND.md) when the diff changes durable frontend truth such as:

- browser-visible behavior,
- routing or rendering model,
- client state ownership,
- component or styling conventions,
- frontend build, runtime, or test entry points.

Update [../../../docs/BACKEND.md](../../../docs/BACKEND.md) when the diff changes durable backend truth such as:

- API or RPC behavior,
- workers, jobs, or scheduled processes,
- domain service boundaries,
- persistence and integration patterns,
- validation, authorization, or error-shaping rules,
- backend build, runtime, deployment, or test entry points.

Update both [../../../docs/FRONTEND.md](../../../docs/FRONTEND.md) and [../../../docs/BACKEND.md](../../../docs/BACKEND.md) when the diff changes a shared contract such as:

- request or response schemas,
- auth or session semantics,
- generated clients,
- shared transport protocols,
- data-loading agreements between client and server.

Update [../../../docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md) when the diff changes repository-level truth such as:

- package boundaries,
- system topology,
- ownership lines between major surfaces,
- the durable map of how the project is organized.

Update [../../../docs/QUALITY.md](../../../docs/QUALITY.md) when the diff changes the documented validation commands, required gates, or the durable-doc sync guard.

### Step 4: Check Affected Code-Type Skills

After routing updates to durable docs, inspect whether any existing code-type skill has become stale.

A code-type skill is stale when the verified diff:

- changes the naming conventions, file structure, or patterns for a classified directory,
- adds or removes a directory that is listed in the **Project Directory Map** in `docs/ARCHITECTURE.md`,
- introduces a new pattern that contradicts the currently documented rules in a code-type skill,
- changes the testing approach for a code type (e.g., moves from unit to integration testing).

For each stale code-type skill found under `.github/skills/`:

1. Open the skill file.
2. Update only the sections whose documented truth changed.
3. Keep the skill lean — record long-lived conventions, not task-specific change notes.
4. If the diff adds a directory with no existing classification, follow the Bootstrap procedure in [code-type-routing](../code-type-routing/SKILL.md) to register the new type and create the skill before committing.

Do not update a code-type skill for changes that only affect implementation details within an already-classified directory and do not alter the skill's rules.

Update [../../../docs/GOLDEN_RULES.md](../../../docs/GOLDEN_RULES.md) when the diff changes hard workflow rules such as branch rules, planning rules, red-green-refactor requirements, completed-plan lifecycle rules, or commit-time documentation gates.

Update [../../../docs/PROJECT_OPERATIONS.md](../../../docs/PROJECT_OPERATIONS.md) when the diff changes branch, planning, commit, release, or handoff workflow.

Keep concrete path-to-doc enforcement in `../../../scripts/check-doc-updates.config.js`.

- This skill decides which durable truths belong in which documents.
- The repository-local config ties concrete code paths to those durable docs for commit-time enforcement.

### Step 4: Keep The Update Minimal

1. Edit only the durable sections whose meaning changed.
2. Record stable conventions and boundaries, not one-off implementation details.
3. Avoid duplicating the same routing rules across multiple durable docs.
4. If no durable truth changed, leave the durable docs untouched.

### Step 5: Validate

After any durable doc update:

1. Re-read the touched doc sections.
2. Run the repository documentation checks, including `node scripts/check-doc-updates.js` once the staged diff is ready.
3. Confirm the docs now match the verified implementation.
4. If the guard fails, use its triggering-file output to see which changed paths still require durable doc updates.

## Hard Rules

1. Decide documentation updates from the diff, not from file names alone.
2. Do not treat durable docs as changelogs.
3. Prefer one clear source for routing rules. This skill is that source.
4. If a change crosses frontend and backend boundaries, update both docs.
5. If uncertain, inspect the owning code path until the changed responsibility is clear.
6. Invalid `scripts/check-doc-updates.config.js` must be fixed before commit; configuration errors should never weaken enforcement.