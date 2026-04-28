<script setup lang="ts">
import { computed, shallowRef } from 'vue'

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

const isOpen = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  create: [name: string]
}>()

const draftWorkflowName = shallowRef('')
const canSaveWorkflow = computed(() => draftWorkflowName.value.trim().length > 0)

function resetDraft() {
  draftWorkflowName.value = ''
}

function handleOpenChange(nextOpen: boolean) {
  isOpen.value = nextOpen

  if (!nextOpen) {
    resetDraft()
  }
}

function saveWorkflow() {
  if (!canSaveWorkflow.value) {
    return
  }

  emit('create', draftWorkflowName.value)
  resetDraft()
  isOpen.value = false
}
</script>

<template>
  <Dialog :open="isOpen" @update:open="handleOpenChange">
    <DialogContent class="dialog-card border-none p-0 sm:max-w-lg">
      <DialogHeader class="dialog-header">
        <p class="eyebrow">New workflow</p>
        <DialogTitle class="dialog-title">Create workflow</DialogTitle>
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
</template>

<style scoped>
.dialog-card {
  padding: 1.75rem;
  border: 1px solid var(--panel-border);
  border-radius: 1.5rem;
  box-shadow: var(--shadow-soft);
  background:
    radial-gradient(circle at top left, rgba(208, 122, 44, 0.15), transparent 34%),
    var(--paper-strong);
}

.dialog-header,
.dialog-form {
  position: relative;
  z-index: 1;
}

.eyebrow {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.dialog-header {
  display: grid;
  gap: 0.65rem;
  padding: 1.75rem 1.75rem 0;
}

.dialog-title {
  font-family: var(--font-heading);
  font-size: clamp(2rem, 2.8vw, 2.8rem);
  font-weight: 700;
  line-height: 0.96;
  color: var(--text-primary);
}

.dialog-copy {
  max-width: 28rem;
  font-size: 1rem;
  line-height: 1.6;
  color: var(--text-secondary);
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
  color: var(--text-primary);
}

.workflow-name-input {
  min-height: 3.25rem;
  border-color: var(--field-border);
  background: var(--field-background);
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
  border: none;
  border-radius: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform 180ms ease,
    box-shadow 180ms ease,
    background-color 180ms ease,
    color 180ms ease;
}

.dialog-action-button:hover,
.save-button:hover {
  transform: translateY(-1px);
}

.save-button {
  background: var(--save-warm-background);
  color: var(--primary-action-foreground);
}

.save-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
  transform: none;
}
</style>