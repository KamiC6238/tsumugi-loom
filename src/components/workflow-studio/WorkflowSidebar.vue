<script setup lang="ts">
import { Button } from '@/components/ui/button'
import type { WorkflowRecord } from '@/lib/workflows'

defineProps<{
  workflows: WorkflowRecord[]
  activeWorkflowId: string | null
}>()

const emit = defineEmits<{
  create: []
  select: [workflowId: string]
}>()

function selectWorkflow(workflowId: string) {
  emit('select', workflowId)
}
</script>

<template>
  <aside class="workflow-sidebar">
    <div class="brand-block">
      <p class="eyebrow">Tsumugi Loom</p>
      <h1 class="brand-title">Workflow studio</h1>
      <p class="lede">
        Build named workflow canvases from the sidebar and move between them without leaving the
        page.
      </p>
    </div>

    <Button type="button" class="create-button" size="lg" @click="emit('create')">
      Create workflow
    </Button>

    <section class="workflow-list-section" aria-label="Workflows">
      <div class="section-heading">
        <p class="section-heading__label">Workflows</p>
        <span>{{ workflows.length }}</span>
      </div>

      <ul v-if="workflows.length > 0" class="workflow-list">
        <li v-for="workflow in workflows" :key="workflow.id">
          <Button
            variant="ghost"
            class="workflow-item"
            :class="{ 'workflow-item--active': workflow.id === activeWorkflowId }"
            :aria-pressed="workflow.id === activeWorkflowId"
            @click="selectWorkflow(workflow.id)"
          >
            <span class="workflow-item__swatch" :style="{ backgroundColor: workflow.accent }"></span>
            <span class="workflow-item__content">
              <strong class="workflow-item__title">{{ workflow.name }}</strong>
              <small class="workflow-item__meta">
                {{ workflow.nodes.length }} nodes · {{ workflow.edges.length }} edges
              </small>
            </span>
          </Button>
        </li>
      </ul>

      <p v-else class="sidebar-empty">No workflows yet. Create one to open the canvas.</p>
    </section>
  </aside>
</template>

<style scoped>
.workflow-sidebar {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.75rem;
  border: 1px solid rgba(83, 60, 37, 0.12);
  border-radius: 1.75rem;
  box-shadow: var(--shadow-soft);
  background:
    radial-gradient(circle at top left, rgba(208, 122, 44, 0.24), transparent 34%),
    linear-gradient(180deg, rgba(255, 250, 243, 0.95), rgba(244, 236, 223, 0.92));
  overflow: hidden;
}

.brand-block,
.workflow-list-section {
  position: relative;
  z-index: 1;
}

.workflow-sidebar::after {
  content: '';
  position: absolute;
  inset: auto -18% -18% auto;
  width: 14rem;
  aspect-ratio: 1;
  border-radius: 999px;
  background: rgba(63, 108, 98, 0.12);
  filter: blur(6px);
}

.eyebrow {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(59, 43, 29, 0.68);
}

.brand-block {
  display: grid;
  gap: 0.75rem;
}

.brand-title {
  font-family: var(--font-heading);
  font-size: clamp(2rem, 3vw, 3.1rem);
  font-weight: 700;
  line-height: 0.96;
  color: #241d17;
}

.lede {
  max-width: 34rem;
  font-size: 1rem;
  line-height: 1.6;
  color: rgba(54, 40, 28, 0.78);
}

.create-button,
.workflow-item {
  border: none;
  cursor: pointer;
  transition:
    transform 180ms ease,
    box-shadow 180ms ease,
    background-color 180ms ease,
    color 180ms ease;
}

.create-button {
  min-height: 3.5rem;
  padding: 0.95rem 1.2rem;
  border-radius: 1rem;
  background: linear-gradient(135deg, #241d17, #4e3522);
  color: #fffaf3;
  font-weight: 700;
  box-shadow: 0 14px 28px rgba(36, 29, 23, 0.2);
}

.create-button:hover,
.workflow-item:hover {
  transform: translateY(-1px);
}

.workflow-list-section {
  display: grid;
  gap: 0.85rem;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: rgba(58, 42, 28, 0.74);
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.section-heading__label {
  margin: 0;
}

.section-heading span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  min-height: 2rem;
  padding: 0 0.5rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  font-weight: 700;
}

.workflow-list {
  display: grid;
  gap: 0.75rem;
  padding: 0;
  margin: 0;
  list-style: none;
}

.workflow-item {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  width: 100%;
  height: auto;
  gap: 0.85rem;
  padding: 0.95rem 1rem;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.62);
  text-align: left;
}

.workflow-item--active {
  background: rgba(36, 29, 23, 0.94);
  color: #fff9f0;
  box-shadow: 0 16px 26px rgba(36, 29, 23, 0.16);
}

.workflow-item[data-state='open'] {
  background: rgba(36, 29, 23, 0.94);
}

.workflow-item__swatch {
  width: 0.8rem;
  height: 0.8rem;
  border-radius: 999px;
}

.workflow-item__content {
  display: grid;
  gap: 0.15rem;
}

.workflow-item__title {
  font-size: 1rem;
  font-weight: 700;
}

.workflow-item__meta {
  color: inherit;
  opacity: 0.74;
}

.sidebar-empty {
  padding: 1.1rem;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.56);
  color: rgba(58, 42, 28, 0.8);
  line-height: 1.6;
}
</style>