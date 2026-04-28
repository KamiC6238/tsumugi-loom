import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { useWorkflow } from '../../src/composables/useWorkflow'
import { useWorkflowsStore } from '../../src/stores/workflows'

describe('workflow store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('stores workflow records in Pinia and exposes them through useWorkflow', () => {
    const workflow = useWorkflow()
    const store = useWorkflowsStore()

    expect(workflow.workflows.value).toEqual([])
    expect(store.workflows).toEqual([])

    expect(workflow.createWorkflow('Orders Intake')).toBe(true)

    expect(workflow.workflows.value.map((record) => record.name)).toEqual(['Orders Intake'])
    expect(store.workflows.map((record) => record.name)).toEqual(['Orders Intake'])
    expect(workflow.activeWorkflow.value?.name).toBe('Orders Intake')
  })

  it('updates node config through the workflow hook store actions', () => {
    const workflow = useWorkflow()

    workflow.createWorkflow('Orders Intake')

    const workflowId = workflow.activeWorkflowId.value as string
    const nodeId = workflow.activeWorkflow.value?.nodes[0]?.id as string

    expect(workflow.updateWorkflowNode(workflowId, nodeId, {
      name: 'Brief',
      skillId: 'vue',
    })).toBe(true)

    expect(workflow.activeWorkflow.value?.nodes[0]?.data).toMatchObject({
      label: 'Brief',
      skillId: 'vue',
    })
    expect(workflow.activeWorkflow.value?.nodeConfigs[nodeId]).toEqual({
      name: 'Brief',
      skillId: 'vue',
    })
  })

  it('keeps node skill config available after switching workflows', () => {
    const workflow = useWorkflow()

    workflow.createWorkflow('Orders Intake')

    const ordersWorkflowId = workflow.activeWorkflowId.value as string
    const ordersReviewNodeId = workflow.activeWorkflow.value?.nodes[1]?.id as string

    workflow.updateWorkflowNode(ordersWorkflowId, ordersReviewNodeId, {
      name: 'Orders Intake review',
      skillId: 'git-commit-push',
    })
    workflow.createWorkflow('Approval Loop')
    workflow.selectWorkflow(ordersWorkflowId)

    expect(workflow.activeWorkflow.value?.nodeConfigs[ordersReviewNodeId]).toEqual({
      name: 'Orders Intake review',
      skillId: 'git-commit-push',
    })
    expect(workflow.getNode(ordersReviewNodeId)?.data).toMatchObject({
      label: 'Orders Intake review',
      skillId: 'git-commit-push',
    })
  })
})