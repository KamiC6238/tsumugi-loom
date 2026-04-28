// @vitest-environment happy-dom

import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import WorkflowSidebar from '../../src/components/workflow-studio/WorkflowSidebar.vue'

const storageKey = 'tsumugi-loom-color-mode'

describe('color mode persistence', () => {
  beforeEach(() => {
    vi.resetModules()
    window.localStorage.clear()
    document.documentElement.className = ''
    document.documentElement.removeAttribute('data-color-mode')
    document.documentElement.style.colorScheme = ''
  })

  it('initializes the root element from a stored dark mode preference', async () => {
    window.localStorage.setItem(storageKey, 'dark')

    const { useColorMode } = await import('../../src/composables/useColorMode')
    const colorMode = useColorMode()

    expect(colorMode.colorMode.value).toBe('dark')
    expect(colorMode.isDarkMode.value).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.dataset.colorMode).toBe('dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('persists toggled light and dark modes to localStorage', async () => {
    const { useColorMode } = await import('../../src/composables/useColorMode')
    const colorMode = useColorMode()

    colorMode.toggleColorMode()

    expect(colorMode.colorMode.value).toBe('dark')
    expect(window.localStorage.getItem(storageKey)).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    colorMode.toggleColorMode()

    expect(colorMode.colorMode.value).toBe('light')
    expect(window.localStorage.getItem(storageKey)).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('renders the sidebar brand eyebrow theme icon and toggles the active mode', async () => {
    const wrapper = mount(WorkflowSidebar, {
      props: {
        activePanel: 'workflow',
        workflows: [],
        activeWorkflowId: null,
      },
    })

    const themeRow = wrapper.get('[data-testid="brand-theme-row"]')
    const toggleButton = themeRow.get('[data-testid="theme-mode-toggle"]')

    expect(themeRow.get('.eyebrow').text()).toBe('Tsumugi Loom')
    expect(toggleButton.attributes('aria-label')).toBe('Switch to dark mode')
    expect(toggleButton.html()).toContain('lucide-moon')

    await toggleButton.trigger('click')

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(window.localStorage.getItem(storageKey)).toBe('dark')
    expect(toggleButton.attributes('aria-label')).toBe('Switch to light mode')
    expect(toggleButton.html()).toContain('lucide-sun')
  })
})
