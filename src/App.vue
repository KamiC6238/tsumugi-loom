<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { VueFlow } from '@vue-flow/core'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import {
  appendWorkflow,
  createEmptyWorkflowState,
  getActiveWorkflow,
  selectWorkflow,
} from './lib/workflows'
import type { WorkflowRecord, WorkflowState } from './lib/workflows'

const workflowState = shallowRef<WorkflowState>(createEmptyWorkflowState())
const draftWorkflowName = ref('')
const isCreateDialogOpen = ref(false)

const workflows = computed(() => workflowState.value.workflows)
const activeWorkflow = computed<WorkflowRecord | null>(() => getActiveWorkflow(workflowState.value))
const canSaveWorkflow = computed(() => draftWorkflowName.value.trim().length > 0)

function openCreateDialog() {
  draftWorkflowName.value = ''
  isCreateDialogOpen.value = true
}

function closeCreateDialog() {
  draftWorkflowName.value = ''
  isCreateDialogOpen.value = false
}

function handleCreateDialogChange(isOpen: boolean) {
  isCreateDialogOpen.value = isOpen

  if (!isOpen) {
    draftWorkflowName.value = ''
  }
}

function saveWorkflow() {
  if (!canSaveWorkflow.value) {
    return
  }

  workflowState.value = appendWorkflow(workflowState.value, draftWorkflowName.value)
  closeCreateDialog()
}

function activateWorkflow(workflowId: string) {
  workflowState.value = selectWorkflow(workflowState.value, workflowId)
}
</script>

<template>
  <div class="workflow-shell">
    <aside class="workflow-sidebar">
      <div class="brand-block">
        <p class="eyebrow">Tsumugi Loom</p>
        <h1>Workflow studio</h1>
        <p class="lede">
          Build named workflow canvases from the sidebar and move between them without leaving
          the page.
        </p>
      </div>

      <Button type="button" class="create-button" size="lg" @click="openCreateDialog">
        Create workflow
      </Button>

      <section class="workflow-list-section" aria-label="Workflows">
        <div class="section-heading">
          <p>Workflows</p>
          <span>{{ workflows.length }}</span>
        </div>

        <ul v-if="workflows.length > 0" class="workflow-list">
          <li v-for="workflow in workflows" :key="workflow.id">
            <Button
              variant="ghost"
              class="workflow-item"
              :class="{ 'workflow-item--active': workflow.id === activeWorkflow?.id }"
              :aria-pressed="workflow.id === activeWorkflow?.id"
              @click="activateWorkflow(workflow.id)"
            >
              <span class="workflow-item__swatch" :style="{ background: workflow.accent }"></span>
              <span class="workflow-item__content">
                <strong>{{ workflow.name }}</strong>
                <small>{{ workflow.nodes.length }} nodes · {{ workflow.edges.length }} edges</small>
              </span>
            </Button>
          </li>
        </ul>

        <p v-else class="sidebar-empty">No workflows yet. Create one to open the canvas.</p>
      </section>
    </aside>

    <main class="workflow-detail" data-testid="workflow-detail">
      <template v-if="activeWorkflow">
        <header class="detail-header">
          <div>
            <p class="eyebrow">Active workflow</p>
            <h2>{{ activeWorkflow.name }}</h2>
            <p class="detail-copy">Seeded for {{ activeWorkflow.name }}</p>
          </div>

          <dl class="detail-metrics">
            <div>
              <dt>Nodes</dt>
              <dd>{{ activeWorkflow.nodes.length }}</dd>
            </div>
            <div>
              <dt>Edges</dt>
              <dd>{{ activeWorkflow.edges.length }}</dd>
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
            fit-view-on-init
          >
            <Background :gap="20" />
            <Controls position="bottom-right" />
          </VueFlow>
        </div>
      </template>

      <section v-else class="empty-state">
        <p class="eyebrow">Workflow canvas</p>
        <h2>No workflow selected</h2>
        <p>
          Use the create button in the sidebar to add your first workflow. The selected workflow
          will open here with a seeded Vue Flow canvas.
        </p>
      </section>
    </main>

    <Dialog :open="isCreateDialogOpen" @update:open="handleCreateDialogChange">
      <DialogContent class="dialog-card border-none p-0 sm:max-w-lg">
        <DialogHeader class="dialog-header">
          <p class="eyebrow">New workflow</p>
          <DialogTitle>Create workflow</DialogTitle>
          <DialogDescription class="dialog-copy">
            Name the workflow to add it to the sidebar and open its canvas.
          </DialogDescription>
        </DialogHeader>

        <form class="dialog-form" @submit.prevent="saveWorkflow">
          <div class="dialog-field">
            <Label class="dialog-label" for="workflow-name">Workflow name</Label>
            <Input
              id="workflow-name"
              v-model="draftWorkflowName"
              type="text"
              name="workflowName"
              autocomplete="off"
              placeholder="Orders Intake"
              autofocus
              class="workflow-name-input"
            />
          </div>

          <DialogFooter class="dialog-actions">
            <DialogClose as-child>
              <Button type="button" variant="outline" class="dialog-action-button">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              class="dialog-action-button save-button"
              :disabled="!canSaveWorkflow"
            >
              Save workflow
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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

