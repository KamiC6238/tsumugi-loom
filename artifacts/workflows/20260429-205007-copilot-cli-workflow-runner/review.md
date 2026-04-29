# Code Review

Workflow ID: 20260429-205007-copilot-cli-workflow-runner
Status: approved
Completed At: 2026-04-29T23:08:58+0800

## Review Rounds

### Round 1

Reviewer: Code Reviewer
Verdict: changes_requested

Finding:

1. `node-result.json` normalization defaulted object-shaped results to `status: completed`; review nodes with missing or invalid verdict could fall through and complete the run.

Actions taken:

1. Strictly validated `status` as `completed | failed`.
2. Required completed review nodes to provide `verdict: approved | changes_requested`.
3. Wrote normalized failed results back to `node-result.json`.
4. Added fake Copilot tests for missing/invalid review verdict and missing/invalid status.

### Round 2

Reviewer: Code Reviewer
Verdict: changes_requested

Findings:

1. A non-zero Copilot CLI exit could still reuse a completed node result and complete the run.
2. Unsafe `skillId` values could escape the expected skill catalog/snapshot path.

Actions taken:

1. Forced non-zero Copilot CLI exits to return and persist failed node results.
2. Added safe `skillId` validation.
3. Added source and target path containment checks during skill snapshot.
4. Added tests for completed result plus exit code 1, and `../plan-writer` skill ID rejection.

### Round 3

Reviewer: Code Reviewer
Verdict: changes_requested

Finding:

1. HTTP serve mode used wildcard CORS and accepted browser POST requests from any Origin, allowing arbitrary webpages to trigger local runner execution while the runner is active.

Actions taken:

1. Replaced wildcard CORS with an Origin allowlist.
2. Defaulted allowed origins to `http://localhost:5173` and `http://127.0.0.1:5173`.
3. Added `TSUMUGI_RUNNER_ALLOWED_ORIGINS` / `--allowed-origin` configuration for alternate local frontend ports.
4. Rejected non-allowlisted Origins before request validation, `runs.set`, or `executeWorkflowRun`.
5. Added a serve-mode test proving a rejected Origin receives 403 and creates no run artifact.

### Round 4

Reviewer: Code Reviewer
Verdict: approved

Findings: none.

Residual risks:

1. Real Copilot CLI execution is not run in automated tests; coverage uses dry-run and fake Copilot contract tests.
2. Review loop support remains the first linear workflow slice; conditional graph branching is future work.

## Verification

1. `tests/logic/copilot-runner-script.test.ts`: 10 tests passed.
2. `pnpm test:logic`: 12 files passed, 96 tests passed.
3. `node --check scripts/loom/copilot-runner.mjs`: passed.
4. `pnpm build`: passed with Vite chunk-size warning only.
5. `pnpm test:ui`: 13 tests passed.
