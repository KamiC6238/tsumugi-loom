<script setup lang="ts">
import CreateWorkflowDialog from '@/components/workflow-studio/CreateWorkflowDialog.vue'
import WorkflowCanvasPanel from '@/components/workflow-studio/WorkflowCanvasPanel.vue'
import WorkflowSidebar from '@/components/workflow-studio/WorkflowSidebar.vue'
import { useWorkflowStudio } from '@/composables/useWorkflowStudio'

const {
  workflows,
  activeWorkflowId,
  activeWorkflow,
  isCreateDialogOpen,
  openCreateDialog,
  createWorkflow,
  activateWorkflow,
} = useWorkflowStudio()
</script>

<template>
  <div class="workflow-shell">
    <WorkflowSidebar
      :workflows="workflows"
      :active-workflow-id="activeWorkflowId"
      @create="openCreateDialog"
      @select="activateWorkflow"
    />
    <WorkflowCanvasPanel :active-workflow="activeWorkflow" />
    <CreateWorkflowDialog v-model:open="isCreateDialogOpen" @create="createWorkflow" />
  </div>
</template>

<style scoped>
.workflow-shell {
  display: grid;
  grid-template-columns: minmax(18rem, 24rem) minmax(0, 1fr);
  min-height: 100svh;
  gap: 1.5rem;
  padding: 1.5rem;
}

@media (max-width: 900px) {
  .workflow-shell {
    grid-template-columns: 1fr;
    gap: 1rem;
    padding: 1rem;
  }
}
</style>