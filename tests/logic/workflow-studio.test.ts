import { describe, expect, it } from 'vitest'

import { useWorkflowStudio } from '../../src/composables/useWorkflowStudio'

describe('workflow studio skills state', () => {
  it('switches the right layout between workflow canvas and the global skills panel', () => {
    const studio = useWorkflowStudio()

    expect(studio.activePanel.value).toBe('workflow')
    expect(studio.isSkillsPanelActive.value).toBe(false)

    studio.openSkillsPanel()

    expect(studio.activePanel.value).toBe('skills')
    expect(studio.isSkillsPanelActive.value).toBe(true)

    studio.openWorkflowPanel()

    expect(studio.activePanel.value).toBe('workflow')
    expect(studio.isSkillsPanelActive.value).toBe(false)
  })

  it('derives switch checked state from global added skill ids', () => {
    const studio = useWorkflowStudio()

    expect(studio.addedSkillIds.value).toEqual([])
    expect(studio.isSkillAdded('vue')).toBe(false)

    studio.toggleSkill('vue')

    expect(studio.addedSkillIds.value).toEqual(['vue'])
    expect(studio.isSkillAdded('vue')).toBe(true)

    studio.toggleSkill('vue')

    expect(studio.addedSkillIds.value).toEqual([])
    expect(studio.isSkillAdded('vue')).toBe(false)
  })

  it('ignores toggle requests for unknown skills', () => {
    const studio = useWorkflowStudio()

    studio.toggleSkill('missing-skill')

    expect(studio.addedSkillIds.value).toEqual([])
  })

  it('exposes only globally added node skills for the node drawer', () => {
    const studio = useWorkflowStudio()

    studio.toggleSkill('start-standard-workflow')
    studio.toggleSkill('vue')

    expect(studio.addedNodeSkills.value.map((skill) => skill.id)).toEqual(['vue'])
  })

  it('closes an open node drawer when the global skills panel opens', () => {
    const studio = useWorkflowStudio()

    studio.createWorkflow('Order Intake')
    const nodeId = studio.activeWorkflow.value?.nodes[0]?.id as string

    studio.openNodeDrawer(nodeId)
    expect(studio.isNodeDrawerOpen.value).toBe(true)

    studio.openSkillsPanel()

    expect(studio.activePanel.value).toBe('skills')
    expect(studio.isNodeDrawerOpen.value).toBe(false)
  })

  it('saves a selected node skill only when it is an added node skill', () => {
    const studio = useWorkflowStudio()

    studio.createWorkflow('Order Intake')
    const targetNodeId = studio.activeWorkflow.value?.nodes[0]?.id as string

    studio.openNodeDrawer(targetNodeId)
    studio.toggleSkill('vue')
    studio.saveSelectedNode({ name: 'Brief', skillId: 'vue' })

    expect(studio.activeWorkflow.value?.nodes[0]?.data).toMatchObject({
      label: 'Brief',
      skillId: 'vue',
    })

    studio.toggleSkill('start-standard-workflow')
    studio.saveSelectedNode({ name: 'Brief', skillId: 'start-standard-workflow' })

    expect(studio.activeWorkflow.value?.nodes[0]?.data?.skillId).toBeUndefined()

    studio.saveSelectedNode({ name: 'Brief', skillId: 'missing-skill' })

    expect(studio.activeWorkflow.value?.nodes[0]?.data?.skillId).toBeUndefined()
  })
})