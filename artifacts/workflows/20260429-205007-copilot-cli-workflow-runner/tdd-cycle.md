# TDD Cycle

Workflow ID: 20260429-205007-copilot-cli-workflow-runner
Status: completed

## Step 1: Workflow run pure logic

Test value: product-level logic. The helper decides whether an issue workflow can run, which nodes are executable, and what payload is sent to the local runner.

RED:

1. Added `tests/logic/workflow-runs.test.ts` before implementation.
2. Initial failure: `src/lib/workflowRuns.ts` did not exist.

GREEN:

1. Added `src/lib/workflowRuns.ts`.
2. Implemented executable node ordering, skill readiness, request creation, run id generation, and default runner options.

REFACTOR / hardening:

1. Strengthened edge-order test by shuffling node array and making canvas positions conflict with edge order.
2. Added fallback coverage for `node.data.skillId` and blank skill trimming.

## Step 2: Workflow run store

Test value: product-level state and failure handling. The store controls whether UI can submit to the local runner and how errors surface.

RED:

1. Added `tests/logic/workflow-runs-store.test.ts` before implementation.
2. Initial failure: `src/stores/workflowRuns.ts` did not exist.

GREEN:

1. Added `useWorkflowRunsStore` with `idle/submitting/submitted/error` states.
2. Added default HTTP submitter for `http://127.0.0.1:43117/runs` and injectable submitter for tests.

REFACTOR / hardening:

1. Added coverage for non-2xx runner responses and message propagation.
2. Kept request generation in `src/lib/workflowRuns.ts` to keep store focused on orchestration.

## Step 3: TasksPanel Run UI

Test value: component wiring and user-visible contract. Run must only submit when issue + workflow + full node skill config are present.

RED:

1. Extended `tests/logic/workflow-ui.test.ts` around issue detail Run behavior.
2. Initial implementation had no Run action and no status display.

GREEN:

1. Connected TasksPanel to `useWorkflowRunsStore`.
2. Added selected workflow readiness, Run submit action, success/error/readiness status text, and disabled state for missing skills.

REFACTOR / hardening:

1. Added runner rejection UI coverage.
2. Added missing `Label` import to remove component resolution warning.
3. Preserved existing shadcn-vue Button/Select/Input/Label usage.

## Step 4: Local Copilot runner script

Test value: execution contract. The script is the browser-external boundary that creates artifacts and starts fresh Copilot CLI sessions.

RED:

1. Added `tests/logic/copilot-runner-script.test.ts` after the script contract was defined.
2. Initial test hardening found gaps around review loop shape and spawn arguments.

GREEN:

1. Added `scripts/loom/copilot-runner.mjs` with `serve` and `run` commands.
2. Implemented dry-run artifact creation, skill snapshot, prompt generation, node-result contract, review loop, and `COPILOT_CLI_BIN` override for tests.

REFACTOR / hardening:

1. Added three-node `plan -> coding -> review` dry-run review loop coverage.
2. Added fake Copilot executable to capture real spawn argv and assert no `--continue`, `--resume`, or `--connect` are passed.
3. Added prompt contract assertions for issue/workflow/request snapshots, previous artifacts, skill path, and output JSON shape.

## Final Verification

1. `pnpm test:logic`: 12 files, 89 tests passed.
2. `node --check scripts/loom/copilot-runner.mjs`: passed.
3. `pnpm build`: passed, with existing Vite chunk-size warning only.
4. `pnpm test:ui`: 13 tests passed.
