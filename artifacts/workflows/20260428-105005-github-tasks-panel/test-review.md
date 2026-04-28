# Test Review: GitHub tasks panel

## Round 1

Status: changes_requested

Findings:

- Store tests did not prove a new Pinia/store instance restored authentication from `localStorage`.
- Auth error coverage included 401 but not 403.
- Sidebar/App tests did not assert Tasks button `aria-pressed` active state.

Actions Taken:

- Added a new-store restoration test for selected repository and auth token.
- Changed rejected-token coverage to run for both 401 and 403.
- Added active `aria-pressed` assertions for direct Sidebar mount and App click wiring.

## Round 2

Status: approved

Residual Risks:

- `TasksPanel` DOM states are not directly mounted in the current test set; core behavior is covered through helper/store/App wiring tests.
- Store restoration is verified through a real action write followed by a new Pinia instance, which is acceptable for the current persistence contract.

## Regression Test Review

Status: approved

Context:

- Code review requested regression tests for non-remote `.git/config` URLs and stale issue responses.

Findings:

- `ignores urls outside remote sections in git config` directly covers the section-context bug.
- `ignores stale issue responses after the selected repository changes` directly covers the user-visible stale-list bug.

Residual Risks:

- Stale error responses and token-change stale responses are not separate tests, but the same request guard protects success and error paths.