import { computed, readonly, shallowRef } from 'vue'

export type ColorMode = 'light' | 'dark'

export const COLOR_MODE_STORAGE_KEY = 'tsumugi-loom-color-mode'

const colorMode = shallowRef<ColorMode>(readInitialColorMode())

function readInitialColorMode(): ColorMode {
  return readStoredColorMode() ?? 'light'
}

function readStoredColorMode(): ColorMode | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const storedColorMode = window.localStorage.getItem(COLOR_MODE_STORAGE_KEY)

    return isColorMode(storedColorMode) ? storedColorMode : null
  } catch {
    return null
  }
}

function isColorMode(value: string | null): value is ColorMode {
  return value === 'light' || value === 'dark'
}

function persistColorMode(nextColorMode: ColorMode) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, nextColorMode)
  } catch {
    return
  }
}

function applyColorMode(nextColorMode: ColorMode) {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.classList.toggle('dark', nextColorMode === 'dark')
  document.documentElement.dataset.colorMode = nextColorMode
  document.documentElement.style.colorScheme = nextColorMode
}

export function initializeColorMode() {
  applyColorMode(colorMode.value)
}

export function setColorMode(nextColorMode: ColorMode) {
  colorMode.value = nextColorMode
  persistColorMode(nextColorMode)
  applyColorMode(nextColorMode)
}

export function toggleColorMode() {
  setColorMode(colorMode.value === 'dark' ? 'light' : 'dark')
}

export function useColorMode() {
  initializeColorMode()

  const isDarkMode = computed(() => colorMode.value === 'dark')

  return {
    colorMode: readonly(colorMode),
    isDarkMode,
    setColorMode,
    toggleColorMode,
  }
}
