# Plan: GitHub tasks panel

## Goal

Add a Tasks entry to the sidebar. When active, the right panel should show GitHub issues for the selected local repository. If no repository is selected, guide the user to add one through a native directory picker. Authentication state must survive page refreshes.

## User Requirements

1. Add a Tasks button to the sidebar; clicking it opens a right-side issues panel for the selected GitHub repository.
2. When no repository is selected, show centered copy explaining that there is no selected repository, then a plus icon and `Add repo` action that opens a native directory picker.
3. After a directory is selected, if GitHub authentication is missing, show a simple authentication prompt.
4. After repository selection and authentication, automatically fetch that repository's issues; show an empty state if there are no issues.
5. Persist GitHub authentication so refreshes do not require re-authentication.

## Scope

- Add a `tasks` panel state alongside existing `workflow` and `skills` panels.
- Add a Pinia store for selected repository metadata, persisted GitHub token, issue loading state, and fetch actions.
- Add pure GitHub helpers to parse GitHub remotes, normalize issue API data, and build fetch requests.
- Add a browser directory-picker integration that reads `.git/config` when available and extracts the GitHub `owner/repo` remote.
- Add a `TasksPanel.vue` presentational/orchestration component for repository selection, auth prompt, loading, error, issue cards, and empty states.

## Out Of Scope

- Full OAuth flow, because this static Vite app has no registered OAuth client or backend callback endpoint.
- Writing tokens outside browser storage or integrating OS keychain storage.
- Mutating GitHub issues, creating issues, assigning tasks, or syncing labels beyond read-only display.
- Supporting non-GitHub remotes.

## Component Map

- `App.vue`: composition surface that wires the new tasks store and sidebar event into `TasksPanel`.
- `WorkflowSidebar.vue`: adds a Tasks button using the same existing button style pattern as Skills.
- `TasksPanel.vue`: owns the right-side Tasks UI states and emits add/auth/fetch actions through the injected store methods.
- `src/stores/githubTasks.ts`: Pinia store owning selected repo, persisted token, issues, status, error, and async actions.
- `src/lib/github.ts`: pure helpers for GitHub remote parsing, localStorage persistence, API response normalization, and fetch wrapper.

## Component Reuse Strategy

- Reuse the existing `Button` component for sidebar, add repo, auth, refresh, and disconnect actions.
- Reuse the current panel/card CSS language from `SkillsPanel.vue` and `WorkflowCanvasPanel.vue`; no new shadcn-vue primitive is required.
- Use lucide icons (`ListTodoIcon`, `PlusIcon`, `RefreshCwIcon`, `KeyRoundIcon`) for tool actions.
- Use a native `window.showDirectoryPicker()` directory picker when available, with a hidden `input webkitdirectory` fallback for browsers that do not expose it.

## Task Breakdown

1. GitHub helper contract
   - Parse GitHub remotes from `.git/config` supporting HTTPS, SSH, and `git@github.com:` formats.
   - Normalize GitHub issues and filter out pull requests from the issue list.
   - Keep token persistence behind a small storage helper.

2. Store and panel state
   - Add `useGithubTasksStore` with selected repository, auth token, issues, loading/error/auth states, and actions.
   - Persist token to `localStorage`; selected repository can also be restored from storage for a smoother refresh experience.
   - Fetch issues automatically when repository and token are available.

3. UI integration
   - Extend `WorkflowStudioPanel` to include `tasks`.
   - Add `openTasksPanel()` and `isTasksPanelActive` to `useWorkflowStudio`.
   - Add a sidebar Tasks button with active state.
   - Add `TasksPanel.vue` for no-repo, auth-required, loading, empty, error, and issue-card states.

4. Tests
   - Add Vitest coverage for GitHub remote parsing, issue normalization, token persistence behavior, and store fetching.
   - Update workflow studio tests for the `tasks` panel state.
   - Update UI wiring tests for sidebar Tasks and App panel switching.

5. Artifacts and validation
   - Run focused logic tests, then the full logic suite when feasible.
   - Record code-change, test-report, and review artifacts following repository workflow conventions.

## Acceptance Criteria

- Sidebar includes a Tasks entry with accessible active state.
- Clicking Tasks replaces the right panel with the GitHub tasks panel.
- With no selected repository, the panel centers the required no-repository message and an add-repo action with a plus icon.
- Add repo opens a native directory picker when supported and extracts GitHub repository metadata from `.git/config`.
- If no GitHub token exists after selecting a repo, the UI shows a minimal authentication prompt.
- Saving a token persists it across page refreshes and triggers issue fetching.
- Issues render as cards, excluding pull requests returned by GitHub's issues endpoint.
- Empty repository issue lists render a clear empty state.
- Fetch/auth errors are visible and do not break the rest of the workflow studio.

## Test Strategy

- Pure Vitest tests for `src/lib/github.ts` remote parsing and normalization.
- Pinia store tests for persistence, auth-required state, successful fetch, empty issue list, and API failure.
- Vue Test Utils tests for sidebar event emission and App panel switching.
- Run `pnpm test:logic`; run broader tests if implementation risk warrants it.

## Assumptions

- PAT-based authentication is the practical implementation for this static client; OAuth can be added later with backend/client registration support.
- The GitHub token is stored in browser `localStorage` to satisfy refresh persistence for this prototype.
- The browser directory picker may not be available in every browser, so the fallback uses `webkitdirectory` where supported.

## Open Questions

- None blocking.