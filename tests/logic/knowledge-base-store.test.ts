import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { GithubIssue, GithubRepository } from '../../src/lib/github'
import type { KnowledgeBaseRunnerStatus } from '../../src/lib/knowledgeBase'
import type { WorkflowRunSubmission } from '../../src/stores/workflowRuns'
import { useKnowledgeBaseStore } from '../../src/stores/knowledgeBase'
import type { KnowledgeBaseUpdateSubmitter } from '../../src/stores/knowledgeBase'

const repository: GithubRepository = {
  owner: 'octo-org',
  name: 'hello-world',
  fullName: 'octo-org/hello-world',
  remoteUrl: 'git@github.com:octo-org/hello-world.git',
  localName: 'hello-world',
}

const issue: GithubIssue = {
  id: 21,
  number: 4,
  title: 'Add checkout approval flow',
  state: 'open',
  url: 'https://github.com/octo-org/hello-world/issues/4',
  author: 'mona',
  labels: [],
  comments: 0,
  createdAt: '2026-04-28T00:00:00Z',
  updatedAt: '2026-04-29T00:00:00Z',
}

const completedRun: WorkflowRunSubmission = {
  runId: 'run-issue-4',
  status: 'completed',
  artifactDir: 'artifacts/runs/run-issue-4',
}

const runnerStatus: KnowledgeBaseRunnerStatus = {
  serviceRoot: '/workspace/tsumugi-loom',
  repoPath: '/workspace/hello-world',
  skillCatalogPath: '/workspace/tsumugi-loom/.github/skills',
  repositoryFullName: 'octo-org/hello-world',
  selectedRepository: repository,
  repositorySearchRoots: ['/workspace'],
  mode: 'dry-run',
  capabilities: {
    knowledgeBaseUpdates: true,
    repositorySelection: true,
  },
}

