# Code Change

Workflow ID: 20260429-205007-copilot-cli-workflow-runner
Status: completed

## Summary

Implemented the first executable slice of issue workflow Run for the local Copilot CLI architecture. The browser now validates selected workflow node skill configuration, submits an issue + workflow payload to a local runner endpoint, and displays runner submission status. A new local Node runner script accepts that payload, creates run artifacts, snapshots skills, generates per-node prompts, and starts a fresh Copilot CLI process for each node.

## Source Changes

1. `src/lib/workflowRuns.ts`
   - Added executable node derivation from workflow nodes/edges.
   - Added skill readiness validation and missing skill messages.
   - Added local runner payload generation with `freshSessionPerNode` and `snapshot-skill-directory` options.

2. `src/stores/workflowRuns.ts`
   - Added Pinia store for workflow run submission state.
   - Added default HTTP submitter for `http://127.0.0.1:43117/runs`.
   - Added error handling for runner rejection and network/submitter failures.

3. `src/components/workflow-studio/TasksPanel.vue`
   - Connected issue detail Run to `useWorkflowRunsStore`.
   - Disabled Run until issue + workflow + complete node skill config are present.
   - Added compact status text for queued runs, runner errors, and missing skill readiness.
   - Added missing `Label` import for existing PAT form markup.

4. `scripts/loom/copilot-runner.mjs`
   - Added `serve` HTTP endpoint and one-shot `run` command.
   - Creates `artifacts/runs/<run-id>/` with input snapshots, skill snapshots, node prompts, logs and node results.
   - Starts a fresh Copilot CLI process for each node without `--continue`, `--resume`, or `--connect`.
   - Supports dry-run mode and simulated first review `changes_requested` for contract tests.
   - Supports `COPILOT_CLI_BIN` override for test and local debugging.
   - Strictly validates `node-result.json` status and review verdict before allowing a run to complete.
   - Forces node/run failure when Copilot CLI exits non-zero, even if a completed node result was written.
   - Rejects unsafe `skillId` values and asserts skill snapshot paths stay inside the skill catalog and run artifact roots.
   - Restricts HTTP runner requests to an Origin allowlist instead of wildcard CORS.

5. `package.json`
   - Added `pnpm runner:copilot`.
   - Added `pnpm runner:copilot:dry-run`.

## Tests Added Or Updated

1. `tests/logic/workflow-runs.test.ts`
   - Covers edge-order execution, missing skills, data skill fallback, blank skill trimming, payload shape and empty workflows.

2. `tests/logic/workflow-runs-store.test.ts`
   - Covers successful submission, missing skill short-circuit, thrown submitter errors, and default HTTP non-2xx message propagation.

3. `tests/logic/workflow-ui.test.ts`
   - Covers TasksPanel Run success, runner rejection display, missing skill disabled state and existing select stub typing cleanup.

4. `tests/logic/copilot-runner-script.test.ts`
   - Covers dry-run artifacts, skill snapshot, prompt contract, node-result contract, review loop back to coding, real spawn argv without resume-style session flags, invalid review node results failing the run, non-zero Copilot exits, unsafe skill IDs and rejected HTTP origins.

## Documentation Updated

1. `ARCHITECTURE.md`
2. `README.md`
3. `docs/github-tasks.md`
4. `docs/workflow-studio.md`
5. `docs/project-structure.md`
6. `docs/validation-map.md`

Runner documentation now calls out the default allowed origins and the `TSUMUGI_RUNNER_ALLOWED_ORIGINS` override for alternate local frontend ports.

## Notes

1. The frontend does not directly execute Copilot CLI. It submits JSON to the local runner endpoint.
2. Real Copilot CLI execution is not run in automated tests; script tests use dry-run and fake Copilot executable contracts.
3. The first review loop implementation handles a linear workflow by returning from a review node to the immediately previous node.
