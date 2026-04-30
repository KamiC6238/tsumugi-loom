# TDD Cycle Artifact

Workflow ID: 20260430-080218-knowledge-base-update-from-runs
Coding Skill: .github/skills/tdd-coding-writer/SKILL.md

## Task Coverage

1. Plan tasks 1-3: Knowledge Base helper logic, workflow run issue mapping, and Knowledge Base Pinia store.
2. Plan tasks 4-6: runner status endpoint, Knowledge Base endpoint, target document create/update and update artifact.
3. Plan tasks 7-8: TasksPanel issue list action and completed run availability.
4. Plan tasks 9-11: Vitest coverage and documentation updates.
5. Code Review rework: queued run refresh, fail-closed repository identity, keyboard event isolation, repository-scoped issue run state, malformed marker handling and target path rejection.

## Step

### Plan Task

Tasks 1-3: frontend Knowledge Base rules and stores.

### Test Tool

Vitest.

### Test Value Decision

This step has high product risk because it decides when a target repository can be written. Tests cover repository match, completed-run readiness, request payload identity, state isolation and duplicate-click protection.

### RED

Added `tests/logic/knowledge-base.test.ts`, `tests/logic/knowledge-base-store.test.ts`, and workflow run store assertions. Initial focused run failed because `src/lib/knowledgeBase.ts`, `src/stores/knowledgeBase.ts`, `getLatestIssueRun`, and `refreshIssueWorkflowRunStatus` did not exist.

### GREEN

Added `src/lib/knowledgeBase.ts`, `src/stores/knowledgeBase.ts`, and extended `src/stores/workflowRuns.ts` with issue-number run mapping and run status refresh.

### REFACTOR

Kept Knowledge Base endpoint/payload normalization in the pure lib layer and left TasksPanel free of request construction details.

### Status

approved

## Step

### Plan Task

Tasks 4-6: local runner status and Knowledge Base document update contract.

### Test Tool

Vitest runner script contract tests.

### Test Value Decision

This step has the highest safety risk because it writes files in a target repository. Tests cover `GET /status`, completed-run requirement, repository mismatch rejection, managed-section idempotence, preservation of existing hand-written content, and update artifact output.

### RED

Extended `tests/logic/copilot-runner-script.test.ts`. Initial focused run failed with missing `/status` and `/runs/:runId/knowledge-base` routes.

### GREEN

Extended `scripts/loom/copilot-runner.mjs` with status and Knowledge Base endpoints, runner repository parsing, safe target path checks, deterministic artifact fact extraction, managed section merge and `knowledge-base/update.json` artifact writing.

### REFACTOR

Kept Knowledge Base helper functions local to the runner script and reused existing path containment helpers.

### Status

approved

## Step

### Plan Task

Tasks 7-8: TasksPanel issue list action.

### Test Tool

Vitest component wiring tests.

### Test Value Decision

The UI branch has risk around disabled states and accidental issue-detail navigation. Tests cover enabled completed-run action, no-run reason, capability false, repository mismatch and click isolation.

### RED

Extended `tests/logic/workflow-ui.test.ts`. Initial focused run failed because issue cards did not render Knowledge Base controls.

### GREEN

Updated `TasksPanel.vue` to refresh runner status, show the issue-list “更新 Knowledge base” button, submit through `useKnowledgeBaseStore`, and render per issue/run status.

### REFACTOR

Reused existing shadcn-vue Button and lucide icon styling; no new UI primitive was added.

### Status

approved

## Step

### Plan Task

Code Review rework for real runner completion flow and write-safety edge cases.

### Test Tool

Vitest component wiring tests and runner script contract tests.

### Test Value Decision

This step protects high-risk regressions found during independent review: real runner runs start as queued before completing, target repository writes must fail closed when identity cannot be verified, issue run state must not leak across repositories with the same issue number, nested issue-card controls must not trigger detail navigation from keyboard events, and managed document markers must not silently corrupt updates.

### RED

Added regression coverage in `tests/logic/workflow-ui.test.ts` and `tests/logic/copilot-runner-script.test.ts`. The first focused run failed with three expected failures: the UI did not refresh `/runs/:runId`, malformed managed markers returned success, and missing `repository.fullName` reached later artifact reads instead of failing the request contract. The second Code Review rework added two more failing regression tests for repository switching with the same issue number and end-before-start managed markers.

### GREEN

Updated `TasksPanel.vue` to refresh an incomplete issue run when returning to the issue list, clear per-issue run/update state when the selected repository changes, and stop Enter/Space keydown propagation on the Knowledge Base button. Updated `scripts/loom/copilot-runner.mjs` to require request `repository.fullName`, require a resolvable runner repository full name, reject mismatches, and reject malformed managed section markers including reversed marker order.

### REFACTOR

Kept the refresh as an issue-list transition side effect, preserving the existing Pinia run mapping API. Added explicit reset actions to the workflow run and Knowledge Base stores for repository boundary changes. Kept runner validation close to the write endpoint and added a small marker-count helper for deterministic malformed-section checks.

### Status

approved

## Final Checks

1. Focused Knowledge Base/workflow-run/runner/UI Vitest run: 50 passed, 0 failed.
2. Full Vitest run: 115 passed, 0 failed.
3. `node --check scripts/loom/copilot-runner.mjs`: passed.
4. `pnpm build`: passed with existing Vite chunk-size warning.
5. `pnpm test:ui`: 13 passed.