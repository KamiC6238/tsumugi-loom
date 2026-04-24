---
name: code-type-routing
description: "Use when: before writing or reviewing any code, after reading ARCHITECTURE.md and identifying the target directory. Determines which code-type skill governs the target code, loads it, and bootstraps a new skill if none exists."
---

# Code-Type Routing

Identify the code type of the target directory, load the corresponding skill, and bootstrap a new one if it does not yet exist.

## When To Use

- Before writing, editing, or reviewing any code in an implementation step.
- After reading `docs/ARCHITECTURE.md` and identifying which directory is affected.
- The relevant `execution-planning` step requires a code-type skill to be loaded before proceeding.

## Outcome

- The correct code-type skill is loaded and its rules are understood.
- If no matching skill existed, a new classification and skill were created first, and are now loaded.
- Code is only written after the code-type skill is active.

## Procedure

### Step 1: Read The Directory Classification Table

1. Open `docs/ARCHITECTURE.md`.
2. Find the `## Directory Classification` section.
3. Locate the **Project Directory Map** table.
4. Find the row whose `Directory` column prefix matches the path of the file you are about to write or change.

### Step 2: Identify The Code-Type Skill

From the matching row, read the `Code-Type Skill` column value.

- If the value is a path to an existing `.github/skills/.../SKILL.md` file, go to **Step 3: Load The Skill**.
- If the row exists but the skill file is missing or the path is `*(fill in)*`, go to **Step 4: Bootstrap**.
- If no row matches the target directory at all, go to **Step 4: Bootstrap**.

### Step 3: Load The Skill

1. Read the skill file identified in Step 2 using `read_file`.
2. Internalize the rules, naming conventions, and patterns it defines.
3. Hold the skill's rules active for the duration of the current implementation step.

### Step 3.5: Resolve Package Dependencies Via context7

Before writing any implementation code, identify every `package.json` dependency the current task will use and query its latest documentation.

1. Open `package.json` in the affected package or repository root.
2. For each dependency that the implementation will call into:
   a. Use the context7 MCP tool to resolve its documentation (`mcp_context7_resolve-library-id` then `mcp_context7_get-library-docs`).
   b. Read the returned documentation and hold the relevant API sections active alongside the code-type skill rules.
3. If context7 returns no result for a package, record that explicitly and fall back to the installed version's local type definitions or README.
4. Do not assume training-time knowledge about any dependency API. The context7 result is authoritative.

After completing this step, return to the calling workflow (usually `execution-planning` Step 4).

### Step 4: Bootstrap — Create A New Classification And Skill

Use this path when no classification or skill exists for the target directory.

#### 4a. Choose The Classification Type

1. Examine the target directory's contents and purpose.
2. Check the **Classification Types** table in `docs/ARCHITECTURE.md` for the closest match.
3. If a match exists, use its type name.
4. If no type fits, invent a new type name that accurately describes the directory's role. Use `kebab-case`. Examples: `hook`, `middleware`, `migration`, `mock`, `fixture`.

#### 4b. Register The New Classification

1. If you invented a new type in 4a, add a new row to the **Classification Types** table in `docs/ARCHITECTURE.md`.
   - Column 1 `Type`: the new type name in backticks.
   - Column 2 `Description`: one sentence describing what belongs here.
   - Column 3 `Example Directories`: two or three representative path examples.
2. Add a new row to the **Project Directory Map** table for the target directory:
   - Column 1 `Directory`: the directory path.
   - Column 2 `Type`: the chosen type name.
   - Column 3 `Code-Type Skill`: the path `.github/skills/<type>-conventions/SKILL.md`.

#### 4c. Create The Skill File

Create `.github/skills/<type>-conventions/SKILL.md` with the following scaffold:

```markdown
---
name: <type>-conventions
description: "Use when: writing or reviewing code in <describe the directory type>."
---

# <Type> Conventions

## When To Use

- Writing or editing files in directories classified as `<type>`.

## Naming

- [Fill in naming rules for files, functions, classes, and variables.]

## Structure

- [Fill in structural rules: file organization, module boundaries, exports.]

## Patterns

- [Fill in approved patterns and anti-patterns for this code type.]

## Testing

- [Fill in how this code type should be tested: unit, integration, mocks.]

## Examples

- [Fill in one or two short canonical examples, or link to real files in the project.]
```

> After bootstrapping, immediately proceed to **Step 3: Load The Skill** and apply the new skill's rules for the current task. Fill in the scaffold's placeholders incrementally as you gain knowledge about the codebase — do not block implementation on completing every section.

### Step 5: Confirm Skill Is Active

Before returning to the caller, state explicitly which skill is now active. Example:

> Code-type routing complete. Loaded: `.github/skills/utility-conventions/SKILL.md`. Applying utility function rules for this step.

## Hard Rules

1. Never write implementation code before this skill has completed and a code-type skill is loaded.
2. If the target path spans multiple directories with different types, load the skill for each type in turn before writing any code.
3. When bootstrapping, add the new classification to `docs/ARCHITECTURE.md` in the **same branch** before any code is written.
4. A bootstrapped skill scaffold is a live document. Update it with real examples and refined rules as the implementation proceeds.
5. Do not invent a new type if an existing type accurately covers the directory. Prefer reuse over fragmentation.
