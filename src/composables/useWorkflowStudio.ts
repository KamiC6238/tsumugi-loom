import type { Node } from '@vue-flow/core'
import { storeToRefs } from 'pinia'
import { computed, shallowRef } from 'vue'
import type { ComputedRef, Ref } from 'vue'

import { skillCatalog } from '@/lib/skills'
import type { SkillCatalogItem } from '@/lib/skills'
import {
  appendWorkflow,
  createEmptyWorkflowState,
  getActiveWorkflow,
  selectWorkflow,
  updateWorkflowNode,
} from '@/lib/workflows'
import type { WorkflowRecord, WorkflowState } from '@/lib/workflows'
import { useSkillsStore } from '@/stores/skills'

export interface SelectedNodeSavePayload {
  name: string
  skillId?: string | null
}

export type WorkflowStudioPanel = 'workflow' | 'skills'

export interface WorkflowStudioApi {
  skills: SkillCatalogItem[]
  workflows: ComputedRef<WorkflowRecord[]>
  activeWorkflowId: ComputedRef<string | null>
  activeWorkflow: ComputedRef<WorkflowRecord | null>
  activePanel: Ref<WorkflowStudioPanel>
  selectedNode: ComputedRef<Node | null>
  addedSkillIds: Ref<string[]>
  addedSkills: Ref<SkillCatalogItem[]>
  addedNodeSkills: Ref<SkillCatalogItem[]>
  isCreateDialogOpen: Ref<boolean>
  isNodeDrawerOpen: ComputedRef<boolean>
  isSkillsPanelActive: ComputedRef<boolean>
  openWorkflowPanel: () => void
  openSkillsPanel: () => void
  openCreateDialog: () => void
  closeCreateDialog: () => void
  createWorkflow: (name: string) => void
  activateWorkflow: (workflowId: string) => void
  openNodeDrawer: (nodeId: string) => void
  closeNodeDrawer: () => void
  setNodeDrawerOpen: (nextOpen: boolean) => void
  renameSelectedNode: (name: string) => void
  saveSelectedNode: (payload: SelectedNodeSavePayload) => void
  isSkillAdded: (skillId: string) => boolean
  toggleSkill: (skillId: string) => void
}

export function useWorkflowStudio(): WorkflowStudioApi {
  const skillsStore = useSkillsStore()
  const { addedSkillIds, addedSkills, addedNodeSkills } = storeToRefs(skillsStore)
  const workflowState = shallowRef<WorkflowState>(createEmptyWorkflowState())
  const activePanel = shallowRef<WorkflowStudioPanel>('workflow')
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
  const isSkillsPanelActive = computed(() => activePanel.value === 'skills')

  function openWorkflowPanel() {
    activePanel.value = 'workflow'
  }

  function openSkillsPanel() {
    activePanel.value = 'skills'
    closeNodeDrawer()
  }

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
    openWorkflowPanel()
    closeNodeDrawer()
    closeCreateDialog()
  }

  function activateWorkflow(workflowId: string) {
    const nextState = selectWorkflow(workflowState.value, workflowId)

    if (nextState === workflowState.value) {
      return
    }

    workflowState.value = nextState
    openWorkflowPanel()
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
    saveSelectedNode({ name })
  }

  function saveSelectedNode(payload: SelectedNodeSavePayload) {
    if (!activeWorkflowId.value || !selectedNodeId.value) {
      return
    }

    const nextState = updateWorkflowNode(
      workflowState.value,
      activeWorkflowId.value,
      selectedNodeId.value,
      {
        name: payload.name,
        skillId: getAllowedNodeSkillId(payload.skillId),
      },
    )

    if (nextState === workflowState.value) {
      return
    }

    workflowState.value = nextState
  }

  function getAllowedNodeSkillId(skillId: string | null | undefined) {
    if (skillId === undefined) {
      return undefined
    }

    if (!skillId) {
      return null
    }

    return addedNodeSkills.value.some((skill) => skill.id === skillId) ? skillId : null
  }

  function isSkillAdded(skillId: string) {
    return skillsStore.isSkillAdded(skillId)
  }

  function toggleSkill(skillId: string) {
    skillsStore.toggleSkill(skillId)
  }

  return {
    skills: skillCatalog,
    workflows,
    activeWorkflowId,
    activeWorkflow,
    activePanel,
    selectedNode,
    addedSkillIds,
    addedSkills,
    addedNodeSkills,
    isCreateDialogOpen,
    isNodeDrawerOpen,
    isSkillsPanelActive,
    openWorkflowPanel,
    openSkillsPanel,
    openCreateDialog,
    closeCreateDialog,
    createWorkflow,
    activateWorkflow,
    openNodeDrawer,
    closeNodeDrawer,
    setNodeDrawerOpen,
    renameSelectedNode,
    saveSelectedNode,
    isSkillAdded,
    toggleSkill,
  }
}