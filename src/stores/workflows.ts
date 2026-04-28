import type { Node } from '@vue-flow/core'
import { defineStore } from 'pinia'
import { computed, shallowRef } from 'vue'

import {
  appendWorkflow,
  createEmptyWorkflowState,
  getActiveWorkflow,
  getWorkflowNode,
  selectWorkflow as selectWorkflowInState,
  updateWorkflowNode as updateWorkflowNodeInState,
} from '@/lib/workflows'
import type { WorkflowState } from '@/lib/workflows'

export interface WorkflowNodeSavePayload {
  name: string
  skillId?: string | null
}

export const useWorkflowsStore = defineStore('workflows', () => {
  const workflowState = shallowRef<WorkflowState>(createEmptyWorkflowState())

  const workflows = computed(() => workflowState.value.workflows)
  const activeWorkflowId = computed(() => workflowState.value.activeWorkflowId)
  const activeWorkflow = computed(() => getActiveWorkflow(workflowState.value))

  function createWorkflow(name: string) {
    const nextState = appendWorkflow(workflowState.value, name)

    if (nextState === workflowState.value) {
      return false
    }

    workflowState.value = nextState

    return true
  }

  function selectWorkflow(workflowId: string) {
    const workflowExists = workflows.value.some((workflow) => workflow.id === workflowId)

    if (!workflowExists) {
      return false
    }

    workflowState.value = selectWorkflowInState(workflowState.value, workflowId)

    return true
  }

  function updateWorkflowNode(
    workflowId: string,
    nodeId: string,
    payload: WorkflowNodeSavePayload,
  ) {
    const nextState = updateWorkflowNodeInState(workflowState.value, workflowId, nodeId, payload)

    if (nextState === workflowState.value) {
      return false
    }

    workflowState.value = nextState

    return true
  }

  function getNode(nodeId: string): Node | null {
    if (!activeWorkflow.value) {
      return null
    }

    return getWorkflowNode(activeWorkflow.value, nodeId)
  }

  return {
    workflows,
    activeWorkflowId,
    activeWorkflow,
    createWorkflow,
    selectWorkflow,
    updateWorkflowNode,
    getNode,
  }
})