import type { Node } from '@vue-flow/core'
import { storeToRefs } from 'pinia'
import { computed, shallowRef } from 'vue'
import type { ComputedRef, Ref } from 'vue'

import { useWorkflow } from '@/composables/useWorkflow'
import { skillCatalog } from '@/lib/skills'
import type { SkillCatalogItem } from '@/lib/skills'
import type { WorkflowRecord } from '@/lib/workflows'
import { useSkillsStore } from '@/stores/skills'

export interface SelectedNodeSavePayload {
  name: string
  skillId?: string | null
}

export type WorkflowStudioPanel = 'workflow' | 'skills' | 'tasks'

export interface WorkflowStudioApi {
  skills: SkillCatalogItem[]
  workflows: Ref<WorkflowRecord[]>
  activeWorkflowId: Ref<string | null>
  activeWorkflow: Ref<WorkflowRecord | null>
  activePanel: Ref<WorkflowStudioPanel>
  selectedNode: ComputedRef<Node | null>
  addedSkillIds: Ref<string[]>
  addedSkills: Ref<SkillCatalogItem[]>
  addedNodeSkills: Ref<SkillCatalogItem[]>
  isCreateDialogOpen: Ref<boolean>
  isNodeDrawerOpen: ComputedRef<boolean>
  isSkillsPanelActive: ComputedRef<boolean>
  isTasksPanelActive: ComputedRef<boolean>
  openWorkflowPanel: () => void
  openSkillsPanel: () => void
  openTasksPanel: () => void
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
  const workflow = useWorkflow()
  const activePanel = shallowRef<WorkflowStudioPanel>('workflow')
  const isCreateDialogOpen = shallowRef(false)
  const selectedNodeId = shallowRef<string | null>(null)

  const selectedNode = computed<Node | null>(() => {
    if (!selectedNodeId.value) {
      return null
    }

    return workflow.getNode(selectedNodeId.value)
  })
  const isNodeDrawerOpen = computed(() => selectedNode.value !== null)
  const isSkillsPanelActive = computed(() => activePanel.value === 'skills')
  const isTasksPanelActive = computed(() => activePanel.value === 'tasks')

  function openWorkflowPanel() {
    activePanel.value = 'workflow'
  }

  function openSkillsPanel() {
    activePanel.value = 'skills'
    closeNodeDrawer()
  }

  function openTasksPanel() {
    activePanel.value = 'tasks'
    closeNodeDrawer()
  }

  function openCreateDialog() {
    isCreateDialogOpen.value = true
  }

  function closeCreateDialog() {
    isCreateDialogOpen.value = false
  }

  function createWorkflow(name: string) {
    const wasCreated = workflow.createWorkflow(name)

    if (!wasCreated) {
      return
    }

    openWorkflowPanel()
    closeNodeDrawer()
    closeCreateDialog()
  }

  function activateWorkflow(workflowId: string) {
    const wasSelected = workflow.selectWorkflow(workflowId)

    if (!wasSelected) {
      return
    }

    openWorkflowPanel()
    closeNodeDrawer()
  }

  function openNodeDrawer(nodeId: string) {
    if (!workflow.activeWorkflow.value) {
      return
    }

    const nodeExists = workflow.activeWorkflow.value.nodes.some((node) => node.id === nodeId)

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
    if (!workflow.activeWorkflowId.value || !selectedNodeId.value) {
      return
    }

    workflow.updateWorkflowNode(
      workflow.activeWorkflowId.value,
      selectedNodeId.value,
      {
        name: payload.name,
        skillId: getAllowedNodeSkillId(payload.skillId),
      },
    )
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
    workflows: workflow.workflows,
    activeWorkflowId: workflow.activeWorkflowId,
    activeWorkflow: workflow.activeWorkflow,
    activePanel,
    selectedNode,
    addedSkillIds,
    addedSkills,
    addedNodeSkills,
    isCreateDialogOpen,
    isNodeDrawerOpen,
    isSkillsPanelActive,
    isTasksPanelActive,
    openWorkflowPanel,
    openSkillsPanel,
    openTasksPanel,
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