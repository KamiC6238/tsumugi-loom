# Project Guidelines

## Build and Test

Use `pnpm build`, `pnpm test:logic`, `pnpm test:ui`, and `pnpm test:all` for validation.

## Conventions

For any UI task, decide component reuse before implementation.
Check `src/components/ui/` and the configured `shadcn-vue` stack first.
If an existing `shadcn-vue` component or composition can satisfy the task, use it instead of creating a new primitive.
Only introduce custom UI components after confirming the existing `shadcn-vue` set is insufficient, and record that reason in the workflow artifacts when using the standard workflow.
Plan-phase task breakdowns must state the expected component reuse strategy for UI work so Coding does not decide this ad hoc.