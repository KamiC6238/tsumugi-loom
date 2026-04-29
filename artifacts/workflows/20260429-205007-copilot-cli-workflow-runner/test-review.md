# Test Review

Workflow ID: 20260429-205007-copilot-cli-workflow-runner
Status: approved

## Review Rounds

### Round 1

Reviewer: Test Case Reviewer
Verdict: changes_requested

Findings:

1. Edge-order test could pass if implementation ignored edges because node array already matched edge order.
2. Default HTTP submitter non-2xx behavior and TasksPanel runner error display were not covered.
3. Runner script contract was not covered by automated tests.
4. `node.data.skillId` fallback and blank skill trimming were not covered.

Actions taken:

1. Shuffled workflow nodes and later made canvas positions conflict with edge order.
2. Added store and UI tests for runner non-2xx message propagation.
3. Added script dry-run contract tests.
4. Added fallback/blank skill tests.

### Round 2

Reviewer: Test Case Reviewer
Verdict: changes_requested

Findings:

1. Edge-order fixture still allowed a false green via x-position sorting.
2. Review loop test used only two nodes and could not prove review returned to the implementation node.
3. Spawn flag check used source string matching rather than real argv capture.
4. Prompt contract assertions did not cover all required inputs and output shape.

Actions taken:

1. Changed positions to conflict with edge order.
2. Expanded runner dry-run test to `plan -> coding -> review`, asserting review returns to `coding` attempt 2 and not `plan` attempt 2.
3. Added fake Copilot executable and `COPILOT_CLI_BIN` override to capture actual spawn argv.
4. Added prompt assertions for issue/workflow/request snapshots, previous artifacts, skill path and JSON result contract.

### Round 3

Reviewer: Test Case Reviewer
Verdict: approved

Findings: none.

False-green risks: none identified.

### Round 4

Reviewer: Test Case Reviewer
Verdict: changes_requested

Findings:

1. Review `verdict: null`, unknown verdict and invalid status were covered, but missing `status` was not covered.

Actions taken:

1. Added a missing status case to the runner script table test.
2. Strengthened normalized node-result assertions to include `status: failed`, `verdict: null` and the strict validation summary.

### Round 5

Reviewer: Test Case Reviewer
Verdict: approved

Findings: none.

False-green risks: none identified.

### Round 6

Reviewer: Test Case Reviewer
Verdict: approved

Findings: none.

False-green risks: none identified.

Additional coverage accepted:

1. Fake Copilot writes `status: completed` and exits with code 1; runner result, manifest and normalized node result must be failed.
2. Crafted `skillId: ../plan-writer` is rejected by the runner before skill snapshot or execution.

### Round 7

Reviewer: Test Case Reviewer
Verdict: approved

Findings: none.

False-green risks: none identified.

Additional coverage accepted:

1. Serve-mode runner rejects `POST /runs` from a non-allowlisted Origin with 403.
2. The rejected request does not create the run artifact directory, proving execution was not queued.

## Final Test Set

1. `tests/logic/workflow-runs.test.ts`
2. `tests/logic/workflow-runs-store.test.ts`
3. `tests/logic/workflow-ui.test.ts`
4. `tests/logic/copilot-runner-script.test.ts`

## Final Verification

1. Runner strict validation focused tests: 10 tests passed.
2. Full logic tests: 12 files, 96 tests passed.
3. Runner syntax check: passed.
4. Build: passed with Vite chunk-size warning only.
5. UI tests: 13 tests passed.
