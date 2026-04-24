# Architecture

This template keeps durable engineering knowledge under `docs/` so agents and humans can find it in one place.

## Required Documents

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [BACKEND.md](BACKEND.md)
- [FRONTEND.md](FRONTEND.md)
- [PLAN.md](PLAN.md)
- [GOLDEN_RULES.md](GOLDEN_RULES.md)
- [QUALITY.md](QUALITY.md)
- [CODE_QUALITY.md](CODE_QUALITY.md)
- [PROJECT_OPERATIONS.md](PROJECT_OPERATIONS.md)

## Repository Layout

```text
{{PROJECT_NAME}}/
├── AGENTS.md
├── README.md
├── docs/
│   ├── ARCHITECTURE.md
│   ├── BACKEND.md
│   ├── FRONTEND.md
│   ├── PLAN.md
│   ├── GOLDEN_RULES.md
│   ├── QUALITY.md
│   ├── CODE_QUALITY.md
│   ├── PROJECT_OPERATIONS.md
│   ├── exec-plans/
│   │   ├── active/
│   │   └── completed/
│   └── references/
├── scripts/
│   ├── check-doc-updates.js
│   ├── check-doc-updates.config.js
│   ├── check-docs-freshness.js
│   ├── check-docs-consistency.js
│   ├── migrate-completed-plans.js
│   └── install-git-hooks.sh
└── .github/
    └── hooks/
```

## How To Use This File

Read this file before drafting a plan or changing code.

- Use it as the top-level map for the repository and the documentation set.
- Use it to answer two questions first: how documentation stays current, and what execution flow an agent must follow.
- Keep links to the required documents current.
- When implementation changes, update this file in the same branch after the code is verified.

## Documentation Freshness Model

This repository does not treat documentation freshness as a vague expectation. It encodes freshness as a workflow contract:

1. Durable docs live under `docs/` and are required, not optional.
2. Verified implementation is the source of truth.
3. When code changes, the matching durable docs must be updated in the same branch before commit.
4. A task is not complete until both the implementation and the durable docs agree.

Automation enforces the minimum repository guarantees:

- [CODE_QUALITY.md](CODE_QUALITY.md) defines the repository checks.
- `node scripts/check-doc-updates.js` inspects the staged diff and fails when required durable docs are missing from the commit.
- `scripts/check-doc-updates.config.js` maps repository paths to the durable docs they must update and is validated before enforcement.
- `node scripts/check-docs-freshness.js` verifies required files exist, are non-empty, have valid internal links, and do not leave fully completed plans in `docs/exec-plans/active/`.
- `node scripts/check-docs-consistency.js` verifies plan structure, branch naming, branch uniqueness, and explicit red/green/refactor phases.
- `node scripts/migrate-completed-plans.js` moves fully completed plans out of `active/` and into `completed/`.
- `bash scripts/install-git-hooks.sh` installs the pre-commit hook that runs the migration and documentation checks automatically.

Freshness therefore means more than file timestamps. In this template, a document is current only when:

- it matches verified code,
- it still links correctly to the rest of the documentation graph,
- its related execution plan is in the correct lifecycle state,
- and repository checks pass before commit.

When the durable-doc sync guard fails, it should tell the operator both which durable docs are missing and which changed files triggered those requirements.

If stronger guarantees are needed for a concrete product repository, extend these checks so code changes in critical areas require corresponding documentation updates in the same change.

## Choosing Which Durable Docs To Update

Do not encode the full routing logic in this file.

- The routing logic lives in [../.github/skills/doc-update-routing/SKILL.md](../.github/skills/doc-update-routing/SKILL.md).
- The concrete path-to-doc route table lives in `../scripts/check-doc-updates.config.js`.
- Keep durable docs lean. They should describe long-lived architecture, boundaries, conventions, and workflow, not task-by-task change history.
- Update [FRONTEND.md](FRONTEND.md), [BACKEND.md](BACKEND.md), [GOLDEN_RULES.md](GOLDEN_RULES.md), [QUALITY.md](QUALITY.md), [PROJECT_OPERATIONS.md](PROJECT_OPERATIONS.md), and this file only when the verified diff changes their durable truth.

## Agent Execution Flow

The expected agent workflow is:

