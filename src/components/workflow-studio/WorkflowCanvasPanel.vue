<script setup lang="ts">
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { VueFlow } from '@vue-flow/core'
import type { NodeMouseEvent } from '@vue-flow/core'

import type { WorkflowRecord } from '@/lib/workflows'

const props = defineProps<{
  activeWorkflow: WorkflowRecord | null
}>()

const emit = defineEmits<{
  nodeClick: [nodeId: string]
}>()

function handleNodeClick({ node }: NodeMouseEvent) {
  if (!props.activeWorkflow) {
    return
  }

  emit('nodeClick', node.id)
}
</script>

<template>
  <main class="workflow-detail" data-testid="workflow-detail">
    <template v-if="activeWorkflow">
      <header class="detail-header">
        <div class="detail-heading">
          <p class="eyebrow">Active workflow</p>
          <h2 class="detail-title">{{ activeWorkflow.name }}</h2>
          <p class="detail-copy">Seeded for {{ activeWorkflow.name }}</p>
        </div>

        <dl class="detail-metrics">
          <div class="detail-metric-card">
            <dt class="detail-metric-label">Nodes</dt>
            <dd class="detail-metric-value">{{ activeWorkflow.nodes.length }}</dd>
          </div>
          <div class="detail-metric-card">
            <dt class="detail-metric-label">Edges</dt>
            <dd class="detail-metric-value">{{ activeWorkflow.edges.length }}</dd>
          </div>
        </dl>
      </header>

      <div class="canvas-frame" data-testid="workflow-canvas">
        <VueFlow
          :key="activeWorkflow.id"
          class="canvas-surface"
          :nodes="activeWorkflow.nodes"
          :edges="activeWorkflow.edges"
          :default-viewport="{ zoom: 1 }"
          @node-click="handleNodeClick"
          fit-view-on-init
        >
          <Background :gap="20" />
          <Controls position="bottom-right" />
        </VueFlow>
      </div>
    </template>

    <section v-else class="empty-state">
      <p class="eyebrow">Workflow canvas</p>
      <h2 class="empty-title">No workflow selected</h2>
      <p class="empty-copy">
        Use the create button in the sidebar to add your first workflow. The selected workflow will
        open here with a seeded Vue Flow canvas.
      </p>
    </section>
  </main>
</template>

<style scoped>
.workflow-detail {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-width: 0;
  min-height: 0;
  height: 100%;
  gap: 1.5rem;
  padding: 1.75rem;
  border: 1px solid var(--panel-border);
  border-radius: 1.75rem;
  box-shadow: var(--shadow-soft);
  background: var(--panel-background-cool);
  overflow: hidden;
}

.eyebrow {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.detail-header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1.5rem;
}

.detail-heading {
  display: grid;
  min-width: 0;
  gap: 0.75rem;
}

.detail-title,
.empty-title {
  font-family: var(--font-heading);
  font-size: clamp(2rem, 2.8vw, 2.8rem);
  font-weight: 700;
  line-height: 0.96;
  color: var(--text-primary);
}

.detail-copy,
.empty-copy {
  max-width: 34rem;
  font-size: 1rem;
  line-height: 1.6;
  color: var(--text-secondary);
}

.detail-metrics {
  display: flex;
  gap: 0.9rem;
  margin: 0;
}

.detail-metric-card {
  min-width: 5.75rem;
  padding: 0.85rem 1rem;
  border-radius: 1rem;
  background: var(--surface-card);
}

.detail-metric-label {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}

.detail-metric-value {
  margin: 0.3rem 0 0;
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text-primary);
}

.canvas-frame,
.empty-state {
  min-height: 0;
  height: 100%;
  border-radius: 1.5rem;
  background: var(--surface-card-strong);
}

.canvas-frame {
  overflow: hidden;
}

.canvas-surface {
  width: 100%;
  height: 100%;
}

.empty-state {
  display: grid;
  grid-row: 1 / -1;
  align-content: center;
  justify-items: start;
  gap: 0.9rem;
  padding: clamp(2rem, 6vw, 4rem);
  border: 1px dashed var(--panel-border);
}

.canvas-surface :deep(.vue-flow__node) {
  border-color: var(--panel-border);
  background: var(--surface-card);
  color: var(--text-primary);
  box-shadow: var(--shadow-soft);
}

.canvas-surface :deep(.vue-flow__edge-path) {
  stroke: var(--text-subtle);
}

.canvas-surface :deep(.vue-flow__controls) {
  box-shadow: var(--shadow-soft);
}

.canvas-surface :deep(.vue-flow__controls-button) {
  border-color: var(--panel-border);
  background: var(--surface-card);
  color: var(--text-primary);
}

@media (max-width: 900px) {
  .workflow-detail {
    height: auto;
    overflow: visible;
  }

  .detail-header {
    flex-direction: column;
    align-items: start;
  }

  .detail-metrics {
    width: 100%;
  }

  .detail-metric-card {
    flex: 1;
  }

  .canvas-frame,
  .empty-state {
    min-height: 26rem;
    height: auto;
  }
}
</style>