<script setup lang="ts">
import type { Node as FlowNode } from '@vue-flow/core'
import { computed, onMounted, onUnmounted, shallowRef, useTemplateRef, watch } from 'vue'

import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { SkillCatalogItem } from '@/lib/skills'

interface NodeDrawerSavePayload {
  name: string
  skillId: string | null
}

const NO_NODE_SKILL_VALUE = '__no-node-skill__'

const props = withDefaults(defineProps<{
  open: boolean
  node: FlowNode | null
  addedNodeSkills?: SkillCatalogItem[]
}>(), {
  addedNodeSkills: () => [],
})

const emit = defineEmits<{
  save: [payload: NodeDrawerSavePayload]
  'update:open': [open: boolean]
}>()

const draftNodeName = shallowRef('')
const draftNodeSkillId = shallowRef<string | undefined>(undefined)
const drawerPanelRef = useTemplateRef<HTMLElement>('drawerPanel')

const selectedNodeLabel = computed(() => String(props.node?.data?.label ?? ''))
const trimmedNodeName = computed(() => draftNodeName.value.trim())
const canSaveNode = computed(() => trimmedNodeName.value.length > 0)
const hasAddedNodeSkills = computed(() => props.addedNodeSkills.length > 0)
const nodeSkillPlaceholder = computed(() => (
  hasAddedNodeSkills.value ? 'Select node skill' : 'No node skills added'
))

watch(
  () => [props.open, props.node?.id ?? null, props.addedNodeSkills.map((skill) => skill.id).join('|')] as const,
  ([isOpen, nodeId]) => {
    if (!isOpen || !nodeId) {
      draftNodeName.value = ''
      draftNodeSkillId.value = undefined
      return
    }

    draftNodeName.value = selectedNodeLabel.value
    draftNodeSkillId.value = getAvailableNodeSkillId()
  },
  { immediate: true },
)

function handleOpenChange(nextOpen: boolean) {
  emit('update:open', nextOpen)
}

function closeDrawer() {
  emit('update:open', false)
}

function handleDocumentPointerDown(event: PointerEvent) {
  if (!props.open) {
    return
  }

  const drawerPanel = drawerPanelRef.value
  const target = event.target

  if (!drawerPanel || !(target instanceof globalThis.Node)) {
    return
  }

  const targetElement = target instanceof Element ? target : target.parentElement

  if (targetElement?.closest('[data-slot="select-content"]')) {
    return
  }

  if (drawerPanel.contains(target)) {
    return
  }

  closeDrawer()
}

function saveNode() {
  if (!canSaveNode.value) {
    return
  }

  draftNodeName.value = trimmedNodeName.value
  emit('save', {
    name: trimmedNodeName.value,
    skillId: getSelectedNodeSkillId(),
  })
  closeDrawer()
}

function getSelectedNodeSkillId() {
  if (!draftNodeSkillId.value || draftNodeSkillId.value === NO_NODE_SKILL_VALUE) {
    return null
  }

  return draftNodeSkillId.value
}

function getAvailableNodeSkillId() {
  const nodeSkillId = props.node?.data?.skillId

  if (typeof nodeSkillId !== 'string') {
    return hasAddedNodeSkills.value ? NO_NODE_SKILL_VALUE : undefined
  }

  return props.addedNodeSkills.some((skill) => skill.id === nodeSkillId)
    ? nodeSkillId
    : hasAddedNodeSkills.value ? NO_NODE_SKILL_VALUE : undefined
}

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown, true)
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown, true)
})
</script>

<template>
  <Drawer :open="open" :modal="false" direction="right" @update:open="handleOpenChange">
    <DrawerContent class="node-drawer border-none bg-transparent p-0 shadow-none sm:max-w-md">
      <template v-if="node">
        <div ref="drawerPanel" class="drawer-panel">
          <DrawerHeader class="drawer-header text-left">
            <p class="eyebrow">Node editor</p>
            <DrawerTitle class="drawer-title">Edit node</DrawerTitle>
            <DrawerDescription class="drawer-copy">
              Update the selected node name. The canvas label refreshes as soon as you save.
            </DrawerDescription>
          </DrawerHeader>

          <form class="drawer-form" @submit.prevent="saveNode">
            <div class="drawer-field">
              <Label class="drawer-label" for="node-name">Node name</Label>
              <Input
                id="node-name"
                v-model="draftNodeName"
                type="text"
                name="nodeName"
                autocomplete="off"
                placeholder="Manual review"
                autofocus
                class="node-name-input"
              />
            </div>

            <div class="drawer-field">
              <Label class="drawer-label" for="node-skill">Node skill</Label>
              <Select
                v-model="draftNodeSkillId"
                name="nodeSkill"
                :disabled="!hasAddedNodeSkills"
              >
                <SelectTrigger
                  id="node-skill"
                  class="node-skill-select"
                  data-testid="node-skill-select"
                >
                  <SelectValue :placeholder="nodeSkillPlaceholder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem :value="NO_NODE_SKILL_VALUE">
                    No node skill
                  </SelectItem>
                  <SelectItem
                    v-for="skill in addedNodeSkills"
                    :key="skill.id"
                    :value="skill.id"
                    data-testid="node-skill-option"
                  >
                    {{ skill.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DrawerFooter class="drawer-actions">
              <DrawerClose as-child>
                <Button type="button" variant="outline" class="drawer-action-button">
                  Close
                </Button>
              </DrawerClose>
              <Button
                type="submit"
                class="drawer-action-button save-button"
                :disabled="!canSaveNode"
              >
                Save node
              </Button>
            </DrawerFooter>
          </form>
        </div>
      </template>
    </DrawerContent>
  </Drawer>
</template>

<style scoped>
.drawer-panel {
  min-height: 100svh;
  border-left: 1px solid var(--panel-border);
  border-top-left-radius: 1.5rem;
  border-bottom-left-radius: 1.5rem;
  box-shadow: var(--shadow-soft);
  overflow: hidden;
  background: var(--panel-background-cool);
}

.node-drawer {
  min-height: 100svh;
}

.drawer-header,
.drawer-form {
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

.drawer-header {
  display: grid;
  gap: 0.65rem;
  padding: 1.75rem 1.75rem 0;
}

.drawer-title {
  font-family: var(--font-heading);
  font-size: clamp(2rem, 2.5vw, 2.5rem);
  font-weight: 700;
  line-height: 0.96;
  color: var(--text-primary);
}

.drawer-copy {
  max-width: 24rem;
  font-size: 1rem;
  line-height: 1.6;
  color: var(--text-secondary);
}

.drawer-form {
  display: grid;
  gap: 0.85rem;
  padding: 1.5rem 1.75rem 1.75rem;
}

.drawer-field {
  display: grid;
  gap: 0.65rem;
}

.drawer-label {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
}

.node-name-input {
  min-height: 3.25rem;
  border-color: var(--field-border);
  background: var(--field-background);
}

.node-skill-select {
  min-height: 3.25rem;
  border-color: var(--field-border);
  background-color: var(--field-background);
}

.drawer-actions {
  display: flex;
  justify-content: end;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.drawer-action-button,
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

.drawer-action-button:hover,
.save-button:hover {
  transform: translateY(-1px);
}

.save-button {
  background: var(--save-cool-background);
  color: var(--primary-action-foreground);
}

.save-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
  transform: none;
}

@media (max-width: 640px) {
  .node-drawer {
    min-height: auto;
  }

  .drawer-actions {
    flex-direction: column-reverse;
    align-items: stretch;
  }

  .drawer-action-button,
  .save-button {
    width: 100%;
  }
}
</style>