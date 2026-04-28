import { describe, expect, it } from 'vitest'

import {
  appendWorkflow,
  createEmptyWorkflowState,
  getActiveWorkflow,
  renameWorkflowNode,
  selectWorkflow,
  updateWorkflowNode,
} from '../../src/lib/workflows'

describe('workflow state', () => {
  it('starts empty with no active workflow', () => {
    const state = createEmptyWorkflowState()

    expect(state).toEqual({
      workflows: [],
      activeWorkflowId: null,
    })
    expect(getActiveWorkflow(state)).toBeNull()
  })

  it('adds a workflow, trims the name, and auto-selects it', () => {
    const state = appendWorkflow(createEmptyWorkflowState(), '  Order Intake  ')
    const createdWorkflow = state.workflows.at(-1)
    const labels = createdWorkflow?.nodes.map((node) => String(node.data?.label ?? ''))

    expect(state.workflows).toHaveLength(1)
    expect(createdWorkflow).toMatchObject({
      name: 'Order Intake',
    })
    expect(createdWorkflow?.id).toBeTruthy()
    expect(createdWorkflow?.nodes.length).toBeGreaterThan(0)
    expect(createdWorkflow?.edges.length).toBeGreaterThan(0)
    expect(labels).toContain('Order Intake brief')
    expect(labels).toContain('Order Intake review')
    expect(Object.values(createdWorkflow?.nodeConfigs ?? {}).map((config) => config.name))
      .toEqual(labels)
    expect(state.activeWorkflowId).toBe(createdWorkflow?.id)
    expect(getActiveWorkflow(state)?.name).toBe('Order Intake')
  })

  it('keeps multiple workflows and switches the active workflow by id', () => {
    const firstPass = appendWorkflow(createEmptyWorkflowState(), 'Order Intake')
    const firstWorkflowId = firstPass.activeWorkflowId
    const firstWorkflow = getActiveWorkflow(firstPass)
    const firstLabels = firstWorkflow?.nodes.map((node) => String(node.data?.label ?? ''))
    const secondPass = appendWorkflow(firstPass, 'Approval Loop')
    const secondWorkflow = getActiveWorkflow(secondPass)
    const secondLabels = secondWorkflow?.nodes.map((node) => String(node.data?.label ?? ''))

    expect(secondPass.workflows).toHaveLength(2)
    expect(secondPass.workflows.map((workflow) => workflow.name)).toEqual([
      'Order Intake',
      'Approval Loop',
    ])
    expect(secondWorkflow?.name).toBe('Approval Loop')
    expect(secondPass.activeWorkflowId).toBe(secondWorkflow?.id)
    expect(secondWorkflow?.id).not.toBe(firstWorkflowId)
    expect(secondWorkflow?.nodes).not.toBe(firstWorkflow?.nodes)
    expect(secondWorkflow?.edges).not.toBe(firstWorkflow?.edges)
    expect(firstLabels).toContain('Order Intake brief')
    expect(secondLabels).toContain('Approval Loop brief')

    const reselected = selectWorkflow(secondPass, firstWorkflowId as string)
    const reselectedLabels = getActiveWorkflow(reselected)?.nodes.map((node) =>
      String(node.data?.label ?? ''),
    )

    expect(reselected.activeWorkflowId).toBe(firstWorkflowId)
    expect(getActiveWorkflow(reselected)?.name).toBe('Order Intake')
    expect(reselectedLabels).toEqual(firstLabels)
    expect(getActiveWorkflow(secondPass)?.name).toBe('Approval Loop')
  })

  it('ignores selection requests for unknown workflow ids', () => {
    const state = appendWorkflow(createEmptyWorkflowState(), 'Order Intake')

    expect(selectWorkflow(state, 'missing-id')).toBe(state)
  })

  it('ignores blank names when creating a workflow', () => {
    const existingState = appendWorkflow(createEmptyWorkflowState(), 'Order Intake')
    const state = appendWorkflow(existingState, '   ')

    expect(state).toBe(existingState)
    expect(state.workflows).toHaveLength(1)
    expect(state.activeWorkflowId).toBe(existingState.activeWorkflowId)
    expect(getActiveWorkflow(state)?.name).toBe('Order Intake')
  })

  it('renames only the targeted node label within the selected workflow', () => {
    const firstPass = appendWorkflow(createEmptyWorkflowState(), 'Order Intake')
    const secondPass = appendWorkflow(firstPass, 'Approval Loop')
    const targetWorkflowId = firstPass.activeWorkflowId as string
    const targetWorkflow = secondPass.workflows.find((workflow) => workflow.id === targetWorkflowId)
    const targetNodeId = targetWorkflow?.nodes[1]?.id as string

    const renamed = renameWorkflowNode(
      secondPass,
      targetWorkflowId,
      targetNodeId,
      '  Manual review  ',
    )

    const renamedWorkflow = renamed.workflows.find((workflow) => workflow.id === targetWorkflowId)
    const untouchedWorkflow = renamed.workflows.find((workflow) => workflow.name === 'Approval Loop')
    const renamedLabels = renamedWorkflow?.nodes.map((node) => String(node.data?.label ?? ''))
    const untouchedLabels = untouchedWorkflow?.nodes.map((node) => String(node.data?.label ?? ''))

    expect(renamed).not.toBe(secondPass)
    expect(renamed.activeWorkflowId).toBe(secondPass.activeWorkflowId)
    expect(renamedWorkflow?.nodes[1]?.data).toMatchObject({
      label: 'Manual review',
    })
    expect(renamedLabels).toContain('Order Intake brief')
    expect(renamedLabels).toContain('Manual review')
    expect(renamedLabels).toContain('Order Intake release')
    expect(untouchedLabels).toContain('Approval Loop brief')
    expect(untouchedLabels).toContain('Approval Loop review')
    expect(untouchedLabels).toContain('Approval Loop release')
  })

  it('ignores blank node names when renaming a node', () => {
    const state = appendWorkflow(createEmptyWorkflowState(), 'Order Intake')
    const workflow = getActiveWorkflow(state)
    const targetNodeId = workflow?.nodes[0]?.id as string

    expect(renameWorkflowNode(state, workflow?.id as string, targetNodeId, '   ')).toBe(state)
  })

  it('ignores rename requests for unknown workflows or node ids', () => {
    const state = appendWorkflow(createEmptyWorkflowState(), 'Order Intake')
    const workflow = getActiveWorkflow(state)

    expect(renameWorkflowNode(state, 'missing-workflow', 'node-1', 'Renamed')).toBe(state)
    expect(renameWorkflowNode(state, workflow?.id as string, 'missing-node', 'Renamed')).toBe(state)
  })

  it('updates and clears a node skill assignment while preserving rename behavior', () => {
    const state = appendWorkflow(createEmptyWorkflowState(), 'Order Intake')
    const workflow = getActiveWorkflow(state)
    const targetNodeId = workflow?.nodes[1]?.id as string

    const assigned = updateWorkflowNode(state, workflow?.id as string, targetNodeId, {
      name: 'Manual review',
      skillId: 'vue',
    })
    const assignedNode = getActiveWorkflow(assigned)?.nodes[1]

    expect(assignedNode?.data).toMatchObject({
      label: 'Manual review',
      skillId: 'vue',
    })

    const renamed = renameWorkflowNode(assigned, workflow?.id as string, targetNodeId, 'Final review')
    const renamedNode = getActiveWorkflow(renamed)?.nodes[1]

    expect(renamedNode?.data).toMatchObject({
      label: 'Final review',
      skillId: 'vue',
    })

    const cleared = updateWorkflowNode(renamed, workflow?.id as string, targetNodeId, {
      name: 'Final review',
      skillId: null,
    })
    const clearedNode = getActiveWorkflow(cleared)?.nodes[1]

    expect(clearedNode?.data).toMatchObject({
      label: 'Final review',
    })
    expect(clearedNode?.data?.skillId).toBeUndefined()
  })

  it('persists node skill config on the targeted workflow after switching away and back', () => {
    const firstPass = appendWorkflow(createEmptyWorkflowState(), 'Order Intake')
    const targetWorkflowId = firstPass.activeWorkflowId as string
    const secondPass = appendWorkflow(firstPass, 'Approval Loop')
    const targetWorkflow = secondPass.workflows.find((workflow) => workflow.id === targetWorkflowId)
    const targetNodeId = targetWorkflow?.nodes[1]?.id as string

    const assigned = updateWorkflowNode(secondPass, targetWorkflowId, targetNodeId, {
      name: 'Order Intake review',
      skillId: 'git-commit-push',
    })
    const switchedAway = selectWorkflow(assigned, secondPass.activeWorkflowId as string)
    const switchedBack = selectWorkflow(switchedAway, targetWorkflowId)
    const restoredWorkflow = getActiveWorkflow(switchedBack)
    const restoredNode = restoredWorkflow?.nodes.find((node) => node.id === targetNodeId)

    expect(restoredWorkflow?.nodeConfigs[targetNodeId]).toEqual({
      name: 'Order Intake review',
      skillId: 'git-commit-push',
    })
    expect(restoredNode?.data).toMatchObject({
      label: 'Order Intake review',
      skillId: 'git-commit-push',
    })
  })
})