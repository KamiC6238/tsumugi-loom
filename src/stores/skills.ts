import { defineStore } from 'pinia'

import {
  getAddedNodeSkills,
  getAddedSkills,
  skillCatalog,
  toggleSkillId,
} from '@/lib/skills'

interface SkillsState {
  addedSkillIds: string[]
}

export const useSkillsStore = defineStore('skills', {
  state: (): SkillsState => ({
    addedSkillIds: [],
  }),
  getters: {
    addedSkills(state) {
      return getAddedSkills(skillCatalog, state.addedSkillIds)
    },
    addedNodeSkills(state) {
      return getAddedNodeSkills(skillCatalog, state.addedSkillIds)
    },
  },
  actions: {
    isSkillAdded(skillId: string) {
      return this.addedSkillIds.includes(skillId)
    },
    toggleSkill(skillId: string) {
      const skillExists = skillCatalog.some((skill) => skill.id === skillId)

      if (!skillExists) {
        return
      }

      this.addedSkillIds = toggleSkillId(this.addedSkillIds, skillId)
    },
  },
})