describe('knowledge base store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('pushes the selected repository to the runner and stores the returned status', async () => {
    const store = useKnowledgeBaseStore()
    const syncer = vi.fn(async () => runnerStatus)

    await expect(store.syncRunnerRepository(repository, syncer)).resolves.toBe(true)

    expect(syncer).toHaveBeenCalledWith(repository, expect.objectContaining({ signal: expect.any(AbortSignal) }))
    expect(store.runnerStatus).toEqual(runnerStatus)
    expect(store.runnerStatusErrorMessage).toBeNull()
  })

  it('ignores stale runner repository sync responses', async () => {
    const store = useKnowledgeBaseStore()
    const otherRepository: GithubRepository = {
      owner: 'octo-org',
      name: 'other-repo',
      fullName: 'octo-org/other-repo',
      remoteUrl: 'git@github.com:octo-org/other-repo.git',
      localName: 'other-repo',
    }
    const otherRunnerStatus: KnowledgeBaseRunnerStatus = {
      ...runnerStatus,
      repoPath: '/workspace/other-repo',
      repositoryFullName: 'octo-org/other-repo',
      selectedRepository: otherRepository,
    }
    let resolveFirst!: (status: KnowledgeBaseRunnerStatus) => void
    let resolveSecond!: (status: KnowledgeBaseRunnerStatus) => void
    const syncer = vi.fn((selectedRepository: GithubRepository) => new Promise<KnowledgeBaseRunnerStatus>((resolve) => {
      if (selectedRepository.fullName === repository.fullName) {
        resolveFirst = resolve
        return
      }

      resolveSecond = resolve
    }))

    const firstSync = store.syncRunnerRepository(repository, syncer)
    const secondSync = store.syncRunnerRepository(otherRepository, syncer)

    resolveSecond(otherRunnerStatus)
    await expect(secondSync).resolves.toBe(true)

    resolveFirst(runnerStatus)
    await expect(firstSync).resolves.toBe(false)
    expect(store.runnerStatus).toEqual(otherRunnerStatus)
  })

  it('ignores stale runner repository sync errors', async () => {
    const store = useKnowledgeBaseStore()
    const otherRepository: GithubRepository = {
      owner: 'octo-org',
      name: 'other-repo',
      fullName: 'octo-org/other-repo',
      remoteUrl: 'git@github.com:octo-org/other-repo.git',
      localName: 'other-repo',
    }
    const otherRunnerStatus: KnowledgeBaseRunnerStatus = {
      ...runnerStatus,
      repoPath: '/workspace/other-repo',
      repositoryFullName: 'octo-org/other-repo',
      selectedRepository: otherRepository,
    }
    let rejectFirst!: (error: Error) => void
    let resolveSecond!: (status: KnowledgeBaseRunnerStatus) => void
    const syncer = vi.fn((selectedRepository: GithubRepository) => new Promise<KnowledgeBaseRunnerStatus>((resolve, reject) => {
      if (selectedRepository.fullName === repository.fullName) {
        rejectFirst = reject
        return
      }

      resolveSecond = resolve
    }))

    const firstSync = store.syncRunnerRepository(repository, syncer)
    const secondSync = store.syncRunnerRepository(otherRepository, syncer)

    resolveSecond(otherRunnerStatus)
    await expect(secondSync).resolves.toBe(true)

    rejectFirst(new Error('Old repository sync failed.'))
    await expect(firstSync).resolves.toBe(false)
    expect(store.runnerStatus).toEqual(otherRunnerStatus)
    expect(store.runnerStatusErrorMessage).toBeNull()
  })

  it('submits a Knowledge Base update and stores the result per issue run', async () => {
    const store = useKnowledgeBaseStore()
    const submitter = vi.fn(async (request) => ({
      runId: request.runId,
      status: 'updated',
      targetPath: 'docs/knowledge-base.md',
      factCount: 3,
      sourceArtifacts: ['artifacts/runs/run-issue-4/input/issue.json'],
      updateArtifact: 'artifacts/runs/run-issue-4/knowledge-base/update.json',
    })) satisfies KnowledgeBaseUpdateSubmitter

    const wasStarted = await store.startKnowledgeBaseUpdate({
      issue,
      repository,
      run: completedRun,
      runnerStatus,
      submitter,
    })

    expect(wasStarted).toBe(true)
    expect(submitter).toHaveBeenCalledWith(expect.objectContaining({
      runId: 'run-issue-4',
      issue: {
        id: 21,
        number: 4,
        title: 'Add checkout approval flow',
        url: 'https://github.com/octo-org/hello-world/issues/4',
      },
      repository: expect.objectContaining({ fullName: 'octo-org/hello-world' }),
      target: { path: 'docs/knowledge-base.md' },
    }))
    expect(store.getIssueRunState(issue.number, completedRun.runId)).toEqual({
      status: 'updated',
      result: {
        runId: 'run-issue-4',
        status: 'updated',
        targetPath: 'docs/knowledge-base.md',
        factCount: 3,
        sourceArtifacts: ['artifacts/runs/run-issue-4/input/issue.json'],
        updateArtifact: 'artifacts/runs/run-issue-4/knowledge-base/update.json',
      },
      errorMessage: null,
    })
  })

  it('does not submit when the run is not completed', async () => {
    const store = useKnowledgeBaseStore()
    const submitter = vi.fn() satisfies KnowledgeBaseUpdateSubmitter

    const wasStarted = await store.startKnowledgeBaseUpdate({
      issue,
      repository,
      run: { ...completedRun, status: 'queued' },
      runnerStatus,
      submitter,
    })

    expect(wasStarted).toBe(false)
    expect(submitter).not.toHaveBeenCalled()
    expect(store.getIssueRunState(issue.number, completedRun.runId)).toMatchObject({
      status: 'error',
      errorMessage: 'Wait for the workflow run to complete before updating the Knowledge base.',
    })
  })

  it('does not submit when the runner cannot update the selected repository', async () => {
    const store = useKnowledgeBaseStore()
    const submitter = vi.fn() satisfies KnowledgeBaseUpdateSubmitter

    await store.startKnowledgeBaseUpdate({
      issue,
      repository,
      run: completedRun,
      runnerStatus: { ...runnerStatus, repositoryFullName: 'octo-org/other-repo' },
      submitter,
    })

    expect(submitter).not.toHaveBeenCalled()
    expect(store.getIssueRunState(issue.number, completedRun.runId)).toMatchObject({
      status: 'error',
      errorMessage: 'Local runner repository does not match the selected repository.',
    })

    await store.startKnowledgeBaseUpdate({
      issue,
      repository,
      run: completedRun,
      runnerStatus: { ...runnerStatus, capabilities: { knowledgeBaseUpdates: false } },
      submitter,
    })

    expect(submitter).not.toHaveBeenCalled()
    expect(store.getIssueRunState(issue.number, completedRun.runId)).toMatchObject({
      status: 'error',
      errorMessage: 'Local runner does not support Knowledge Base updates.',
    })
  })

  it('keeps failed updates isolated from other issue runs', async () => {
    const store = useKnowledgeBaseStore()
    const failingSubmitter = vi.fn(async () => {
      throw new Error('Knowledge base update failed.')
    }) satisfies KnowledgeBaseUpdateSubmitter
    const successfulSubmitter = vi.fn(async (request) => ({
      runId: request.runId,
      status: 'updated',
      targetPath: 'docs/knowledge-base.md',
      factCount: 1,
      sourceArtifacts: [],
      updateArtifact: null,
    })) satisfies KnowledgeBaseUpdateSubmitter

    await store.startKnowledgeBaseUpdate({
      issue: { ...issue, id: 22, number: 5, title: 'Other issue' },
      repository,
      run: { ...completedRun, runId: 'run-issue-5' },
      runnerStatus,
      submitter: successfulSubmitter,
    })

    await store.startKnowledgeBaseUpdate({
      issue,
      repository,
      run: completedRun,
      runnerStatus,
      submitter: failingSubmitter,
    })

    expect(store.getIssueRunState(issue.number, completedRun.runId)).toMatchObject({
      status: 'error',
      errorMessage: 'Knowledge base update failed.',
    })
    expect(store.getIssueRunState(5, 'run-issue-5')).toMatchObject({
      status: 'updated',
      result: expect.objectContaining({ runId: 'run-issue-5' }),
    })
  })

  it('keeps a single issue run in updating state and ignores duplicate clicks', async () => {
    const store = useKnowledgeBaseStore()
    let resolveUpdate: ((value: Awaited<ReturnType<KnowledgeBaseUpdateSubmitter>>) => void) | null = null
    const submitter = vi.fn((request) => new Promise<Awaited<ReturnType<KnowledgeBaseUpdateSubmitter>>>((resolve) => {
      resolveUpdate = resolve
      expect(request.runId).toBe('run-issue-4')
    })) satisfies KnowledgeBaseUpdateSubmitter

    const firstUpdate = store.startKnowledgeBaseUpdate({
      issue,
      repository,
      run: completedRun,
      runnerStatus,
      submitter,
    })
    const secondUpdate = await store.startKnowledgeBaseUpdate({
      issue,
      repository,
      run: completedRun,
      runnerStatus,
      submitter,
    })

    expect(secondUpdate).toBe(false)
    expect(submitter).toHaveBeenCalledTimes(1)
    expect(store.getIssueRunState(issue.number, completedRun.runId)).toMatchObject({
      status: 'updating',
    })

    resolveUpdate?.({
      runId: 'run-issue-4',
      status: 'updated',
      targetPath: 'docs/knowledge-base.md',
      factCount: 2,
      sourceArtifacts: [],
      updateArtifact: null,
    })

    await expect(firstUpdate).resolves.toBe(true)
    expect(store.getIssueRunState(issue.number, completedRun.runId)).toMatchObject({
      status: 'updated',
    })
  })
})