import { describe, expect, it } from 'vitest'

import {
  buildSkillCatalog,
  classifySkillKind,
  getAddedNodeSkills,
  parseSkillMarkdown,
  skillCatalog,
  toggleSkillId,
} from '../../src/lib/skills'

const macroSkillMarkdown = `---
name: start-standard-workflow
description: 'Start the standard implementation workflow from a raw user requirement.'
argument-hint: '用户需求描述'
user-invocable: true
---

# Start Standard Workflow
`

const nodeSkillMarkdown = `---
name: vue
description: Vue 3 Composition API, script setup macros, and reactivity system.
---

# Vue
`

describe('skill catalog', () => {
  it('loads the real project skills from the .github/skills directory', () => {
    const realSkillIds = skillCatalog.map((skill) => skill.id)

    expect(skillCatalog.length).toBeGreaterThanOrEqual(9)
    expect(realSkillIds).toEqual(
      expect.arrayContaining([
        'code-review-writer',
        'docs-reconciler',
        'git-commit-push',
        'plan-writer',
        'start-standard-workflow',
        'tdd-coding-writer',
        'vitest',
        'vue',
        'vue-best-practices',
      ]),
    )
    expect(skillCatalog.every((skill) => skill.path.startsWith('.github/skills/'))).toBe(true)
    expect(skillCatalog.every((skill) => skill.description.length > 0)).toBe(true)
    expect(skillCatalog.find((skill) => skill.id === 'start-standard-workflow')).toMatchObject({
      argumentHint: '用户需求描述',
      userInvocable: true,
    })
  })

  it('parses skill frontmatter from a SKILL.md file', () => {
    const skill = parseSkillMarkdown(
      macroSkillMarkdown,
      '/workspace/.github/skills/start-standard-workflow/SKILL.md',
    )

    expect(skill).toMatchObject({
      id: 'start-standard-workflow',
      name: 'start-standard-workflow',
      description: 'Start the standard implementation workflow from a raw user requirement.',
      argumentHint: '用户需求描述',
      userInvocable: true,
      kind: 'macro',
      path: '.github/skills/start-standard-workflow/SKILL.md',
    })
  })

  it('builds a sorted catalog and classifies workflow skills separately from node skills', () => {
    const catalog = buildSkillCatalog({
      '/workspace/.github/skills/vue/SKILL.md': nodeSkillMarkdown,
      '/workspace/.github/skills/start-standard-workflow/SKILL.md': macroSkillMarkdown,
    })

    expect(catalog.map((skill) => skill.id)).toEqual(['start-standard-workflow', 'vue'])
    expect(catalog.find((skill) => skill.id === 'start-standard-workflow')?.kind).toBe('macro')
    expect(catalog.find((skill) => skill.id === 'vue')?.kind).toBe('node')
  })

  it.each([
    ['code-review-writer', 'node'],
    ['docs-reconciler', 'node'],
    ['git-commit-push', 'node'],
    ['plan-writer', 'node'],
    ['start-standard-workflow', 'macro'],
    ['tdd-coding-writer', 'node'],
    ['vitest', 'node'],
    ['vue', 'node'],
    ['vue-best-practices', 'node'],
  ] as const)('classifies %s as %s', (name, expectedKind) => {
    const realSkill = skillCatalog.find((skill) => skill.id === name)

    expect(realSkill?.kind).toBe(expectedKind)
    expect(classifySkillKind({ name, description: realSkill?.description })).toBe(expectedKind)
  })

  it('only treats start-standard-workflow as an implicit macro when frontmatter has no kind', () => {
    expect(classifySkillKind({
      name: 'git-commit-push',
      description: 'Analyze current git changes, create a commit, and push safely.',
    })).toBe('node')
    expect(classifySkillKind({
      name: 'start-standard-workflow',
      description: 'Start the standard implementation workflow from a raw user requirement.',
    })).toBe('macro')
  })

  it('keeps the real catalog macro list limited to start-standard-workflow', () => {
    expect(skillCatalog.filter((skill) => skill.kind === 'macro').map((skill) => skill.id))
      .toEqual(['start-standard-workflow'])
  })

  it('keeps explicit skill kind frontmatter authoritative', () => {
    expect(classifySkillKind({
      name: 'custom-node',
      description: 'A workflow helper that stays node scoped.',
      kind: 'node',
    })).toBe('node')
    expect(classifySkillKind({
      name: 'custom-macro',
      description: 'Runs a multi-stage workflow.',
      kind: 'macro',
    })).toBe('macro')
  })

  it('toggles added skill ids without duplicating them', () => {
    expect(toggleSkillId([], 'vue')).toEqual(['vue'])
    expect(toggleSkillId(['vue'], 'vue')).toEqual([])
    expect(toggleSkillId(['vue'], 'vitest')).toEqual(['vue', 'vitest'])
  })

  it('returns only added node skills for the drawer select', () => {
    const catalog = buildSkillCatalog({
      '/workspace/.github/skills/start-standard-workflow/SKILL.md': macroSkillMarkdown,
      '/workspace/.github/skills/vue/SKILL.md': nodeSkillMarkdown,
    })

    expect(getAddedNodeSkills(catalog, ['start-standard-workflow', 'vue']).map((skill) => skill.id))
      .toEqual(['vue'])
  })

  it('returns an empty drawer node skill list when no added node skills are available', () => {
    const catalog = buildSkillCatalog({
      '/workspace/.github/skills/start-standard-workflow/SKILL.md': macroSkillMarkdown,
      '/workspace/.github/skills/vue/SKILL.md': nodeSkillMarkdown,
    })

    expect(getAddedNodeSkills(catalog, [])).toEqual([])
    expect(getAddedNodeSkills(catalog, ['start-standard-workflow'])).toEqual([])
    expect(getAddedNodeSkills(catalog, ['missing-skill'])).toEqual([])
  })
})