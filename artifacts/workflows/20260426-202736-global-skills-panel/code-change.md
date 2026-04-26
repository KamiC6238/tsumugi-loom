# Code Change Artifact

Workflow ID: 20260426-202736-global-skills-panel

## Summary

Implemented a global skills surface for Workflow Studio. The left sidebar now has a Skills entry, the right layout can switch from the workflow canvas to a global skills panel, skill cards are loaded from `.github/skills`, and the node drawer can display/select globally added node skills.

## Source Changes

1. `src/lib/skills.ts`
   - Loads `.github/skills/*/SKILL.md` through Vite raw imports.
   - Parses frontmatter fields used by the UI.
   - Classifies skills as `macro` or `node` with explicit future override support.
   - Provides toggle and added node skill filtering helpers.
2. `src/composables/useWorkflowStudio.ts`
   - Adds global right-panel state: `workflow` or `skills`.
   - Tracks globally added skill ids.
   - Derives added node skills for the drawer.
   - Adds guarded skill toggling and node save payload handling.
3. `src/components/workflow-studio/WorkflowSidebar.vue`
   - Adds a Skills button entry using the existing `Button` component and a lucide icon.
4. `src/components/workflow-studio/SkillsPanel.vue`
   - Displays `macro` and `node` skill cards from the global catalog.
   - Uses switches to reflect and toggle added state.
5. `src/components/workflow-studio/WorkflowNodeDrawer.vue`
   - Adds a node skill select populated only by added node skills.
   - Shows a disabled empty state when no node skills are added.
   - Emits save payloads with node name and optional skill id.
6. `src/lib/workflows.ts`
   - Adds `updateWorkflowNode` for name + skill assignment updates.
   - Keeps `renameWorkflowNode` behavior by delegating to the update path.
7. `src/components/ui/switch` and `src/components/ui/select`
   - Adds reusable lightweight primitives needed by this feature.
8. `vitest.config.ts`, `package.json`, `pnpm-lock.yaml`
   - Adds Vue component unit-test support with `@vue/test-utils`, `happy-dom`, Vue plugin, and alias resolution.
9. `ARCHITECTURE.md` and `README.md`
   - Documents the global skill catalog, Skills panel, added node skill drawer flow, and related runtime/test responsibilities.

## Tests Added or Updated

1. `tests/logic/skills.test.ts`
2. `tests/logic/workflow-studio.test.ts`
3. `tests/logic/workflow-ui.test.ts`
4. `tests/logic/workflow-state.test.ts`

## Component Reuse Notes

1. Reused existing `Button`, `Input`, `Label`, and Drawer components.
2. Added `Switch` and `Select` as `src/components/ui/` primitives because the repository had no existing switch and the select directory was empty.
3. Kept the new feature UI in `src/components/workflow-studio/` rather than expanding `App.vue` beyond composition wiring.

## Verification

1. `pnpm test:logic`: passed, 4 files / 36 tests.
2. `pnpm test:ui`: passed, 7 tests.
3. `pnpm build`: passed.
4. `pnpm exec vue-tsc -b --pretty false`: passed.
5. `git diff --check`: passed.

## Known Notes

1. No Playwright tests were added, per user request.
2. Long-lived docs were reconciled after the implementation stabilized.