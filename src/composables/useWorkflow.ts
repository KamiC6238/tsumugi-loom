import { storeToRefs } from 'pinia'

import { useWorkflowsStore } from '@/stores/workflows'

export function useWorkflow() {
  const workflowsStore = useWorkflowsStore()
  const { workflows, activeWorkflowId, activeWorkflow } = storeToRefs(workflowsStore)

  return {
    workflows,
    activeWorkflowId,
    activeWorkflow,
    createWorkflow: workflowsStore.createWorkflow,
    selectWorkflow: workflowsStore.selectWorkflow,
    updateWorkflowNode: workflowsStore.updateWorkflowNode,
    getNode: workflowsStore.getNode,
  }
}