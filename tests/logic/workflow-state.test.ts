import { describe, expect, it } from 'vitest'

import {
  appendWorkflow,
  createEmptyWorkflowState,
  getActiveWorkflow,
  selectWorkflow,
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
})