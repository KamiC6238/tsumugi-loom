// @vitest-environment happy-dom

import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it, vi } from 'vitest'

import App from '../../src/App.vue'
import DrawerFooter from '../../src/components/ui/drawer/DrawerFooter.vue'
import { Select, SelectItem } from '../../src/components/ui/select'
import SkillsPanel from '../../src/components/workflow-studio/SkillsPanel.vue'
import TasksPanel from '../../src/components/workflow-studio/TasksPanel.vue'
import WorkflowNodeDrawer from '../../src/components/workflow-studio/WorkflowNodeDrawer.vue'
import WorkflowSidebar from '../../src/components/workflow-studio/WorkflowSidebar.vue'
import type { SkillCatalogItem } from '../../src/lib/skills'
import type { GithubRepository } from '../../src/lib/github'
import type { WorkflowRecord } from '../../src/lib/workflows'
import { useGithubTasksStore } from '../../src/stores/githubTasks'

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

const repository: GithubRepository = {
  owner: 'KamiC6238',
  name: 'Tsumugi',
  fullName: 'KamiC6238/Tsumugi',
  remoteUrl: 'git@github.com:KamiC6238/Tsumugi.git',
  localName: 'Tsumugi',
}

const workflows: WorkflowRecord[] = [
  {
    id: 'workflow-1',
    name: 'Bugfix Flow',
    accent: '#3f6c62',
    nodes: [],
    edges: [],
    nodeConfigs: {},
  },
  {
    id: 'workflow-2',
    name: 'Release Flow',
    accent: '#d07a2c',
    nodes: [],
    edges: [],
    nodeConfigs: {},
  },
]

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

  it('emits the GitHub tasks panel request from the sidebar tasks entry', async () => {
    const wrapper = mount(WorkflowSidebar, {
      props: {
        workflows: [],
        activeWorkflowId: null,
        activePanel: 'workflow',
      },
    })

    const tasksButton = wrapper.get('[data-testid="open-tasks-panel"]')

    expect(tasksButton.attributes('aria-pressed')).toBe('false')

    await tasksButton.trigger('click')

    expect(wrapper.emitted('openTasks')).toHaveLength(1)

    await wrapper.setProps({ activePanel: 'tasks' })

    expect(tasksButton.attributes('aria-pressed')).toBe('true')
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
          TasksPanel: { template: '<section data-testid="tasks-panel" />' },
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

  it('renders the tasks panel in the right layout after the sidebar entry is clicked', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [createPinia()],
        stubs: {
          CreateWorkflowDialog: { template: '<div data-testid="create-dialog" />' },
          SkillsPanel: { template: '<section data-testid="skills-panel" />' },
          TasksPanel: { template: '<section data-testid="tasks-panel" />' },
          WorkflowCanvasPanel: { template: '<section data-testid="canvas-panel" />' },
          WorkflowNodeDrawer: { template: '<aside data-testid="node-drawer" />' },
        },
      },
    })

    expect(wrapper.find('[data-testid="canvas-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="tasks-panel"]').exists()).toBe(false)

    await wrapper.get('[data-testid="open-tasks-panel"]').trigger('click')

    expect(wrapper.find('[data-testid="canvas-panel"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="tasks-panel"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="open-tasks-panel"]').attributes('aria-pressed')).toBe('true')
  })

  it('shows the authentication prompt instead of the generic error state on GitHub 404', async () => {
    window.localStorage.clear()
    vi.stubGlobal('fetch', vi.fn(async () => (
      new Response(JSON.stringify({ message: 'Not Found' }), { status: 404 })
    )))

    try {
      const pinia = createPinia()
      const store = useGithubTasksStore(pinia)

      store.selectRepository(repository)
      store.setAuthToken('github_pat_without_access')

      const wrapper = mount(TasksPanel, {
        global: {
          plugins: [pinia],
        },
      })

      await flushPromises()

      expect(wrapper.find('[data-testid="tasks-auth-state"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="tasks-error-state"]').exists()).toBe(false)
      expect(wrapper.text()).toContain('not found')
    }
    finally {
      vi.unstubAllGlobals()
      window.localStorage.clear()
    }
  })

  it('renders compact issue cards with only the required issue fields', async () => {
    window.localStorage.clear()
    vi.stubGlobal('fetch', vi.fn(async () => (
      new Response(JSON.stringify([
        {
          id: 21,
          number: 4,
          title: '新增一篇博客',
          state: 'open',
          html_url: 'https://github.com/KamiC6238/Tsumugi/issues/4',
          user: { login: 'KamiC6238' },
          labels: [{ name: 'documentation' }, { name: 'duplicate' }],
          comments: 3,
          created_at: '2026-04-15T00:00:00Z',
          updated_at: '2026-04-16T00:00:00Z',
        },
      ]), { status: 200 })
    )))

    try {
      const pinia = createPinia()
      const store = useGithubTasksStore(pinia)

      store.selectRepository(repository)

      const wrapper = mount(TasksPanel, {
        global: {
          plugins: [pinia],
        },
      })

      await flushPromises()

      const issueCard = wrapper.get('.issue-card')

      expect(issueCard.text()).toContain('#4')
      expect(issueCard.text()).toContain('新增一篇博客')
      expect(issueCard.text()).toContain('KamiC6238')
      expect(issueCard.text()).toContain('Updated')
      expect(issueCard.text()).not.toContain('documentation')
      expect(issueCard.text()).not.toContain('duplicate')
      expect(issueCard.text()).not.toContain('comments')
    }
    finally {
      vi.unstubAllGlobals()
      window.localStorage.clear()
    }
  })

  it('keeps the loading state below the repository header', async () => {
    window.localStorage.clear()
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => undefined)))

    try {
      const pinia = createPinia()
      const store = useGithubTasksStore(pinia)

      store.selectRepository(repository)

      const wrapper = mount(TasksPanel, {
        global: {
          plugins: [pinia],
        },
      })

      await flushPromises()

      expect(wrapper.get('.tasks-header').text()).toContain(repository.fullName)
      expect(wrapper.get('[data-testid="tasks-loading"]').classes())
        .not.toContain('tasks-centered-state--solo')
    }
    finally {
      vi.unstubAllGlobals()
      window.localStorage.clear()
    }
  })

  it('opens issue details locally and returns to the issue card list', async () => {
    window.localStorage.clear()
    vi.stubGlobal('fetch', vi.fn(async () => (
      new Response(JSON.stringify([
        {
          id: 21,
          number: 4,
          title: '新增一篇博客',
          state: 'open',
          html_url: 'https://github.com/KamiC6238/Tsumugi/issues/4',
          user: { login: 'KamiC6238' },
          labels: [{ name: 'documentation' }],
          comments: 3,
          created_at: '2026-04-15T00:00:00Z',
          updated_at: '2026-04-16T00:00:00Z',
        },
      ]), { status: 200 })
    )))

    try {
      const pinia = createPinia()
      const store = useGithubTasksStore(pinia)

      store.selectRepository(repository)

      const wrapper = mount(TasksPanel, {
        props: { workflows },
        global: {
          plugins: [pinia],
        },
      })

      await flushPromises()

      await wrapper.get('.issue-card').trigger('click')

      const detail = wrapper.get('[data-testid="issue-detail"]')
      const header = detail.get('.issue-detail-header')

      expect(wrapper.find('[data-testid="issue-detail"]').exists()).toBe(true)
      expect(wrapper.find('.issue-grid').exists()).toBe(false)
      expect(detail.find('.issue-meta').exists()).toBe(false)
      expect(detail.find('.issue-detail-meta').exists()).toBe(false)
      expect(header.find('[data-testid="issue-workflow-select"]').exists()).toBe(true)
      expect(header.find('[data-testid="issue-run-button"]').exists()).toBe(true)
      expect(wrapper.findAllComponents(SelectItem).map((option) => option.text()))
        .toEqual(['Bugfix Flow', 'Release Flow'])
      expect(wrapper.get('[data-testid="issue-run-button"]').attributes('disabled')).toBeDefined()

      await wrapper.get('[data-testid="issue-detail-back"]').trigger('click')

      expect(wrapper.find('[data-testid="issue-detail"]').exists()).toBe(false)
      expect(wrapper.find('.issue-grid').exists()).toBe(true)
    }
    finally {
      vi.unstubAllGlobals()
      window.localStorage.clear()
    }
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
          TasksPanel: { template: '<section data-testid="tasks-panel" />' },
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
          TasksPanel: { template: '<section data-testid="tasks-panel" />' },
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
    const selectStubs = {
      Select: {
        props: ['disabled'],
        provide() {
          return { selectDisabled: this.disabled }
        },
        template: '<div data-slot="select"><slot /></div>',
      },
      SelectTrigger: {
        inject: ['selectDisabled'],
        template: '<button type="button" v-bind="$attrs" :disabled="selectDisabled"><slot /></button>',
      },
      SelectValue: {
        props: ['placeholder'],
        template: '<span>{{ placeholder }}</span>',
      },
      SelectContent: { template: '<div><slot /></div>' },
      SelectItem: {
        template: '<div data-slot="select-item" v-bind="$attrs"><slot /></div>',
      },
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
      global: { stubs: { ...drawerStubs, ...selectStubs } },
    })

    expect(populatedWrapper.get('[data-testid="node-skill-select"]').attributes('disabled'))
      .toBeUndefined()
    expect(populatedWrapper.findAll('[data-slot="select-item"]').map((option) => option.text()))
      .toEqual(['No node skill', 'vue'])
    expect(populatedWrapper.text()).not.toContain('start-standard-workflow')

    const emptyWrapper = mount(WorkflowNodeDrawer, {
      props: {
        open: true,
        node,
        addedNodeSkills: [],
      },
      global: { stubs: { ...drawerStubs, ...selectStubs } },
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

    wrapper.getComponent(Select).vm.$emit('update:modelValue', 'vue')
    await wrapper.get('form').trigger('submit')

    expect(wrapper.emitted('save')?.[0]).toEqual([
      {
        name: 'Review',
        skillId: 'vue',
      },
    ])
  })
})