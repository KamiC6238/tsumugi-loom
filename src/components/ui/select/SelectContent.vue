<script setup lang="ts">
import type { SelectContentEmits, SelectContentProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-vue-next'
import {
  SelectContent,
  SelectPortal,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectViewport,
  useForwardPropsEmits,
} from 'reka-ui'

import { cn } from '@/lib/utils'

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<SelectContentProps & { class?: HTMLAttributes['class'] }>()
const emits = defineEmits<SelectContentEmits>()

const delegatedProps = reactiveOmit(props, 'class')
const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <SelectPortal>
    <SelectContent
      data-slot="select-content"
      v-bind="{ ...forwarded, ...$attrs }"
      :class="cn(
        'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-72 min-w-[8rem] overflow-hidden rounded-lg border border-border shadow-md',
        props.position === 'popper' && 'w-[var(--reka-select-trigger-width)]',
        props.class,
      )"
      @pointerdown.stop
    >
      <SelectScrollUpButton class="flex h-6 cursor-default items-center justify-center">
        <ChevronUpIcon class="size-4" aria-hidden="true" />
      </SelectScrollUpButton>
      <SelectViewport
        :class="cn(
          'p-1',
          props.position === 'popper' && 'max-h-[var(--reka-select-content-available-height)] w-full',
        )"
      >
        <slot />
      </SelectViewport>
      <SelectScrollDownButton class="flex h-6 cursor-default items-center justify-center">
        <ChevronDownIcon class="size-4" aria-hidden="true" />
      </SelectScrollDownButton>
    </SelectContent>
  </SelectPortal>
</template>