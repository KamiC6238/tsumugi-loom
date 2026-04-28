# Code Change: GitHub tasks panel

## Summary

- Added a Tasks sidebar entry and `tasks` panel state in the workflow studio.
- Added a GitHub Tasks panel that can select a local repository directory, prompt for a PAT, fetch GitHub issues, and render issue cards or empty/error states.
- Added a GitHub tasks Pinia store with persisted auth token and selected repository restore.
- Added GitHub helper functions for remote parsing, issue normalization, API fetch, and storage access.
- Added Vitest coverage for helper logic, store state, panel switching, and UI wiring.

## Files Changed

- `src/components/workflow-studio/TasksPanel.vue`
- `src/components/workflow-studio/WorkflowSidebar.vue`
- `src/composables/useWorkflowStudio.ts`
- `src/App.vue`
- `src/lib/github.ts`
- `src/stores/githubTasks.ts`
- `tests/logic/github.test.ts`
- `tests/logic/github-tasks-store.test.ts`
- `tests/logic/workflow-studio.test.ts`
- `tests/logic/workflow-ui.test.ts`

## Component Reuse

- Reused `Button`, `Input`, and `Label` from `src/components/ui/`.
- Reused existing panel/card layout language from `SkillsPanel.vue` and `WorkflowCanvasPanel.vue`.
- Used lucide icons for Tasks, add repo, refresh, change repo, and token actions.

## Notes

- OAuth is out of scope for this static Vite app; PAT persistence is implemented through browser `localStorage`.
- The native directory picker path uses `window.showDirectoryPicker()` when available and falls back to a hidden `webkitdirectory` input.