import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { GithubIssue, GithubRepository } from '../../src/lib/github'
import type { WorkflowRecord } from '../../src/lib/workflows'
import type { WorkflowRunSubmitter } from '../../src/stores/workflowRuns'
import { createWorkflowRunSubmitter, useWorkflowRunsStore } from '../../src/stores/workflowRuns'

const issue: GithubIssue = {
  id: 21,
  number: 4,
  title: 'Add Copilot runner workflow',
  state: 'open',
  url: 'https://github.com/octo-org/hello-world/issues/4',
  author: 'mona',
  labels: ['automation'],
  comments: 2,
  createdAt: '2026-04-28T00:00:00Z',
  updatedAt: '2026-04-29T00:00:00Z',
}

const repository: GithubRepository = {
  owner: 'octo-org',
  name: 'hello-world',
  fullName: 'octo-org/hello-world',
  remoteUrl: 'git@github.com:octo-org/hello-world.git',
  localName: 'hello-world',
}

const workflow: WorkflowRecord = {
  id: 'workflow-1',
  name: 'Issue automation',
  accent: '#3f6c62',
  nodes: [
    {
      id: 'workflow-1-start',
      type: 'input',
      position: { x: 0, y: 0 },
      data: { label: 'Plan issue' },
    },
    {
      id: 'workflow-1-review',
      type: 'output',
      position: { x: 200, y: 0 },
      data: { label: 'Review changes' },
    },
  ],
  edges: [
    { id: 'start-review', source: 'workflow-1-start', target: 'workflow-1-review' },
  ],
  nodeConfigs: {
    'workflow-1-start': { name: 'Plan issue', skillId: 'plan-writer' },
    'workflow-1-review': { name: 'Review changes', skillId: 'code-review-writer' },
  },
}

describe('workflow runs store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('submits a runnable issue workflow to the provided local runner submitter', async () => {
    const store = useWorkflowRunsStore()
    const submitter = vi.fn(async (request) => ({
      runId: request.runId,
      status: 'queued',
      artifactDir: `artifacts/runs/${request.runId}`,
    })) satisfies WorkflowRunSubmitter

    const wasStarted = await store.startIssueWorkflowRun({
      issue,
      repository,
      workflow,
      submitter,
      now: new Date('2026-04-29T12:00:00.000Z'),
      randomSuffix: 'abc123',
    })

    expect(wasStarted).toBe(true)
    expect(submitter).toHaveBeenCalledWith(expect.objectContaining({
      runId: '20260429-120000-issue-4-workflow-1-abc123',
      issue,
      repository: {
        owner: 'octo-org',
        name: 'hello-world',
        fullName: 'octo-org/hello-world',
      },
    }))
    expect(store.status).toBe('submitted')
    expect(store.latestSubmission).toEqual({
      runId: '20260429-120000-issue-4-workflow-1-abc123',
      status: 'queued',
      artifactDir: 'artifacts/runs/20260429-120000-issue-4-workflow-1-abc123',
    })
    expect(store.getLatestIssueRun(issue.number)).toEqual({
      runId: '20260429-120000-issue-4-workflow-1-abc123',
      status: 'queued',
      artifactDir: 'artifacts/runs/20260429-120000-issue-4-workflow-1-abc123',
    })
    expect(store.errorMessage).toBeNull()
  })

  it('refreshes a single issue run status without replacing other issue submissions', async () => {
    const store = useWorkflowRunsStore()
    const submitter = vi.fn(async (request) => ({
      runId: request.runId,
      status: 'queued',
      artifactDir: `artifacts/runs/${request.runId}`,
    })) satisfies WorkflowRunSubmitter

    await store.startIssueWorkflowRun({
      issue,
      repository,
      workflow,
      submitter,
      now: new Date('2026-04-29T12:00:00.000Z'),
      randomSuffix: 'abc123',
    })
    await store.startIssueWorkflowRun({
      issue: { ...issue, id: 22, number: 5, title: 'Other issue' },
      repository,
      workflow,
      submitter,
      now: new Date('2026-04-29T12:01:00.000Z'),
      randomSuffix: 'def456',
    })

    const fetcher = vi.fn(async (runId: string) => ({
      runId,
      status: 'completed',
      artifactDir: `artifacts/runs/${runId}`,
    }))

    const wasRefreshed = await store.refreshIssueWorkflowRunStatus({
      issueNumber: 4,
      fetcher,
    })

    expect(wasRefreshed).toBe(true)
    expect(fetcher).toHaveBeenCalledWith('20260429-120000-issue-4-workflow-1-abc123')
    expect(store.getLatestIssueRun(4)?.status).toBe('completed')
    expect(store.getLatestIssueRun(5)?.status).toBe('queued')
  })

  it('does not refresh an unknown issue run', async () => {
    const store = useWorkflowRunsStore()
    const fetcher = vi.fn()

    await expect(store.refreshIssueWorkflowRunStatus({
      issueNumber: 99,
      fetcher,
    })).resolves.toBe(false)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('does not call the runner when the workflow is missing a node skill', async () => {
    const store = useWorkflowRunsStore()
    const submitter = vi.fn() satisfies WorkflowRunSubmitter
    const incompleteWorkflow: WorkflowRecord = {
      ...workflow,
      nodeConfigs: {
        ...workflow.nodeConfigs,
        'workflow-1-review': { name: 'Review changes', skillId: null },
      },
    }

    const wasStarted = await store.startIssueWorkflowRun({
      issue,
      repository,
      workflow: incompleteWorkflow,
      submitter,
    })

    expect(wasStarted).toBe(false)
    expect(submitter).not.toHaveBeenCalled()
    expect(store.status).toBe('error')
    expect(store.errorMessage).toBe('Configure skills for every workflow node before running.')
  })

  it('surfaces local runner submission failures', async () => {
    const store = useWorkflowRunsStore()
    const submitter = vi.fn(async () => {
      throw new Error('Local runner is not reachable.')
    }) satisfies WorkflowRunSubmitter

    const wasStarted = await store.startIssueWorkflowRun({
      issue,
      repository,
      workflow,
      submitter,
    })

    expect(wasStarted).toBe(false)
    expect(store.status).toBe('error')
    expect(store.errorMessage).toBe('Local runner is not reachable.')
    expect(store.latestSubmission).toBeNull()
  })

  it('uses runner response messages when the default HTTP submitter receives a non-2xx status', async () => {
    const store = useWorkflowRunsStore()
    const fetcher = vi.fn(async () => (
      new Response(JSON.stringify({ message: 'Runner rejected the payload.' }), { status: 422 })
    ))

    vi.stubGlobal('fetch', fetcher)

    const wasStarted = await store.startIssueWorkflowRun({
      issue,
      repository,
      workflow,
      submitter: createWorkflowRunSubmitter('http://127.0.0.1:43117/runs'),
      now: new Date('2026-04-29T12:00:00.000Z'),
      randomSuffix: 'abc123',
    })

    expect(wasStarted).toBe(false)
    expect(fetcher).toHaveBeenCalledWith(
      'http://127.0.0.1:43117/runs',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(store.status).toBe('error')
    expect(store.errorMessage).toBe('Runner rejected the payload.')
  })
})