1. Start from [AGENTS.md](../AGENTS.md).
2. Read [ARCHITECTURE.md](ARCHITECTURE.md), [GOLDEN_RULES.md](GOLDEN_RULES.md), and [PLAN.md](PLAN.md) to understand the repository map, hard rules, and plan lifecycle.
3. Read [FRONTEND.md](FRONTEND.md), [BACKEND.md](BACKEND.md), [QUALITY.md](QUALITY.md), and [PROJECT_OPERATIONS.md](PROJECT_OPERATIONS.md) as needed for the task surface.
4. If the work is non-trivial, create one unique branch for one plan.
5. Draft the plan in `docs/exec-plans/active/`.
6. Execute each plan step using strict red, green, and refactor phases.
7. Update the plan `Progress` section immediately after each completed step.
8. Update only the durable docs whose truth changed, using [../scripts/check-doc-updates.config.js](../scripts/check-doc-updates.config.js) to map changed code paths to the right docs and including [GOLDEN_RULES.md](GOLDEN_RULES.md) when workflow rules or commit gates change.
9. Run durable doc sync, plan migration, and documentation checks.
10. Commit, push, and open a pull request from the same branch.

In short:

- [AGENTS.md](../AGENTS.md) is the entry point.
- [ARCHITECTURE.md](ARCHITECTURE.md) is the project map.
- [GOLDEN_RULES.md](GOLDEN_RULES.md) defines the non-negotiable workflow.
- [PLAN.md](PLAN.md) defines how execution is written and tracked.
- [CODE_QUALITY.md](CODE_QUALITY.md) defines how the repository verifies that the workflow was followed.

## Source Of Truth Rule

If this file disagrees with the implementation, the implementation wins. Update the docs immediately after the code is verified.

## Directory Classification

Every directory in the project must be assigned exactly one classification type. Agents read this table to determine which code-type skill to load before writing or reviewing code in that directory.

### Classification Types

| Type | Description | Example Directories |
|------|-------------|---------------------|
| `business` | Domain logic, features, and user-facing workflows | `src/features/`, `src/pages/`, `src/modules/` |
| `component` | UI components, templates, and rendering units | `src/components/`, `src/views/`, `src/layouts/` |
| `utility` | Pure functions, helpers, and shared logic with no domain coupling | `src/utils/`, `src/helpers/`, `src/lib/` |
| `type` | Type definitions, interfaces, enums, and schema declarations | `src/types/`, `src/interfaces/`, `src/schemas/` |
| `api` | HTTP handlers, RPC endpoints, and API layer adapters | `src/api/`, `src/routes/`, `src/handlers/` |
| `service` | Application services, domain services, and use-case orchestrators | `src/services/`, `src/usecases/` |
| `store` | State management, reducers, and data stores | `src/store/`, `src/state/`, `src/reducers/` |
| `config` | Configuration files, environment setup, and build options | `src/config/`, `config/`, `env/` |
| `test` | Test files and test utilities | `tests/`, `__tests__/`, `spec/` |
| `script` | Automation scripts, CLI tools, and build utilities | `scripts/` |
| `doc` | Durable documentation, plans, and references | `docs/`, `.github/` |

> **Classification is not exhaustive.** If a directory does not fit any type above, the agent must:
> 1. Decide the most accurate type name for the directory.
> 2. Add a new row to the table above.
> 3. Create the corresponding code-type skill under `.github/skills/<type>-conventions/SKILL.md` using the Bootstrap procedure in [code-type-routing](../.github/skills/code-type-routing/SKILL.md).
> 4. Then proceed with the original task.

### Project Directory Map

> Fill in this table when adopting this template in a concrete project. List each top-level code directory, its classification type, and the path to its code-type skill.

| Directory | Type | Code-Type Skill |
|-----------|------|-----------------|
| *(fill in)* | *(fill in)* | *(fill in)* |

## Next Documents

- Frontend conventions: [FRONTEND.md](FRONTEND.md)
- Backend conventions: [BACKEND.md](BACKEND.md)
- Plan template: [PLAN.md](PLAN.md)
- Quality rules: [QUALITY.md](QUALITY.md)
- Workflow rules: [GOLDEN_RULES.md](GOLDEN_RULES.md)