.workflow-sidebar,
.workflow-detail,
.dialog-card {
  border: 1px solid rgba(83, 60, 37, 0.12);
  box-shadow: var(--shadow-soft);
}

.workflow-sidebar {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.75rem;
  border-radius: 1.75rem;
  background:
    radial-gradient(circle at top left, rgba(208, 122, 44, 0.24), transparent 34%),
    linear-gradient(180deg, rgba(255, 250, 243, 0.95), rgba(244, 236, 223, 0.92));
  overflow: hidden;
}

.brand-block,
.workflow-list-section,
.detail-header,
.empty-state,
.dialog-header,
.dialog-form {
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

.brand-block h1,
.detail-header h2,
.empty-state h2,
.dialog-header h2 {
  font-family: var(--font-heading);
  font-size: clamp(2rem, 3vw, 3.1rem);
  font-weight: 700;
  line-height: 0.96;
  color: #241d17;
}

.detail-header h2,
.empty-state h2,
.dialog-header h2 {
  font-size: clamp(2rem, 2.8vw, 2.8rem);
}

.lede,
.detail-copy,
.empty-state p,
.dialog-header p {
  max-width: 34rem;
  font-size: 1rem;
  line-height: 1.6;
  color: rgba(54, 40, 28, 0.78);
}

.create-button,
.workflow-item,
.dialog-action-button,
.save-button {
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
.save-button:hover,
.dialog-action-button:hover,
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

.workflow-item__content strong {
  font-size: 1rem;
  font-weight: 700;
}

.workflow-item__content small {
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

.workflow-detail {
  display: grid;
  gap: 1.5rem;
  padding: 1.75rem;
  border-radius: 1.75rem;
  background:
    radial-gradient(circle at top right, rgba(63, 108, 98, 0.15), transparent 24%),
    linear-gradient(180deg, rgba(255, 250, 243, 0.92), rgba(249, 243, 234, 0.98));
}

.detail-header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1.5rem;
}

.detail-metrics {
  display: flex;
  gap: 0.9rem;
  margin: 0;
}

.detail-metrics div {
  min-width: 5.75rem;
  padding: 0.85rem 1rem;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.84);
}

.detail-metrics dt {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(74, 58, 42, 0.65);
}

.detail-metrics dd {
  margin: 0.3rem 0 0;
  font-size: 1.4rem;
  font-weight: 700;
  color: #241d17;
}

.canvas-frame,
.empty-state {
  min-height: min(40rem, calc(100svh - 8rem));
  border-radius: 1.5rem;
  background: rgba(255, 252, 247, 0.88);
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
  align-content: center;
  justify-items: start;
  gap: 0.9rem;
  padding: clamp(2rem, 6vw, 4rem);
  border: 1px dashed rgba(73, 55, 39, 0.2);
}

.dialog-card {
  padding: 1.75rem;
  border-radius: 1.5rem;
  background:
    radial-gradient(circle at top left, rgba(208, 122, 44, 0.15), transparent 34%),
    #fffaf3;
}

.dialog-header {
  display: grid;
  gap: 0.65rem;
  padding: 1.75rem 1.75rem 0;
}

.dialog-copy {
  max-width: 28rem;
  color: rgba(54, 40, 28, 0.78);
}

.dialog-form {
  display: grid;
  gap: 0.85rem;
  padding: 1.5rem 1.75rem 1.75rem;
}

.dialog-field {
  display: grid;
  gap: 0.65rem;
}

.dialog-label {
  font-size: 0.9rem;
  font-weight: 700;
  color: #3e2e20;
}

.workflow-name-input {
  min-height: 3.25rem;
  border-color: rgba(84, 64, 45, 0.2);
  background: rgba(255, 255, 255, 0.86);
}

.dialog-actions {
  display: flex;
  justify-content: end;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.dialog-action-button,
.save-button {
  min-height: 3rem;
  padding: 0.75rem 1rem;
  border-radius: 0.95rem;
  font-weight: 700;
}

.save-button {
  background: linear-gradient(135deg, #d07a2c, #8a5a52);
  color: #fffaf3;
}

.save-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
  transform: none;
}

@media (max-width: 900px) {
  .workflow-shell {
    grid-template-columns: 1fr;
    gap: 1rem;
    padding: 1rem;
  }

  .detail-header {
    flex-direction: column;
    align-items: start;
  }

  .detail-metrics {
    width: 100%;
  }

  .detail-metrics div {
    flex: 1;
  }

  .canvas-frame,
  .empty-state {
    min-height: 26rem;
  }
}
</style>