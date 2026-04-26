<script setup lang="ts">
import type { HTMLAttributes } from 'vue'

import { cn } from '@/lib/utils'

const checked = defineModel<boolean>({ default: false })

const props = defineProps<{
  class?: HTMLAttributes['class']
  disabled?: boolean
}>()

function toggleChecked() {
  if (props.disabled) {
    return
  }

  checked.value = !checked.value
}
</script>

<template>
  <button
    type="button"
    data-slot="switch"
    role="switch"
    :aria-checked="checked"
    :disabled="disabled"
    :class="cn(
      'inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-input p-0.5 transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[state=checked]:bg-primary',
      checked ? 'bg-primary' : 'bg-input',
      props.class,
    )"
    :data-state="checked ? 'checked' : 'unchecked'"
    @click="toggleChecked"
  >
    <span
      data-slot="switch-thumb"
      :class="cn(
        'block size-5 rounded-full bg-background shadow-sm transition-transform',
        checked ? 'translate-x-5' : 'translate-x-0',
      )"
    />
  </button>
</template>