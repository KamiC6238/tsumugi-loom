<script setup lang="ts">
import type { SelectValueProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { SelectValue } from 'reka-ui'

import { cn } from '@/lib/utils'

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<SelectValueProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')
</script>

<template>
  <SelectValue
    data-slot="select-value"
    v-bind="{ ...delegatedProps, ...$attrs }"
    :class="cn('min-w-0 truncate', props.class)"
  >
    <slot />
  </SelectValue>
</template>