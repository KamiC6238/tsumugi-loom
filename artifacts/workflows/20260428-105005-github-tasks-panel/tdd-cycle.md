# TDD Cycle: GitHub tasks panel

## Scope

Implemented the plan steps for GitHub helper logic, Pinia task state, Tasks panel UI integration, and sidebar/App wiring.

## Test Value Selection

- Product-level tests were added for GitHub remote parsing, issue normalization, token/repository persistence, authenticated fetch states, auth failure mapping, panel state transitions, and sidebar/App wiring.
- `TasksPanel.vue` visual states were kept mostly integration-light; the important state transitions are covered through the store and App wiring tests.

## RED

- Added `tests/logic/github.test.ts` for repository parsing, issue normalization, and storage helpers.
- Added `tests/logic/github-tasks-store.test.ts` for selected repository state, auth-required state, persistence restore, successful issue fetch, empty list state, and 401/403 auth errors.
- Updated `workflow-studio.test.ts` and `workflow-ui.test.ts` for `tasks` panel switching and accessible active state.

## Test Review

- First Test Case Reviewer pass returned `changes_requested` for missing refresh-style store restoration, missing 403 coverage, and missing Tasks active-state assertions.
- Tests were updated to cover those gaps.
- Second Test Case Reviewer pass returned `approved` with residual risk that `TasksPanel` DOM states are not directly mounted in this round.

## GREEN

- Added `src/lib/github.ts` for GitHub remote parsing, issue normalization, GitHub API fetch, and storage helpers.
- Added `src/stores/githubTasks.ts` for selected repository, persisted auth token, issues, status, error, and refresh actions.
- Added `TasksPanel.vue` with native directory picker support, auth prompt, loading/error/empty states, and issue cards.
- Extended `useWorkflowStudio`, `WorkflowSidebar`, and `App` to support the `tasks` panel.

## REFACTOR

- Kept GitHub parsing and API normalization outside Vue components for focused tests.
- Reused existing `Button`, `Input`, and `Label` components plus existing panel/card styling conventions.
- Kept App as a composition surface and left issue state in a dedicated Pinia store.