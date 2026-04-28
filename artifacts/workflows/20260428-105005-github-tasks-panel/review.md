# Review: GitHub tasks panel

## Review Round 1

Status: changes_requested

Findings:

- Correctness: `.git/config` parsing kept the previous remote context when entering non-remote sections, so submodule URLs could be mistaken for the selected repository remote.
- Regression Risk: concurrent issue refreshes could let an older request overwrite the newer repository's issue list and status.

Required Rework:

- Reset section context for non-remote config sections and add a regression test.
- Add stale request protection for issue refreshes and add a regression test.

## Fixes Applied

- `parseGithubRepositoryFromGitConfig` now resets `currentRemoteName` for every non-remote section header.
- `useGithubTasksStore.refreshIssues` now captures repo/token snapshots and uses a request id guard before mutating success or error state.
- Added regression tests for submodule URL parsing and stale response ordering.

## Review Round 2

Status: approved

Findings:

- None.

Residual Risks:

- None for the reviewed findings.

## Verification

- Focused Vitest: 31 passed, 0 failed
- Full logic tests: 65 passed, 0 failed
- `get_errors`: no changed-file errors
- `pnpm build`: success
- `pnpm test:ui`: 13 passed