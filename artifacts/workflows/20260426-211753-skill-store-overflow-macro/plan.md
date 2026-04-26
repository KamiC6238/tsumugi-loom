# Plan: skill store, overflow, and macro classification

## Goal

Fix the skills management flow so skill cards keep long content inside their cards, user-added skills live in Pinia, drawer node-skill options are derived from the shared added-skill state, and only `start-standard-workflow` is classified as a macro.

## User Requirements

1. Skill card text must not overflow outside the card.
2. Integrate Pinia and store user-added skills there, because added skills currently do not reliably appear in the node drawer select list.
3. Only `start-standard-workflow` should be a macro; all other project skills should be node skills.

## Scope

- Add Pinia as the app-level store dependency and install it on the Vue app.
- Introduce a focused skills store for added skill ids and derived added node skills.
- Keep workflow/canvas state in the existing `useWorkflowStudio` composable.
- Update skill classification so the macro rule is explicit and stable.
- Fix the existing skill-card CSS wrapping/containment issue.
- Update existing Vitest and Playwright coverage where behavior changes.

## Out Of Scope

- Persisting skills to localStorage or a backend.
- Replacing the native select implementation with a custom select primitive.
- Redesigning the full skills panel layout or color system.
- Changing workflow node creation or Vue Flow behavior.

## Component Map

- `App.vue`: composition surface that wires `useWorkflowStudio` state into sidebar, skills panel, canvas panel, drawer, and create dialog.
- `SkillsPanel.vue`: presentational skill list grouped by `kind`; receives catalog and added ids, emits `toggleSkill`.
- `WorkflowNodeDrawer.vue`: presentational node editor; receives already-filtered added node skills and renders the existing `Select` component.
- `src/stores/skills.ts`: Pinia store owning user-added skill ids and actions/derived getters for skill selection.
- `src/lib/skills.ts`: pure catalog parsing, classification, and helper functions.

## Component Reuse Strategy

- Reuse the existing `Switch` in `SkillsPanel.vue` for add/remove state.
- Reuse the existing `Select` in `WorkflowNodeDrawer.vue`; no new select primitive is needed.
- Reuse existing shadcn-vue-style shell and card CSS patterns, with focused overflow wrapping rules on skill card content.
- Add only a Pinia store module for shared state; do not create new UI components.

## Task Breakdown

1. Classification contract
   - Change `classifySkillKind` so explicit frontmatter `kind`/`type` still wins, otherwise only `start-standard-workflow` is macro.
   - Update logic tests so `code-review-writer`, `docs-reconciler`, `git-commit-push`, `plan-writer`, and `tdd-coding-writer` are node skills.

2. Pinia integration
   - Add `pinia` to dependencies.
   - Register `createPinia()` in `src/main.ts`.
   - Add `src/stores/skills.ts` with state/actions/getters for `addedSkillIds`, `addedSkills`, `addedNodeSkills`, `isSkillAdded`, and `toggleSkill`.
   - Update `useWorkflowStudio` to consume the store and keep drawer validation based on store-derived `addedNodeSkills`.

3. Skill card containment
   - Update `SkillsPanel.vue` card/list/text CSS so long descriptions, paths, and names wrap inside their card width.
   - Keep the two-group layout and existing switch behavior.

4. Test updates
   - Add/update Vitest coverage for the Pinia skill store and the new classification contract.
   - Update App/composable tests to install or activate Pinia.
   - Add/update Playwright coverage that adding a node-classified skill makes it available in the drawer select.

5. Workflow artifacts
   - Maintain `tdd-cycle.md`, `test-review.md`, `code-change.md`, `test-report.md`, `review.md`, and `manifest.json` as stages complete.

## Acceptance Criteria

- Skill cards keep long descriptions and paths inside card boundaries on the skills panel.
- User-added skill ids are stored in Pinia rather than a local `shallowRef` inside `useWorkflowStudio`.
- Adding a non-`start-standard-workflow` skill makes it available to the node drawer select as a node skill.
- Adding `start-standard-workflow` does not make it available in the node drawer select.
- Existing workflow creation, canvas node editing, and skill panel toggling behavior remain intact.
- `pnpm test:logic` and `pnpm test:ui` pass, or any environment blocker is documented in `test-report.md`.

## Test Strategy

- Use Vitest for pure skill classification, Pinia store behavior, and `useWorkflowStudio` integration.
- Use Vue Test Utils for component wiring through `App.vue`, with Pinia installed in test mounts.
- Use Playwright for the end-to-end user flow: add a node skill from the skills panel, create/open a workflow node, and verify the drawer select contains that skill.
- Run the full required suite: `pnpm test:logic` and `pnpm test:ui`.

## Assumptions

- Pinia state is session-only for this task; persistence is not required unless requested later.
- `start-standard-workflow` is the only implicit macro even if other skills mention workflows, commits, docs, reviews, or planning in their descriptions.
- If a skill file explicitly declares `kind: macro` or `type: macro`, that frontmatter remains authoritative.

## Open Questions

- None blocking.
