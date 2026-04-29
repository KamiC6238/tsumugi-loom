<script setup lang="ts">
import { MoonIcon, SunIcon } from 'lucide-vue-next'
import { computed } from 'vue'

import { Button } from '@/components/ui/button'
import { useColorMode } from '@/composables/useColorMode'

const { isDarkMode, toggleColorMode } = useColorMode()

const toggleLabel = computed(() =>
  isDarkMode.value ? 'Switch to light mode' : 'Switch to dark mode',
)
</script>

<template>
  <Button
    type="button"
    variant="ghost"
    size="icon"
    class="theme-mode-toggle"
    :aria-label="toggleLabel"
    :title="toggleLabel"
    data-testid="theme-mode-toggle"
    @click="toggleColorMode"
  >
    <SunIcon v-if="isDarkMode" aria-hidden="true" />
    <MoonIcon v-else aria-hidden="true" />
  </Button>
</template>

<style scoped>
.theme-mode-toggle {
  width: 1.75rem;
  height: 1.75rem;
  border: 1px solid var(--panel-border);
  border-radius: 999px;
  background: var(--surface-card-soft);
  color: var(--text-muted);
  cursor: pointer;
  transition:
    transform 180ms ease,
    background-color 180ms ease,
    color 180ms ease,
    border-color 180ms ease;
}

.theme-mode-toggle:hover {
  transform: translateY(-1px);
  background: var(--surface-card);
  color: var(--text-primary);
}
</style>
