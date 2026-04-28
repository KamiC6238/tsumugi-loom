// @vitest-environment happy-dom

import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it } from 'vitest'

import App from '../../src/App.vue'
import DrawerFooter from '../../src/components/ui/drawer/DrawerFooter.vue'
import SkillsPanel from '../../src/components/workflow-studio/SkillsPanel.vue'
import WorkflowNodeDrawer from '../../src/components/workflow-studio/WorkflowNodeDrawer.vue'
import WorkflowSidebar from '../../src/components/workflow-studio/WorkflowSidebar.vue'
import type { SkillCatalogItem } from '../../src/lib/skills'

const macroSkill: SkillCatalogItem = {
  id: 'start-standard-workflow',
  name: 'start-standard-workflow',
  description: 'Start the standard implementation workflow from a raw user requirement.',
  argumentHint: '用户需求描述',
  userInvocable: true,
  kind: 'macro',
  path: '.github/skills/start-standard-workflow/SKILL.md',
  raw: '',
}

const nodeSkill: SkillCatalogItem = {
  id: 'vue',
  name: 'vue',
  description: 'Vue 3 Composition API, script setup macros, and reactivity system.',
  argumentHint: null,
  userInvocable: false,
  kind: 'node',
  path: '.github/skills/vue/SKILL.md',
  raw: '',
}

