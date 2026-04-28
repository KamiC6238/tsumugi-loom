<script setup lang="ts">
import { ListTodoIcon, SparklesIcon } from 'lucide-vue-next'

import { Button } from '@/components/ui/button'
import ThemeModeToggle from '@/components/workflow-studio/ThemeModeToggle.vue'
import type { WorkflowStudioPanel } from '@/composables/useWorkflowStudio'
import type { WorkflowRecord } from '@/lib/workflows'

defineProps<{
  activePanel: WorkflowStudioPanel
  workflows: WorkflowRecord[]
  activeWorkflowId: string | null
}>()

const emit = defineEmits<{
  create: []
  openSkills: []
  openTasks: []
  select: [workflowId: string]
}>()

function selectWorkflow(workflowId: string) {
  emit('select', workflowId)
}
</script>

<template>
  <aside class="workflow-sidebar">
    <div class="brand-block">
      <div class="brand-eyebrow-row" data-testid="brand-theme-row">
        <p class="eyebrow">Tsumugi Loom</p>
        <ThemeModeToggle />
      </div>
      <h1 class="brand-title">Workflow studio</h1>
    </div>

    <Button type="button" class="create-button" size="lg" @click="emit('create')">
      Create workflow
    </Button>

    <Button
      type="button"
      variant="outline"
      class="skills-button"
      :class="{ 'skills-button--active': activePanel === 'skills' }"
      :aria-pressed="activePanel === 'skills'"
      data-testid="open-skills-panel"
      @click="emit('openSkills')"
    >
      <SparklesIcon aria-hidden="true" />
      <span>Skills</span>
    </Button>

    <Button
      type="button"
      variant="outline"
      class="tasks-button"
      :class="{ 'tasks-button--active': activePanel === 'tasks' }"
      :aria-pressed="activePanel === 'tasks'"
      data-testid="open-tasks-panel"
      @click="emit('openTasks')"
    >
      <ListTodoIcon aria-hidden="true" />
      <span>Tasks</span>
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
  min-width: 0;
  min-height: 0;
  height: 100%;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.75rem;
  border: 1px solid var(--panel-border);
  border-radius: 1.75rem;
  box-shadow: var(--shadow-soft);
  background: var(--panel-background);
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
  background: var(--accent-cool-soft);
  filter: blur(6px);
}

.eyebrow {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.brand-eyebrow-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
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
  color: var(--text-primary);
}

.create-button,
.skills-button,
.tasks-button,
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
  background: var(--primary-action-background);
  color: var(--primary-action-foreground);
  font-weight: 700;
  box-shadow: var(--primary-action-shadow);
}

.skills-button,
.tasks-button {
  min-height: 3rem;
  gap: 0.55rem;
  border: 1px solid var(--panel-border);
  border-radius: 0.95rem;
  background: var(--surface-card-soft);
  color: var(--text-primary);
  font-weight: 800;
}

.skills-button--active,
.tasks-button--active {
  background: var(--active-background);
  color: var(--active-foreground);
  box-shadow: 0 16px 26px rgba(36, 29, 23, 0.16);
}

.create-button:hover,
.skills-button:hover,
.tasks-button:hover,
.workflow-item:hover {
  transform: translateY(-1px);
}

.workflow-list-section {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  flex: 1;
  min-height: 0;
  gap: 0.85rem;
  align-content: start;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--text-secondary);
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
  background: var(--surface-card-soft);
  font-weight: 700;
}

.workflow-list {
  display: grid;
  align-content: start;
  gap: 0.75rem;
  padding: 0;
  margin: 0;
  list-style: none;
  min-height: 0;
  overflow: auto;
  padding-right: 0.35rem;
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
  background: var(--surface-card-soft);
  text-align: left;
}

.workflow-item--active {
  background: var(--active-background);
  color: var(--active-foreground);
  box-shadow: 0 16px 26px rgba(36, 29, 23, 0.16);
}

.workflow-item[data-state='open'] {
  background: var(--active-background);
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
  background: var(--surface-card-muted);
  color: var(--text-secondary);
  line-height: 1.6;
}
</style>
