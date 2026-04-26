# TDD Cycle

## Scope

Implemented the plan in four focused slices: skill classification, Pinia-backed added skills, skill card containment, and drawer select UI coverage.

## Step 1: Classification Contract

- Path: product-level Vitest.
- Tests changed: `tests/logic/skills.test.ts`.
- RED: targeted logic run failed under the old keyword classifier, with expected `node` but actual `macro` for formerly keyword-matched skills.
- GREEN: replaced keyword-term inference with an explicit implicit macro allowlist containing only `start-standard-workflow`; explicit `kind`/`type` frontmatter still wins.
- REFACTOR: added a strict real catalog macro id assertion so future drift is caught.

## Step 2: Pinia Added Skills Store

- Path: product-level Vitest.
- Tests changed: `tests/logic/skills-store.test.ts`, `tests/logic/workflow-studio.test.ts`, `tests/logic/workflow-ui.test.ts`.
- RED: added store/composable/App wiring expectations before moving local added skill state out of `useWorkflowStudio`.
- GREEN: installed Pinia, registered it in `src/main.ts`, added `src/stores/skills.ts`, and updated `useWorkflowStudio` to use `storeToRefs(useSkillsStore())`.
- REFACTOR: added an explicit `WorkflowStudioApi` return type so the composable contract stays visible after the store migration.

## Step 3: Skill Card Containment

- Path: UI behavior with Playwright layout assertion.
- Tests changed: `tests/ui/workflow-sidebar.spec.ts`.
- Review adjustment: first pass had no direct overflow assertion; Test Case Reviewer requested a real layout check.
- GREEN: added desktop and mobile viewport checks that `.skill-name`, `.skill-description`, and `.skill-path` stay within each `.skill-card` and do not horizontally scroll.
- Implementation: added `min-width: 0`, `overflow-wrap: anywhere`, and responsive `minmax(min(100%, 15rem), 1fr)` card columns in `SkillsPanel.vue`.

## Step 4: Drawer Select Flow

- Path: product-level Playwright.
- Tests changed: `tests/ui/workflow-sidebar.spec.ts`.
- GREEN: added a user flow that toggles `start-standard-workflow` and `git-commit-push`, creates a workflow, opens a node drawer, and verifies only `git-commit-push` appears in the node skill select.

## Verification During Coding

- Targeted Vitest after implementation: 32 passed, 0 failed.
- Targeted Playwright after implementation: 2 passed, 0 failed.
- Test Case Reviewer final verdict: approved.
