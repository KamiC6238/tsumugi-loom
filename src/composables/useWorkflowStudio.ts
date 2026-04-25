import type { Node } from '@vue-flow/core'
import { computed, shallowRef } from 'vue'

import {
  appendWorkflow,
  createEmptyWorkflowState,
  getActiveWorkflow,
  renameWorkflowNode,
  selectWorkflow,
} from '@/lib/workflows'
import type { WorkflowRecord, WorkflowState } from '@/lib/workflows'

export function useWorkflowStudio() {
  const workflowState = shallowRef<WorkflowState>(createEmptyWorkflowState())
  const isCreateDialogOpen = shallowRef(false)
  const selectedNodeId = shallowRef<string | null>(null)

  const workflows = computed(() => workflowState.value.workflows)
  const activeWorkflowId = computed(() => workflowState.value.activeWorkflowId)
  const activeWorkflow = computed<WorkflowRecord | null>(() =>
    getActiveWorkflow(workflowState.value),
  )
  const selectedNode = computed<Node | null>(() => {
    if (!activeWorkflow.value || !selectedNodeId.value) {
      return null
    }

    return activeWorkflow.value.nodes.find((node) => node.id === selectedNodeId.value) ?? null
  })
  const isNodeDrawerOpen = computed(() => selectedNode.value !== null)

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
    closeNodeDrawer()
    closeCreateDialog()
  }

  function activateWorkflow(workflowId: string) {
    const nextState = selectWorkflow(workflowState.value, workflowId)

    if (nextState === workflowState.value) {
      return
    }

    workflowState.value = nextState
    closeNodeDrawer()
  }

  function openNodeDrawer(nodeId: string) {
    if (!activeWorkflow.value) {
      return
    }

    const nodeExists = activeWorkflow.value.nodes.some((node) => node.id === nodeId)

    if (!nodeExists) {
      return
    }

    selectedNodeId.value = nodeId
  }

  function closeNodeDrawer() {
    selectedNodeId.value = null
  }

  function setNodeDrawerOpen(nextOpen: boolean) {
    if (!nextOpen) {
      closeNodeDrawer()
    }
  }

  function renameSelectedNode(name: string) {
    if (!activeWorkflowId.value || !selectedNodeId.value) {
      return
    }

    const nextState = renameWorkflowNode(
      workflowState.value,
      activeWorkflowId.value,
      selectedNodeId.value,
      name,
    )

    if (nextState === workflowState.value) {
      return
    }

    workflowState.value = nextState
  }

  return {
    workflows,
    activeWorkflowId,
    activeWorkflow,
    selectedNode,
    isCreateDialogOpen,
    isNodeDrawerOpen,
    openCreateDialog,
    closeCreateDialog,
    createWorkflow,
    activateWorkflow,
    openNodeDrawer,
    closeNodeDrawer,
    setNodeDrawerOpen,
    renameSelectedNode,
  }
}