import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useSkillsStore } from '../../src/stores/skills'

describe('skills store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('stores added skill ids and exposes added node skills from Pinia state', () => {
    const store = useSkillsStore()

    expect(store.addedSkillIds).toEqual([])
    expect(store.isSkillAdded('git-commit-push')).toBe(false)

    store.toggleSkill('start-standard-workflow')
    store.toggleSkill('git-commit-push')

    expect(store.addedSkillIds).toEqual(['start-standard-workflow', 'git-commit-push'])
    expect(store.isSkillAdded('git-commit-push')).toBe(true)
    expect(store.addedNodeSkills.map((skill) => skill.id)).toEqual(['git-commit-push'])
  })

  it('ignores unknown skill ids and keeps toggles unique', () => {
    const store = useSkillsStore()

    store.toggleSkill('missing-skill')
    store.toggleSkill('vue')
    store.toggleSkill('vue')

    expect(store.addedSkillIds).toEqual([])
  })
})
