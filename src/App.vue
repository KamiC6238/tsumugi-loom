<script setup lang="ts">
import CreateWorkflowDialog from '@/components/workflow-studio/CreateWorkflowDialog.vue'
import SkillsPanel from '@/components/workflow-studio/SkillsPanel.vue'
import TasksPanel from '@/components/workflow-studio/TasksPanel.vue'
import WorkflowCanvasPanel from '@/components/workflow-studio/WorkflowCanvasPanel.vue'
import WorkflowNodeDrawer from '@/components/workflow-studio/WorkflowNodeDrawer.vue'
import WorkflowSidebar from '@/components/workflow-studio/WorkflowSidebar.vue'
import { useWorkflowStudio } from '@/composables/useWorkflowStudio'

const {
  skills,
  workflows,
  activeWorkflowId,
  activeWorkflow,
  activePanel,
  selectedNode,
  addedSkillIds,
  addedNodeSkills,
  isCreateDialogOpen,
  isNodeDrawerOpen,
  isSkillsPanelActive,
  isTasksPanelActive,
  openCreateDialog,
  createWorkflow,
  activateWorkflow,
  openSkillsPanel,
  openTasksPanel,
  openNodeDrawer,
  setNodeDrawerOpen,
  saveSelectedNode,
  toggleSkill,
} = useWorkflowStudio()
</script>

<template>
  <div class="workflow-shell">
    <WorkflowSidebar
      :workflows="workflows"
      :active-workflow-id="activeWorkflowId"
      :active-panel="activePanel"
      @create="openCreateDialog"
      @open-skills="openSkillsPanel"
      @open-tasks="openTasksPanel"
      @select="activateWorkflow"
    />
    <SkillsPanel
      v-if="isSkillsPanelActive"
      :skills="skills"
      :added-skill-ids="addedSkillIds"
      @toggle-skill="toggleSkill"
    />
    <TasksPanel v-else-if="isTasksPanelActive" :workflows="workflows" />
    <WorkflowCanvasPanel v-else :active-workflow="activeWorkflow" @node-click="openNodeDrawer" />
    <WorkflowNodeDrawer
      :open="isNodeDrawerOpen"
      :node="selectedNode"
      :added-node-skills="addedNodeSkills"
      @update:open="setNodeDrawerOpen"
      @save="saveSelectedNode"
    />
    <CreateWorkflowDialog v-model:open="isCreateDialogOpen" @create="createWorkflow" />
  </div>
</template>

<style scoped>
.workflow-shell {
  display: grid;
  grid-template-columns: minmax(18rem, 24rem) minmax(0, 1fr);
  height: 100svh;
  gap: 1.5rem;
  padding: 1.5rem;
  overflow: hidden;
}

.workflow-shell > * {
  min-height: 0;
}

@media (max-width: 900px) {
  .workflow-shell {
    grid-template-columns: 1fr;
    height: auto;
    min-height: 100svh;
    gap: 1rem;
    padding: 1rem;
    overflow: visible;
  }
}
</style>