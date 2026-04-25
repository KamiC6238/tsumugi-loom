import { computed, shallowRef } from 'vue'

import {
  appendWorkflow,
  createEmptyWorkflowState,
  getActiveWorkflow,
  selectWorkflow,
} from '@/lib/workflows'
import type { WorkflowRecord, WorkflowState } from '@/lib/workflows'

export function useWorkflowStudio() {
  const workflowState = shallowRef<WorkflowState>(createEmptyWorkflowState())
  const isCreateDialogOpen = shallowRef(false)

  const workflows = computed(() => workflowState.value.workflows)
  const activeWorkflowId = computed(() => workflowState.value.activeWorkflowId)
  const activeWorkflow = computed<WorkflowRecord | null>(() =>
    getActiveWorkflow(workflowState.value),
  )

  function openCreateDialog() {
    isCreateDialogOpen.value = true
  }

  function closeCreateDialog() {
    isCreateDialogOpen.value = false
  }

  function createWorkflow(name: string) {
    const nextState = appendWorkflow(workflowState.value, name)

    if (nextState === workflowState.value) {
      return
    }

    workflowState.value = nextState
    closeCreateDialog()
  }

  function activateWorkflow(workflowId: string) {
    workflowState.value = selectWorkflow(workflowState.value, workflowId)
  }

  return {
    workflows,
    activeWorkflowId,
    activeWorkflow,
    isCreateDialogOpen,
    openCreateDialog,
    closeCreateDialog,
    createWorkflow,
    activateWorkflow,
  }
}