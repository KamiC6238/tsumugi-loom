# Test Report

Workflow ID: 20260430-080218-knowledge-base-update-from-runs
Status: passed

## Commands

1. Focused Vitest run for Knowledge Base, workflow run store, UI wiring and runner contract
   - Result: passed
   - Summary: 50 tests passed.

2. `pnpm test:logic`
   - Result: passed
   - Summary: 115 tests passed.

3. `node --check scripts/loom/copilot-runner.mjs`
   - Result: passed
   - Summary: command exited successfully with no syntax errors.

4. `pnpm build`
   - Result: passed
   - Summary: TypeScript/Vue build and Vite production build completed successfully.
   - Warning: Vite reported a chunk larger than 500 kB after minification.

5. `pnpm test:ui`
   - Result: passed
   - Summary: 13 Playwright tests passed.

## Focused Validation

1. `tests/logic/knowledge-base.test.ts`: passed.
2. `tests/logic/knowledge-base-store.test.ts`: passed.
3. `tests/logic/workflow-runs-store.test.ts`: passed.
4. `tests/logic/workflow-ui.test.ts`: passed.
5. `tests/logic/copilot-runner-script.test.ts`: passed.

## Manual / Contract Validation

1. Runner syntax was checked with `node --check`.
2. Runner serve-mode tests validated `GET /status` and `POST /runs/:runId/knowledge-base` against temporary repositories.
3. Runner Knowledge Base tests verified existing hand-written docs content is preserved and same-run managed entries are not duplicated.
4. Rework regression tests verified queued run status refresh, repository-switch isolation for same issue numbers, Knowledge Base button keyboard isolation, illegal target path rejection, malformed/reversed managed marker rejection and fail-closed repository identity validation.

## Residual Risk

1. Real Copilot CLI execution is not exercised in automated tests.
2. Knowledge extraction is deterministic and artifact-based; it does not yet ingest issue body/comments or run an LLM summarizer.
3. The target document path is intentionally fixed to `docs/knowledge-base.md` in this first slice.