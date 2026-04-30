# Code Change

Workflow ID: 20260430-080218-knowledge-base-update-from-runs
Status: completed

## Summary

Implemented the first end-to-end slice for updating a selected repository Knowledge Base after an issue workflow Run completes. The browser now tracks latest runs by issue, refreshes queued issue runs when returning to the issue list, clears per-issue run/update state at repository boundaries, checks local runner repository status, exposes an issue-list “更新 Knowledge base” action, and submits update requests to the local runner. The runner can now create or update `docs/knowledge-base.md` from completed run artifacts while preserving hand-written content, writing an update artifact, and failing closed when repository identity or managed document markers are unsafe.

## Source Changes

1. `src/lib/knowledgeBase.ts`
   - Added default Knowledge Base target path.
   - Added runner status, readiness, endpoint, request payload and result normalization helpers.
   - Added user-facing blocked-state messages for missing run, non-completed run, runner status, unsupported capability and repository mismatch.

2. `src/stores/knowledgeBase.ts`
   - Added Pinia store for local runner status and per issue/run update state.
   - Added default HTTP submitter for `POST /runs/:runId/knowledge-base`.
   - Added duplicate-click protection while an update is already in progress.
   - Added state reset for repository boundary changes.

3. `src/stores/workflowRuns.ts`
   - Added issue number to latest run submission mapping.
   - Added `getLatestIssueRun()` and `refreshIssueWorkflowRunStatus()`.
   - Added default HTTP run status fetcher for `GET /runs/:runId`.
   - Added issue run mapping reset for selected repository changes.

4. `src/components/workflow-studio/TasksPanel.vue`
   - Refreshes local runner status when a repository is selected.
   - Refreshes incomplete issue run status from `GET /runs/:runId` when returning from issue detail to the issue list.
   - Shows the issue-list “更新 Knowledge base” button and per issue/run status.
   - Keeps the button disabled until the latest issue run is completed and runner repo matches selected repo.
   - Stops Knowledge Base button keyboard events from opening the parent issue card.
   - Reuses existing Button UI and lucide icon; no new UI primitive was added.

5. `scripts/loom/copilot-runner.mjs`
   - Added `GET /status` with repo path, GitHub repository full name, mode and capabilities.
   - Added `POST /runs/:runId/knowledge-base`.
   - Rejects non-completed runs, missing request `repository.fullName`, unresolvable runner repository identity and repository mismatches.
   - Reads issue/workflow snapshots, node results and node-declared markdown/text artifacts.
   - Creates or updates `docs/knowledge-base.md` with managed markers and per-run idempotent entries.
   - Rejects malformed managed section markers, including reversed marker order, instead of silently returning success.
   - Writes `artifacts/runs/<run-id>/knowledge-base/update.json`.

## Tests Added Or Updated

1. `tests/logic/knowledge-base.test.ts`
   - Covers readiness, endpoint generation, payload identity and result normalization.

2. `tests/logic/knowledge-base-store.test.ts`
   - Covers successful update, blocked states, repository/capability failures, per issue/run isolation and duplicate-click protection.

3. `tests/logic/workflow-runs-store.test.ts`
   - Covers latest run mapping by issue number and run status refresh without overwriting other issues.

4. `tests/logic/workflow-ui.test.ts`
   - Covers enabled action after completed run, queued-to-completed refresh on list return, repository-switch isolation for same issue numbers, no-run reason, unsupported capability, repository mismatch, payload submission and click/keyboard isolation.

5. `tests/logic/copilot-runner-script.test.ts`
   - Covers runner status, Knowledge Base document creation/update, idempotent managed entry, preserving hand-written content, non-completed run rejection, illegal target path rejection, malformed marker and reversed marker rejection, missing repository identity rejection, unresolvable runner identity rejection and repository mismatch rejection.

## Documentation Updated

1. `README.md`
2. `ARCHITECTURE.md`
3. `docs/github-tasks.md`
4. `docs/knowledge-base-updates.md`
5. `docs/project-structure.md`
6. `docs/validation-map.md`

## Notes

1. The browser does not directly write target repository files; all file writes happen in the local runner.
2. The first version fixes the target document path to `docs/knowledge-base.md`.
3. The deterministic extractor reads markdown/text artifacts declared by node results; richer issue body/comment ingestion remains future work.