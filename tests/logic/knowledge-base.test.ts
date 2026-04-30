import { describe, expect, it } from 'vitest'

import type { GithubIssue, GithubRepository } from '../../src/lib/github'
import {
  DEFAULT_KNOWLEDGE_BASE_TARGET_PATH,
  createKnowledgeBaseRunnerRepositoryEndpoint,
  createKnowledgeBaseRunnerRepositoryRequest,
  createKnowledgeBaseUpdateEndpoint,
  createKnowledgeBaseUpdateRequest,
  getKnowledgeBaseUpdateReadiness,
  normalizeKnowledgeBaseRunnerStatus,
  normalizeKnowledgeBaseUpdateResult,
} from '../../src/lib/knowledgeBase'
import type { KnowledgeBaseRunnerStatus } from '../../src/lib/knowledgeBase'
import type { WorkflowRunSubmission } from '../../src/stores/workflowRuns'

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

describe('knowledge base update helpers', () => {
  it('allows updates only for completed runs in the selected runner repository', () => {
    expect(getKnowledgeBaseUpdateReadiness({
      repository,
      runnerStatus,
      run: completedRun,
    })).toEqual({
      canUpdate: true,
      message: null,
    })

    expect(getKnowledgeBaseUpdateReadiness({
      repository,
      runnerStatus,
      run: { ...completedRun, status: 'queued' },
    })).toEqual({
      canUpdate: false,
      message: 'Wait for the workflow run to complete before updating the Knowledge base.',
    })

    expect(getKnowledgeBaseUpdateReadiness({
      repository,
      runnerStatus: { ...runnerStatus, repositoryFullName: 'octo-org/other-repo' },
      run: completedRun,
    })).toEqual({
      canUpdate: false,
      message: 'Local runner repository does not match the selected repository.',
    })

    expect(getKnowledgeBaseUpdateReadiness({
      repository,
      runnerStatus: null,
      run: completedRun,
    })).toEqual({
      canUpdate: false,
      message: 'Local runner status is unavailable.',
    })

    expect(getKnowledgeBaseUpdateReadiness({
      repository,
      runnerStatus: null,
      run: null,
    })).toEqual({
      canUpdate: false,
      message: 'Run the issue workflow before updating the Knowledge base.',
    })

    expect(getKnowledgeBaseUpdateReadiness({
      repository,
      runnerStatus: {
        ...runnerStatus,
        capabilities: { knowledgeBaseUpdates: false },
      },
      run: completedRun,
    })).toEqual({
      canUpdate: false,
      message: 'Local runner does not support Knowledge Base updates.',
    })

    expect(getKnowledgeBaseUpdateReadiness({
      repository,
      runnerStatus,
      run: null,
    })).toEqual({
      canUpdate: false,
      message: 'Run the issue workflow before updating the Knowledge base.',
    })

    expect(getKnowledgeBaseUpdateReadiness({
      repository,
      runnerStatus,
      run: { ...completedRun, status: 'failed' },
    })).toEqual({
      canUpdate: false,
      message: 'Wait for the workflow run to complete before updating the Knowledge base.',
    })
  })

  it('builds the runner request payload and endpoint for a Knowledge Base update', () => {
    expect(createKnowledgeBaseUpdateEndpoint('run with spaces')).toBe(
      'http://127.0.0.1:43117/runs/run%20with%20spaces/knowledge-base',
    )

    expect(createKnowledgeBaseUpdateRequest({ issue, repository, run: completedRun })).toEqual({
      runId: 'run-issue-4',
      issue: {
        id: 21,
        number: 4,
        title: 'Add checkout approval flow',
        url: 'https://github.com/octo-org/hello-world/issues/4',
      },
      repository: {
        owner: 'octo-org',
        name: 'hello-world',
        fullName: 'octo-org/hello-world',
      },
      target: {
        path: DEFAULT_KNOWLEDGE_BASE_TARGET_PATH,
      },
    })
  })

  it('builds and normalizes the runner repository selection contract', () => {
    expect(createKnowledgeBaseRunnerRepositoryEndpoint()).toBe('http://127.0.0.1:43117/repository')
    expect(createKnowledgeBaseRunnerRepositoryRequest(repository)).toEqual({
      repository: {
        owner: 'octo-org',
        name: 'hello-world',
        fullName: 'octo-org/hello-world',
        remoteUrl: 'git@github.com:octo-org/hello-world.git',
        localName: 'hello-world',
      },
    })

    expect(normalizeKnowledgeBaseRunnerStatus({
      serviceRoot: '/workspace/tsumugi-loom',
      repoPath: '/workspace/hello-world',
      skillCatalogPath: '/workspace/tsumugi-loom/.github/skills',
      repositoryFullName: 'octo-org/hello-world',
      selectedRepository: repository,
      repositorySearchRoots: ['/workspace'],
      mode: 'dry-run',
      capabilities: { knowledgeBaseUpdates: true, repositorySelection: true },
    })).toEqual(runnerStatus)
  })

  it('normalizes runner responses and keeps a safe fallback result', () => {
    expect(normalizeKnowledgeBaseUpdateResult({
      runId: 'run-issue-4',
      status: 'updated',
      targetPath: 'docs/knowledge-base.md',
      factCount: 5,
      sourceArtifacts: ['artifacts/runs/run-issue-4/input/issue.json'],
      updateArtifact: 'artifacts/runs/run-issue-4/knowledge-base/update.json',
    }, 'fallback-run')).toEqual({
      runId: 'run-issue-4',
      status: 'updated',
      targetPath: 'docs/knowledge-base.md',
      factCount: 5,
      sourceArtifacts: ['artifacts/runs/run-issue-4/input/issue.json'],
      updateArtifact: 'artifacts/runs/run-issue-4/knowledge-base/update.json',
    })

    expect(normalizeKnowledgeBaseUpdateResult(null, 'fallback-run')).toEqual({
      runId: 'fallback-run',
      status: 'updated',
      targetPath: DEFAULT_KNOWLEDGE_BASE_TARGET_PATH,
      factCount: 0,
      sourceArtifacts: [],
      updateArtifact: null,
    })
  })
})