describe('workflow studio UI wiring', () => {
  it('renders real skill cards by kind and emits switch toggles from SkillsPanel', async () => {
    const wrapper = mount(SkillsPanel, {
      props: {
        skills: [macroSkill, nodeSkill],
        addedSkillIds: ['vue'],
      },
    })

    expect(wrapper.text()).toContain('Macro')
    expect(wrapper.text()).toContain('Node')
    expect(wrapper.text()).toContain('start-standard-workflow')
    expect(wrapper.text()).toContain('vue')

    const macroSwitch = wrapper.get('[aria-label="start-standard-workflow added"]')
    const nodeSwitch = wrapper.get('[aria-label="vue added"]')

    expect(macroSwitch.attributes('aria-checked')).toBe('false')
    expect(macroSwitch.attributes('data-state')).toBe('unchecked')
    expect(nodeSwitch.attributes('aria-checked')).toBe('true')
    expect(nodeSwitch.attributes('data-state')).toBe('checked')

    await macroSwitch.trigger('click')

    expect(wrapper.emitted('toggleSkill')?.[0]).toEqual(['start-standard-workflow'])
  })

  it('emits the global skills panel request from the sidebar skills entry', async () => {
    const wrapper = mount(WorkflowSidebar, {
      props: {
        workflows: [],
        activeWorkflowId: null,
        activePanel: 'workflow',
      },
    })

    const skillsButton = wrapper.get('[data-testid="open-skills-panel"]')

    expect(skillsButton.attributes('aria-pressed')).toBe('false')

    await skillsButton.trigger('click')

    expect(wrapper.emitted('openSkills')).toHaveLength(1)
  })

  it('keeps drawer footer horizontal padding at zero', () => {
    const wrapper = mount(DrawerFooter, {
      slots: {
        default: '<button>Save</button>',
      },
    })

    expect(wrapper.classes()).toContain('px-0')
    expect(wrapper.classes()).toContain('py-4')
    expect(wrapper.classes()).not.toContain('p-4')
  })

  it('renders the skills panel in the right layout after the sidebar entry is clicked', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [createPinia()],
        stubs: {
          CreateWorkflowDialog: { template: '<div data-testid="create-dialog" />' },
          SkillsPanel: {
            props: ['skills', 'addedSkillIds'],
            emits: ['toggleSkill'],
            template: '<section data-testid="skills-panel">{{ skills.length }} skills</section>',
          },
          WorkflowCanvasPanel: { template: '<section data-testid="canvas-panel" />' },
          WorkflowNodeDrawer: { template: '<aside data-testid="node-drawer" />' },
        },
      },
    })

    expect(wrapper.find('[data-testid="canvas-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="skills-panel"]').exists()).toBe(false)

    await wrapper.get('[data-testid="open-skills-panel"]').trigger('click')

    expect(wrapper.find('[data-testid="canvas-panel"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="skills-panel"]').exists()).toBe(true)
  })

  it('passes only added node skills from App to the node drawer', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [createPinia()],
        stubs: {
          CreateWorkflowDialog: { template: '<div data-testid="create-dialog" />' },
          SkillsPanel: {
            props: ['skills', 'addedSkillIds'],
            emits: ['toggleSkill'],
            template: `
              <section data-testid="skills-panel">
                <button data-testid="toggle-macro" @click="$emit('toggleSkill', 'start-standard-workflow')">Macro</button>
                <button data-testid="toggle-node" @click="$emit('toggleSkill', 'vue')">Node</button>
              </section>
            `,
          },
          WorkflowCanvasPanel: { template: '<section data-testid="canvas-panel" />' },
          WorkflowNodeDrawer: {
            props: ['addedNodeSkills'],
            template: '<aside data-testid="node-drawer">{{ addedNodeSkills.map((skill) => skill.id).join(",") }}</aside>',
          },
        },
      },
    })

    await wrapper.get('[data-testid="open-skills-panel"]').trigger('click')
    await wrapper.get('[data-testid="toggle-macro"]').trigger('click')
    await wrapper.get('[data-testid="toggle-node"]').trigger('click')

    expect(wrapper.get('[data-testid="node-drawer"]').text()).toBe('vue')
  })

  it('passes newly node-classified workflow helper skills from App to the node drawer', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [createPinia()],
        stubs: {
          CreateWorkflowDialog: { template: '<div data-testid="create-dialog" />' },
          SkillsPanel: {
            props: ['skills', 'addedSkillIds'],
            emits: ['toggleSkill'],
            template: `
              <section data-testid="skills-panel">
                <button data-testid="toggle-start" @click="$emit('toggleSkill', 'start-standard-workflow')">Start</button>
                <button data-testid="toggle-commit" @click="$emit('toggleSkill', 'git-commit-push')">Commit</button>
              </section>
            `,
          },
          WorkflowCanvasPanel: { template: '<section data-testid="canvas-panel" />' },
          WorkflowNodeDrawer: {
            props: ['addedNodeSkills'],
            template: '<aside data-testid="node-drawer">{{ addedNodeSkills.map((skill) => skill.id).join(",") }}</aside>',
          },
        },
      },
    })

    await wrapper.get('[data-testid="open-skills-panel"]').trigger('click')
    await wrapper.get('[data-testid="toggle-start"]').trigger('click')
    await wrapper.get('[data-testid="toggle-commit"]').trigger('click')

    expect(wrapper.get('[data-testid="node-drawer"]').text()).toBe('git-commit-push')
  })

  it('renders drawer select options from added node skills and disables the empty state', () => {
    const drawerStubs = {
      Drawer: { template: '<div><slot /></div>' },
      DrawerClose: { template: '<div><slot /></div>' },
      DrawerContent: { template: '<div><slot /></div>' },
      DrawerDescription: { template: '<div><slot /></div>' },
      DrawerFooter: { template: '<div><slot /></div>' },
      DrawerHeader: { template: '<div><slot /></div>' },
      DrawerTitle: { template: '<div><slot /></div>' },
    }
    const node = {
      id: 'workflow-1-review',
      position: { x: 0, y: 0 },
      data: { label: 'Review' },
    }

    const populatedWrapper = mount(WorkflowNodeDrawer, {
      props: {
        open: true,
        node,
        addedNodeSkills: [nodeSkill],
      },
      global: { stubs: drawerStubs },
    })

    expect(populatedWrapper.get('[data-testid="node-skill-select"]').attributes('disabled'))
      .toBeUndefined()
    expect(populatedWrapper.findAll('[data-testid="node-skill-option"]').map((option) => option.text()))
      .toEqual(['vue'])
    expect(populatedWrapper.text()).not.toContain('start-standard-workflow')

    const emptyWrapper = mount(WorkflowNodeDrawer, {
      props: {
        open: true,
        node,
        addedNodeSkills: [],
      },
      global: { stubs: drawerStubs },
    })

    expect(emptyWrapper.get('[data-testid="node-skill-select"]').attributes('disabled')).toBe('')
    expect(emptyWrapper.text()).toContain('No node skills added')
  })

  it('emits the selected node skill id when the drawer form is submitted', async () => {
    const node = {
      id: 'workflow-1-review',
      position: { x: 0, y: 0 },
      data: { label: 'Review' },
    }
    const wrapper = mount(WorkflowNodeDrawer, {
      props: {
        open: true,
        node,
        addedNodeSkills: [nodeSkill],
      },
      global: {
        stubs: {
          Drawer: { template: '<div><slot /></div>' },
          DrawerClose: { template: '<div><slot /></div>' },
          DrawerContent: { template: '<div><slot /></div>' },
          DrawerDescription: { template: '<div><slot /></div>' },
          DrawerFooter: { template: '<div><slot /></div>' },
          DrawerHeader: { template: '<div><slot /></div>' },
          DrawerTitle: { template: '<div><slot /></div>' },
        },
      },
    })

    await wrapper.get('[data-testid="node-skill-select"]').setValue('vue')
    await wrapper.get('form').trigger('submit')

    expect(wrapper.emitted('save')?.[0]).toEqual([
      {
        name: 'Review',
        skillId: 'vue',
      },
    ])
  })
})