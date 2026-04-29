# Test Report

Workflow ID: 20260429-205007-copilot-cli-workflow-runner
Status: passed

## Commands

1. `pnpm test:logic`
   - Result: passed
   - Summary: 12 test files passed, 96 tests passed.

2. `node --check scripts/loom/copilot-runner.mjs`
   - Result: passed
   - Summary: command exited successfully with no output.

3. `pnpm build`
   - Result: passed
   - Summary: `vue-tsc` and Vite build completed successfully.
   - Warning: Vite reported a chunk larger than 500 kB after minification.

4. `pnpm test:ui`
   - Result: passed
   - Summary: 13 Playwright tests passed.

## Focused Validation

1. `tests/logic/workflow-runs.test.ts`: passed.
2. `tests/logic/workflow-runs-store.test.ts`: passed.
3. `tests/logic/workflow-ui.test.ts`: passed.
4. `tests/logic/copilot-runner-script.test.ts`: passed.
5. `tests/logic/copilot-runner-script.test.ts` strict runner contract focused run: 10 tests passed.
6. Combined focused run: 29 tests passed before review rework; final full logic run covers 96 tests.

## Manual / Contract Validation

1. Runner dry-run was validated against a temporary artifact root outside the repository and cleaned up afterward.
2. Runner script syntax was checked with `node --check`.
3. Fake Copilot executable test captures actual spawn argv and verifies no resume-style session flags are passed.
4. Fake Copilot executable tests verify invalid review verdict, unknown review verdict, invalid status and missing status all fail the run.
5. Fake Copilot executable tests verify non-zero Copilot exits fail the run even after a completed node result is written.
6. Runner request validation rejects path traversal skill IDs before skill snapshot or execution.
7. Serve-mode HTTP test verifies disallowed browser origins receive 403 and do not create run artifacts.

## Residual Risk

1. Real Copilot CLI execution is not exercised in automated tests because it can modify repository files and requires an interactive/local CLI environment.
2. The first review loop only supports the current linear workflow assumption; conditional graph edges remain future work.
3. Issue payload currently uses the existing issue summary model and does not include issue body/comments.
