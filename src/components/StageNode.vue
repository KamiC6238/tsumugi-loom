<script setup lang="ts">
import {
  workflowStageStatusLabels,
  type WorkflowStage,
  type WorkflowStageStatus,
} from '../lib/workflowGraph'

defineProps<{
  data: WorkflowStage
  selected: boolean
}>()

const toneClassByStatus: Record<WorkflowStageStatus, string> = {
  completed: 'stage-node--completed',
  running: 'stage-node--running',
  queued: 'stage-node--queued',
  blocked: 'stage-node--blocked',
}
</script>

<template>
  <div
    class="stage-node"
    :class="[toneClassByStatus[data.status], { 'stage-node--selected': selected }]"
    :data-testid="`stage-node-${data.id}`"
    :data-selected="selected ? 'true' : 'false'"
  >
    <div class="stage-node__eyebrow">
      <span class="stage-node__index">Step {{ data.order }}</span>
      <span class="stage-node__status">{{ workflowStageStatusLabels[data.status] }}</span>
    </div>

    <h3 class="stage-node__title">{{ data.title }}</h3>
    <p class="stage-node__skill">{{ data.skill }}</p>
    <p class="stage-node__goal">{{ data.goal }}</p>

    <ul class="stage-node__artifacts">
      <li v-for="artifact in data.outputs.slice(0, 2)" :key="artifact">{{ artifact }}</li>
      <li v-if="data.outputs.length > 2">+{{ data.outputs.length - 2 }} more outputs</li>
    </ul>
  </div>
</template>