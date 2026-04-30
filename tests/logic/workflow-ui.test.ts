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
import { DEFAULT_WORKFLOW_RUNNER_ENDPOINT } from '../../src/lib/workflowRuns'
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

const RUNNER_REPOSITORY_ENDPOINT = 'http://127.0.0.1:43117/repository'

function createRunnerStatus(repositoryFullName = repository.fullName, knowledgeBaseUpdates = true) {
  return {
    repoPath: `/workspace/${repositoryFullName.split('/')[1]}`,
    repositoryFullName,
    mode: 'dry-run',
    capabilities: { knowledgeBaseUpdates, repositorySelection: true },
  }
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

const runnableWorkflow: WorkflowRecord = {
  id: 'workflow-runner',
  name: 'Runner Flow',
  accent: '#3f6c62',
  nodes: [
    {
      id: 'workflow-runner-plan',
      type: 'input',
      position: { x: 0, y: 0 },
      data: { label: 'Plan issue' },
    },
    {
      id: 'workflow-runner-review',
      type: 'output',
      position: { x: 200, y: 0 },
      data: { label: 'Review changes' },
    },
  ],
  edges: [
    { id: 'plan-review', source: 'workflow-runner-plan', target: 'workflow-runner-review' },
  ],
  nodeConfigs: {
    'workflow-runner-plan': { name: 'Plan issue', skillId: 'plan-writer' },
    'workflow-runner-review': { name: 'Review changes', skillId: 'code-review-writer' },
  },
}

const incompleteWorkflow: WorkflowRecord = {
  ...runnableWorkflow,
  id: 'workflow-incomplete',
  name: 'Incomplete Flow',
  nodeConfigs: {
    ...runnableWorkflow.nodeConfigs,
    'workflow-runner-review': { name: 'Review changes', skillId: null },
  },
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
      expect(wrapper.find('.tasks-copy').exists()).toBe(false)
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
      expect(wrapper.find('.tasks-copy').exists()).toBe(false)
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

  it('submits a runnable issue workflow to the local Copilot runner endpoint', async () => {
    window.localStorage.clear()
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === RUNNER_REPOSITORY_ENDPOINT) {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>

        expect(init).toMatchObject({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
        expect(body).toMatchObject({
          repository: { fullName: repository.fullName },
        })

        return new Response(JSON.stringify(createRunnerStatus()), { status: 200 })
      }

      if (String(input) === DEFAULT_WORKFLOW_RUNNER_ENDPOINT) {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>

        expect(body).toMatchObject({
          repository: {
            owner: 'KamiC6238',
            name: 'Tsumugi',
            fullName: 'KamiC6238/Tsumugi',
          },
          issue: {
            number: 4,
            title: '新增一篇博客',
          },
          workflow: {
            id: 'workflow-runner',
            nodes: [
              { order: 1, nodeId: 'workflow-runner-plan', skillId: 'plan-writer' },
              { order: 2, nodeId: 'workflow-runner-review', skillId: 'code-review-writer' },
            ],
          },
          options: {
            freshSessionPerNode: true,
            skillInjection: 'snapshot-skill-directory',
          },
        })

        return new Response(JSON.stringify({
          runId: 'run-1',
          status: 'queued',
          artifactDir: 'artifacts/runs/run-1',
        }), { status: 202 })
      }

      return new Response(JSON.stringify([
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
    })

    vi.stubGlobal('fetch', fetcher)

    try {
      const pinia = createPinia()
      const store = useGithubTasksStore(pinia)

      store.selectRepository(repository)

      const wrapper = mount(TasksPanel, {
        props: { workflows: [runnableWorkflow] },
        global: {
          plugins: [pinia],
        },
      })

      await flushPromises()
      await wrapper.get('.issue-card').trigger('click')
      wrapper.getComponent(Select).vm.$emit('update:modelValue', 'workflow-runner')
      await flushPromises()

      expect(wrapper.get('[data-testid="issue-run-button"]').attributes('disabled')).toBeUndefined()

      const callCountBeforeRun = fetcher.mock.calls.length

      await wrapper.get('[data-testid="issue-run-button"]').trigger('click')
      await flushPromises()

      const runClickUrls = fetcher.mock.calls
        .slice(callCountBeforeRun)
        .map(([input]) => String(input))

      expect(runClickUrls.slice(0, 2)).toEqual([
        RUNNER_REPOSITORY_ENDPOINT,
        DEFAULT_WORKFLOW_RUNNER_ENDPOINT,
      ])
      expect(fetcher).toHaveBeenCalledWith(
        DEFAULT_WORKFLOW_RUNNER_ENDPOINT,
        expect.objectContaining({ method: 'POST' }),
      )
      expect(wrapper.get('[data-testid="issue-run-status"]').text()).toContain('Run queued: run-1')
      expect(wrapper.get('[data-testid="issue-run-status"]').text()).toContain('artifacts/runs/run-1')
    }
    finally {
      vi.unstubAllGlobals()
      window.localStorage.clear()
    }
  })

  it('shows a Knowledge Base update action for completed issue runs without opening details', async () => {
    window.localStorage.clear()
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const requestUrl = String(input)

      if (requestUrl === RUNNER_REPOSITORY_ENDPOINT) {
        return new Response(JSON.stringify({
          repoPath: '/workspace/Tsumugi',
          repositoryFullName: 'KamiC6238/Tsumugi',
          mode: 'dry-run',
          capabilities: { knowledgeBaseUpdates: true },
        }), { status: 200 })
      }

      if (requestUrl === DEFAULT_WORKFLOW_RUNNER_ENDPOINT) {
        return new Response(JSON.stringify({
          runId: 'run-issue-4',
          status: 'completed',
          artifactDir: 'artifacts/runs/run-issue-4',
        }), { status: 202 })
      }

      if (requestUrl === 'http://127.0.0.1:43117/runs/run-issue-4/knowledge-base') {
        expect(init).toMatchObject({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>

        expect(body).toMatchObject({
          runId: 'run-issue-4',
          issue: {
            id: 21,
            number: 4,
            title: '新增一篇博客',
            url: 'https://github.com/KamiC6238/Tsumugi/issues/4',
          },
          repository: { fullName: 'KamiC6238/Tsumugi' },
          target: { path: 'docs/knowledge-base.md' },
        })

        return new Response(JSON.stringify({
          runId: 'run-issue-4',
          status: 'updated',
          targetPath: 'docs/knowledge-base.md',
          factCount: 4,
          sourceArtifacts: ['artifacts/runs/run-issue-4/input/issue.json'],
          updateArtifact: 'artifacts/runs/run-issue-4/knowledge-base/update.json',
        }), { status: 200 })
      }

      if (requestUrl.startsWith('https://api.github.com/repos/KamiC6238/Tsumugi/issues')) {
        return new Response(JSON.stringify([
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
      }

      throw new Error(`Unexpected fetch: ${requestUrl}`)
    })

    vi.stubGlobal('fetch', fetcher)

    try {
      const pinia = createPinia()
      const store = useGithubTasksStore(pinia)

      store.selectRepository(repository)

      const wrapper = mount(TasksPanel, {
        props: { workflows: [runnableWorkflow] },
        global: {
          plugins: [pinia],
        },
      })

      await flushPromises()
      await wrapper.get('.issue-card').trigger('click')
      wrapper.getComponent(Select).vm.$emit('update:modelValue', 'workflow-runner')
      await flushPromises()
      await wrapper.get('[data-testid="issue-run-button"]').trigger('click')
      await flushPromises()
      await wrapper.get('[data-testid="issue-detail-back"]').trigger('click')
      await flushPromises()

      const updateButton = wrapper.get('[data-testid="knowledge-base-update-4"]')

      expect(updateButton.text()).toContain('更新 Knowledge base')
      expect(updateButton.attributes('disabled')).toBeUndefined()

      await updateButton.trigger('click')
      await flushPromises()

      expect(wrapper.find('[data-testid="issue-detail"]').exists()).toBe(false)
      expect(wrapper.get('[data-testid="knowledge-base-status-4"]').text())
        .toContain('Updated docs/knowledge-base.md with 4 facts')
    }
    finally {
      vi.unstubAllGlobals()
      window.localStorage.clear()
    }
  })

  it('shows why Knowledge Base updates are unavailable before a completed run exists', async () => {
    window.localStorage.clear()
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const requestUrl = String(input)

      if (requestUrl === RUNNER_REPOSITORY_ENDPOINT) {
        return new Response(JSON.stringify({ message: 'Runner is not ready.' }), { status: 503 })
      }

      if (requestUrl.startsWith('https://api.github.com/repos/KamiC6238/Tsumugi/issues')) {
        return new Response(JSON.stringify([
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
      }

      throw new Error(`Unexpected fetch: ${requestUrl}`)
    })

    vi.stubGlobal('fetch', fetcher)

    try {
      const pinia = createPinia()
      const store = useGithubTasksStore(pinia)

      store.selectRepository(repository)

      const wrapper = mount(TasksPanel, {
        props: { workflows: [runnableWorkflow] },
        global: { plugins: [pinia] },
      })

      await flushPromises()

      expect(wrapper.get('[data-testid="knowledge-base-update-4"]').attributes('disabled')).toBeDefined()
      expect(wrapper.get('[data-testid="knowledge-base-status-4"]').text())
        .toBe('Run the issue workflow before updating the Knowledge base.')
    }
    finally {
      vi.unstubAllGlobals()
      window.localStorage.clear()
    }
  })

  it('refreshes a queued issue run when returning to the issue list', async () => {
    window.localStorage.clear()
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const requestUrl = String(input)

      if (requestUrl === RUNNER_REPOSITORY_ENDPOINT) {
        return new Response(JSON.stringify({
          repoPath: '/workspace/Tsumugi',
          repositoryFullName: 'KamiC6238/Tsumugi',
          mode: 'dry-run',
          capabilities: { knowledgeBaseUpdates: true },
        }), { status: 200 })
      }

      if (requestUrl === DEFAULT_WORKFLOW_RUNNER_ENDPOINT) {
        return new Response(JSON.stringify({
          runId: 'run-issue-4',
          status: 'queued',
          artifactDir: 'artifacts/runs/run-issue-4',
        }), { status: 202 })
      }

      if (requestUrl === 'http://127.0.0.1:43117/runs/run-issue-4') {
        return new Response(JSON.stringify({
          runId: 'run-issue-4',
          status: 'completed',
          artifactDir: 'artifacts/runs/run-issue-4',
        }), { status: 200 })
      }

      if (requestUrl.startsWith('https://api.github.com/repos/KamiC6238/Tsumugi/issues')) {
        return new Response(JSON.stringify([
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
      }

      throw new Error(`Unexpected fetch: ${requestUrl}`)
    })

    vi.stubGlobal('fetch', fetcher)

    try {
      const pinia = createPinia()
      const store = useGithubTasksStore(pinia)

      store.selectRepository(repository)

      const wrapper = mount(TasksPanel, {
        props: { workflows: [runnableWorkflow] },
        global: { plugins: [pinia] },
      })

      await flushPromises()
      await wrapper.get('.issue-card').trigger('click')
      wrapper.getComponent(Select).vm.$emit('update:modelValue', 'workflow-runner')
      await flushPromises()
      await wrapper.get('[data-testid="issue-run-button"]').trigger('click')
      await flushPromises()

      expect(wrapper.get('[data-testid="issue-run-status"]').text()).toContain('Run queued: run-issue-4')

      await wrapper.get('[data-testid="issue-detail-back"]').trigger('click')
      await flushPromises()

      expect(fetcher).toHaveBeenCalledWith('http://127.0.0.1:43117/runs/run-issue-4')
      expect(wrapper.get('[data-testid="knowledge-base-update-4"]').attributes('disabled')).toBeUndefined()
    }
    finally {
      vi.unstubAllGlobals()
      window.localStorage.clear()
    }
  })

  it('does not open issue details when the Knowledge Base button receives keyboard input', async () => {
    window.localStorage.clear()
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const requestUrl = String(input)

      if (requestUrl === RUNNER_REPOSITORY_ENDPOINT) {
        return new Response(JSON.stringify({
          repoPath: '/workspace/Tsumugi',
          repositoryFullName: 'KamiC6238/Tsumugi',
          mode: 'dry-run',
          capabilities: { knowledgeBaseUpdates: true },
        }), { status: 200 })
      }

      if (requestUrl === DEFAULT_WORKFLOW_RUNNER_ENDPOINT) {
        return new Response(JSON.stringify({
          runId: 'run-issue-4',
          status: 'completed',
          artifactDir: 'artifacts/runs/run-issue-4',
        }), { status: 202 })
      }

      if (requestUrl.startsWith('https://api.github.com/repos/KamiC6238/Tsumugi/issues')) {
        return new Response(JSON.stringify([
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
      }

      throw new Error(`Unexpected fetch: ${requestUrl}`)
    })

    vi.stubGlobal('fetch', fetcher)

    try {
      const pinia = createPinia()
      const store = useGithubTasksStore(pinia)

      store.selectRepository(repository)

      const wrapper = mount(TasksPanel, {
        props: { workflows: [runnableWorkflow] },
        global: { plugins: [pinia] },
      })

      await flushPromises()
      await wrapper.get('.issue-card').trigger('click')
      wrapper.getComponent(Select).vm.$emit('update:modelValue', 'workflow-runner')
      await flushPromises()
      await wrapper.get('[data-testid="issue-run-button"]').trigger('click')
      await flushPromises()
      await wrapper.get('[data-testid="issue-detail-back"]').trigger('click')
      await flushPromises()

      expect(wrapper.get('[data-testid="knowledge-base-update-4"]').attributes('disabled')).toBeUndefined()

      await wrapper.get('[data-testid="knowledge-base-update-4"]').trigger('keydown.enter')
      await wrapper.get('[data-testid="knowledge-base-update-4"]').trigger('keydown.space')

      expect(wrapper.find('[data-testid="issue-detail"]').exists()).toBe(false)
    }
    finally {
      vi.unstubAllGlobals()
      window.localStorage.clear()
    }
  })

  it('does not reuse a completed run for the same issue number after switching repositories', async () => {
    window.localStorage.clear()
    const otherRepository: GithubRepository = {
      owner: 'KamiC6238',
      name: 'Other',
      fullName: 'KamiC6238/Other',
      remoteUrl: 'git@github.com:KamiC6238/Other.git',
      localName: 'Other',
    }
    let runnerStatusCalls = 0
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const requestUrl = String(input)

      if (requestUrl === RUNNER_REPOSITORY_ENDPOINT) {
        runnerStatusCalls += 1
        const body = JSON.parse(String(init?.body)) as { repository?: { fullName?: string } }
        const runnerRepositoryFullName = body.repository?.fullName ?? repository.fullName

        return new Response(JSON.stringify({
          repoPath: `/workspace/${runnerRepositoryFullName.split('/')[1]}`,
          repositoryFullName: runnerRepositoryFullName,
          mode: 'dry-run',
          capabilities: { knowledgeBaseUpdates: true },
        }), { status: 200 })
      }

      if (requestUrl === DEFAULT_WORKFLOW_RUNNER_ENDPOINT) {
        return new Response(JSON.stringify({
          runId: 'run-issue-4',
          status: 'completed',
          artifactDir: 'artifacts/runs/run-issue-4',
        }), { status: 202 })
      }

      if (requestUrl.startsWith('https://api.github.com/repos/KamiC6238/Tsumugi/issues')) {
        return new Response(JSON.stringify([
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
      }

      if (requestUrl.startsWith('https://api.github.com/repos/KamiC6238/Other/issues')) {
        return new Response(JSON.stringify([
          {
            id: 41,
            number: 4,
            title: '另一个仓库的同号 issue',
            state: 'open',
            html_url: 'https://github.com/KamiC6238/Other/issues/4',
            user: { login: 'KamiC6238' },
            labels: [],
            comments: 0,
            created_at: '2026-04-17T00:00:00Z',
            updated_at: '2026-04-18T00:00:00Z',
          },
        ]), { status: 200 })
      }

      throw new Error(`Unexpected fetch: ${requestUrl}`)
    })

    vi.stubGlobal('fetch', fetcher)

    try {
      const pinia = createPinia()
      const store = useGithubTasksStore(pinia)

      store.selectRepository(repository)

      const wrapper = mount(TasksPanel, {
        props: { workflows: [runnableWorkflow] },
        global: { plugins: [pinia] },
      })

      await flushPromises()
      await wrapper.get('.issue-card').trigger('click')
      wrapper.getComponent(Select).vm.$emit('update:modelValue', 'workflow-runner')
      await flushPromises()
      await wrapper.get('[data-testid="issue-run-button"]').trigger('click')
      await flushPromises()
      await wrapper.get('[data-testid="issue-detail-back"]').trigger('click')
      await flushPromises()

      expect(wrapper.get('[data-testid="knowledge-base-update-4"]').attributes('disabled')).toBeUndefined()

      store.selectRepository(otherRepository)
      await flushPromises()

      expect(runnerStatusCalls).toBe(3)
      expect(wrapper.text()).toContain('另一个仓库的同号 issue')
      expect(wrapper.get('[data-testid="knowledge-base-update-4"]').attributes('disabled')).toBeDefined()
      expect(wrapper.get('[data-testid="knowledge-base-status-4"]').text())
        .toBe('Run the issue workflow before updating the Knowledge base.')
    }
    finally {
      vi.unstubAllGlobals()
      window.localStorage.clear()
    }
  })

  it('keeps Knowledge Base updates disabled when the runner does not expose the capability', async () => {
    window.localStorage.clear()
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const requestUrl = String(input)

      if (requestUrl === RUNNER_REPOSITORY_ENDPOINT) {
        return new Response(JSON.stringify({
          repoPath: '/workspace/Tsumugi',
          repositoryFullName: 'KamiC6238/Tsumugi',
          mode: 'dry-run',
          capabilities: { knowledgeBaseUpdates: false },
        }), { status: 200 })
      }

      if (requestUrl === DEFAULT_WORKFLOW_RUNNER_ENDPOINT) {
        return new Response(JSON.stringify({
          runId: 'run-issue-4',
          status: 'completed',
          artifactDir: 'artifacts/runs/run-issue-4',
        }), { status: 202 })
      }

      if (requestUrl.startsWith('https://api.github.com/repos/KamiC6238/Tsumugi/issues')) {
        return new Response(JSON.stringify([
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
      }

      throw new Error(`Unexpected fetch: ${requestUrl}`)
    })

    vi.stubGlobal('fetch', fetcher)

    try {
      const pinia = createPinia()
      const store = useGithubTasksStore(pinia)

      store.selectRepository(repository)

      const wrapper = mount(TasksPanel, {
        props: { workflows: [runnableWorkflow] },
        global: { plugins: [pinia] },
      })

      await flushPromises()
      await wrapper.get('.issue-card').trigger('click')
      wrapper.getComponent(Select).vm.$emit('update:modelValue', 'workflow-runner')
      await flushPromises()
      await wrapper.get('[data-testid="issue-run-button"]').trigger('click')
      await flushPromises()
      await wrapper.get('[data-testid="issue-detail-back"]').trigger('click')
      await flushPromises()

      expect(wrapper.get('[data-testid="knowledge-base-update-4"]').attributes('disabled')).toBeDefined()
      expect(wrapper.get('[data-testid="knowledge-base-status-4"]').text())
        .toBe('Local runner does not support Knowledge Base updates.')
      expect(fetcher).not.toHaveBeenCalledWith(
        'http://127.0.0.1:43117/runs/run-issue-4/knowledge-base',
        expect.anything(),
      )
    }
    finally {
      vi.unstubAllGlobals()
      window.localStorage.clear()
    }
  })

  it('keeps Knowledge Base updates disabled when the runner repository does not match', async () => {
    window.localStorage.clear()
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === RUNNER_REPOSITORY_ENDPOINT) {
        return new Response(JSON.stringify({
          repoPath: '/workspace/Other',
          repositoryFullName: 'KamiC6238/Other',
          mode: 'dry-run',
          capabilities: { knowledgeBaseUpdates: true },
        }), { status: 200 })
      }

      if (String(input) === DEFAULT_WORKFLOW_RUNNER_ENDPOINT) {
        return new Response(JSON.stringify({
          runId: 'run-issue-4',
          status: 'completed',
          artifactDir: 'artifacts/runs/run-issue-4',
        }), { status: 202 })
      }

      return new Response(JSON.stringify([
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
    })

    vi.stubGlobal('fetch', fetcher)

    try {
      const pinia = createPinia()
      const store = useGithubTasksStore(pinia)

      store.selectRepository(repository)

      const wrapper = mount(TasksPanel, {
        props: { workflows: [runnableWorkflow] },
        global: { plugins: [pinia] },
      })

      await flushPromises()
      await wrapper.get('.issue-card').trigger('click')
      wrapper.getComponent(Select).vm.$emit('update:modelValue', 'workflow-runner')
      await flushPromises()
      await wrapper.get('[data-testid="issue-run-button"]').trigger('click')
      await flushPromises()
      await wrapper.get('[data-testid="issue-detail-back"]').trigger('click')
      await flushPromises()

      expect(wrapper.get('[data-testid="knowledge-base-update-4"]').attributes('disabled')).toBeDefined()
      expect(wrapper.get('[data-testid="knowledge-base-status-4"]').text())
        .toBe('Local runner repository does not match the selected repository.')
    }
    finally {
      vi.unstubAllGlobals()
      window.localStorage.clear()
    }
  })

  it('shows the local runner error message when workflow submission is rejected', async () => {
    window.localStorage.clear()
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === DEFAULT_WORKFLOW_RUNNER_ENDPOINT) {
        return new Response(JSON.stringify({
          message: 'Runner rejected the workflow run.',
        }), { status: 422 })
      }

      return new Response(JSON.stringify([
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
    })

    vi.stubGlobal('fetch', fetcher)

    try {
      const pinia = createPinia()
      const store = useGithubTasksStore(pinia)

      store.selectRepository(repository)

      const wrapper = mount(TasksPanel, {
        props: { workflows: [runnableWorkflow] },
        global: {
          plugins: [pinia],
        },
      })

      await flushPromises()
      await wrapper.get('.issue-card').trigger('click')
      wrapper.getComponent(Select).vm.$emit('update:modelValue', 'workflow-runner')
      await flushPromises()
      await wrapper.get('[data-testid="issue-run-button"]').trigger('click')
      await flushPromises()

      expect(wrapper.get('[data-testid="issue-run-status"]').text())
        .toBe('Runner rejected the workflow run.')
    }
    finally {
      vi.unstubAllGlobals()
      window.localStorage.clear()
    }
  })

  it('keeps Run disabled when the selected workflow has an unconfigured node skill', async () => {
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
        props: { workflows: [incompleteWorkflow] },
        global: {
          plugins: [pinia],
        },
      })

      await flushPromises()
      await wrapper.get('.issue-card').trigger('click')
      wrapper.getComponent(Select).vm.$emit('update:modelValue', 'workflow-incomplete')
      await flushPromises()

      expect(wrapper.get('[data-testid="issue-run-button"]').attributes('disabled')).toBeDefined()
      expect(wrapper.get('[data-testid="issue-run-status"]').text())
        .toBe('Configure skills for every workflow node before running.')
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
        provide(this: { disabled?: boolean }): { selectDisabled: boolean } {
          return { selectDisabled: Boolean(this.disabled) }
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