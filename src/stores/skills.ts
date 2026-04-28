import { defineStore } from 'pinia'
import { computed, shallowRef } from 'vue'

import {
  getAddedNodeSkills,
  getAddedSkills,
  skillCatalog,
  toggleSkillId,
} from '@/lib/skills'

export const useSkillsStore = defineStore('skills', () => {
  const addedSkillIds = shallowRef<string[]>([])
  const addedSkills = computed(() => getAddedSkills(skillCatalog, addedSkillIds.value))
  const addedNodeSkills = computed(() => getAddedNodeSkills(skillCatalog, addedSkillIds.value))

  function isSkillAdded(skillId: string) {
    return addedSkillIds.value.includes(skillId)
  }

  function toggleSkill(skillId: string) {
    const skillExists = skillCatalog.some((skill) => skill.id === skillId)

    if (!skillExists) {
      return
    }

    addedSkillIds.value = toggleSkillId(addedSkillIds.value, skillId)
  }

  return {
    addedSkillIds,
    addedSkills,
    addedNodeSkills,
    isSkillAdded,
    toggleSkill,
  }
})
