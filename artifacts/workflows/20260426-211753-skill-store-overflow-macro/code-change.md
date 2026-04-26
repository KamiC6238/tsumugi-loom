# Code Change

## Summary

- Added Pinia and registered it at app startup.
- Added `src/stores/skills.ts` to own user-added skill ids and derive added node skills from the real catalog.
- Updated `useWorkflowStudio` to consume the Pinia skills store instead of owning `addedSkillIds` locally.
- Changed skill classification so only `start-standard-workflow` is implicitly macro unless explicit frontmatter overrides kind/type.
- Updated `SkillsPanel.vue` CSS so long names, descriptions, and paths wrap within card boundaries across desktop and mobile widths.
- Added Vitest and Playwright coverage for classification, Pinia shared state, drawer select options, and skill-card containment.
- Updated README and ARCHITECTURE to document Pinia-backed added skills state and the current macro/node classification contract.

## Files Changed

- `package.json`
- `pnpm-lock.yaml`
- `src/main.ts`
- `src/stores/skills.ts`
- `src/composables/useWorkflowStudio.ts`
- `src/lib/skills.ts`
- `src/components/workflow-studio/SkillsPanel.vue`
- `tests/logic/skills.test.ts`
- `tests/logic/skills-store.test.ts`
- `tests/logic/workflow-studio.test.ts`
- `tests/logic/workflow-ui.test.ts`
- `tests/ui/workflow-sidebar.spec.ts`
- `README.md`
- `ARCHITECTURE.md`

## UI Reuse

- Reused the existing `Switch` component for skill add/remove toggles.
- Reused the existing native `Select` wrapper in the node drawer.
- No new UI primitive was introduced.

## Behavior Notes

- `git-commit-push`, `plan-writer`, `tdd-coding-writer`, `docs-reconciler`, and `code-review-writer` are now node skills by default.
- `start-standard-workflow` remains macro and does not appear in the drawer node-skill select.
- Explicit skill frontmatter `kind: macro`, `kind: node`, `type: macro`, or `type: node` remains authoritative.
